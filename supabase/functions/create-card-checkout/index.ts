import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckoutItem {
  item_id: string
  quantity: number
  price: number
}

interface CreateCardCheckoutRequest {
  store_id: string | null
  items: CheckoutItem[]
  discount: number
  total_amount: number
  success_url: string
  fail_url: string
  cancel_url: string
}

function withTranId(url: string, tranId: string) {
  const target = new URL(url)
  target.searchParams.set('tran_id', tranId)
  return target.toString()
}

/** Create session: sandbox and live both use gwprocess v4 per https://developer.sslcommerz.com/doc/v4/ — override with SSLCOMMERZ_SESSION_API_URL if needed. */
function sslCommerzSessionApiUrl(isLive: boolean): string {
  const override = Deno.env.get('SSLCOMMERZ_SESSION_API_URL')?.trim()
  if (override) return override
  return isLive
    ? 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'
    : 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) throw new Error('Unauthorized')

    const body: CreateCardCheckoutRequest = await req.json()
    const { store_id, items, total_amount, discount, success_url, fail_url, cancel_url } = body

    if (!store_id) throw new Error('Store ID is required')
    if (!items || items.length === 0) throw new Error('No items in checkout')
    if (!success_url || !fail_url || !cancel_url) throw new Error('Missing checkout callback URLs')
    if (!Number.isFinite(total_amount) || total_amount <= 0) throw new Error('Invalid total amount')
    // https://developer.sslcommerz.com/doc/v4/ — BDT amount must be 10.00–500000.00
    if (total_amount < 10) {
      throw new Error('Card payment requires at least 10.00 BDT (SSLCommerz minimum)')
    }

    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .select('name')
      .eq('id', store_id)
      .single()

    if (storeError || !storeData) throw new Error('Store not found')

    const tranId = crypto.randomUUID().replaceAll('-', '').slice(0, 20)

    // PR 4: Atomically reserve stock and register sale intent in _checkout schema
    const { data: intentData, error: intentError } = await supabase.rpc('create_sale_intent', {
      p_store_id: store_id,
      p_items: items,
      p_total_amount: total_amount,
      p_discount: discount || 0,
      p_gateway_transaction_id: tranId,
      p_cashier_id: user.id,
    })

    if (intentError) {
      console.error('create_sale_intent error:', intentError)
      throw new Error(`Failed to reserve stock: ${intentError.message}`)
    }

    const SSL_STORE_ID = Deno.env.get('SSLCOMMERZ_STORE_ID') || Deno.env.get('SSL_COMMERZ_STORE_ID') || ''
    const SSL_STORE_PASSWORD = Deno.env.get('SSLCOMMERZ_STORE_PASSWORD') || Deno.env.get('SSL_COMMERZ_STORE_PASSWORD') || ''
    const SSL_IS_LIVE = (Deno.env.get('SSLCOMMERZ_IS_LIVE') || 'false') === 'true'
    const SSL_GATEWAY_URL = sslCommerzSessionApiUrl(SSL_IS_LIVE)

    if (!SSL_STORE_ID || !SSL_STORE_PASSWORD) {
      throw new Error('SSLCommerz credentials are missing')
    }

    const ipnDefaultUrl = `${supabaseUrl}/functions/v1/payment-ipn`
    const ipnUrl = Deno.env.get('SSLCOMMERZ_IPN_URL') || ipnDefaultUrl

    const productName = `POS Sale (${storeData.name})`.slice(0, 255)
    // value_* max 255 chars; cart details live in client pending checkout — keep value_a short
    const valueA = store_id.slice(0, 255)
    const valueC = user.id.length > 255 ? user.id.slice(0, 255) : user.id

    const payload = new URLSearchParams({
      store_id: SSL_STORE_ID,
      store_passwd: SSL_STORE_PASSWORD,
      total_amount: total_amount.toFixed(2),
      currency: 'BDT',
      tran_id: tranId,
      success_url: withTranId(success_url, tranId),
      fail_url: withTranId(fail_url, tranId),
      cancel_url: withTranId(cancel_url, tranId),
      ipn_url: withTranId(ipnUrl, tranId),
      product_name: productName,
      product_category: 'Retail',
      product_profile: 'general',
      cus_name: 'POS Customer',
      cus_email: 'pos@local.customer',
      cus_add1: 'N/A',
      cus_add2: 'N/A',
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: '01700000000',
      cus_fax: '01700000000',
      shipping_method: 'NO',
      ship_name: 'POS Customer',
      ship_add1: 'N/A',
      ship_add2: 'N/A',
      ship_city: 'Dhaka',
      ship_state: 'Dhaka',
      ship_postcode: '1000',
      ship_country: 'Bangladesh',
      value_a: valueA,
      value_b: 'lucky-pos',
      value_c: valueC,
    })

    const gatewayResponse = await fetch(SSL_GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: payload,
    })

    const rawText = await gatewayResponse.text()
    let data: Record<string, unknown> = {}
    try {
      data = rawText ? JSON.parse(rawText) as Record<string, unknown> : {}
    } catch {
      console.error('SSLCommerz non-JSON response:', rawText.slice(0, 500))
      throw new Error('SSLCommerz returned an invalid response')
    }

    const redirectUrl = typeof data.GatewayPageURL === 'string' && data.GatewayPageURL.length > 0
      ? data.GatewayPageURL
      : undefined

    if (!redirectUrl) {
      const status = typeof data.status === 'string' ? data.status : ''
      const reason = typeof data.failedreason === 'string' ? data.failedreason : ''
      console.error('SSLCommerz checkout initialization failed:', data)
      const detail = [status, reason].filter(Boolean).join(' — ')
      throw new Error(
        detail ? `SSLCommerz: ${detail}` : 'Failed to initialize card checkout',
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        redirect_url: redirectUrl,
        tran_id: tranId,
        intent_id: (intentData as Record<string, unknown>)?.intent_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
