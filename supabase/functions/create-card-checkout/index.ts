import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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

serve(async (req) => {
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

    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .select('name')
      .eq('id', store_id)
      .single()

    if (storeError || !storeData) throw new Error('Store not found')

    const tranId = crypto.randomUUID().replaceAll('-', '').slice(0, 20)

    const SSL_STORE_ID = Deno.env.get('SSLCOMMERZ_STORE_ID') || Deno.env.get('SSL_COMMERZ_STORE_ID') || ''
    const SSL_STORE_PASSWORD = Deno.env.get('SSLCOMMERZ_STORE_PASSWORD') || Deno.env.get('SSL_COMMERZ_STORE_PASSWORD') || ''
    const SSL_IS_LIVE = (Deno.env.get('SSLCOMMERZ_IS_LIVE') || 'false') === 'true'
    const SSL_GATEWAY_URL = sslCommerzSessionApiUrl(SSL_IS_LIVE)

    if (!SSL_STORE_ID || !SSL_STORE_PASSWORD) {
      throw new Error('SSLCommerz credentials are missing')
    }

    const ipnDefaultUrl = `${supabaseUrl}/functions/v1/payment-ipn`
    const ipnUrl = Deno.env.get('SSLCOMMERZ_IPN_URL') || ipnDefaultUrl

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
      product_name: `POS Sale (${storeData.name})`,
      product_category: 'Retail',
      product_profile: 'general',
      cus_name: 'POS Customer',
      cus_email: 'pos@local.customer',
      cus_add1: 'N/A',
      cus_city: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: '0000000000',
      shipping_method: 'NO',
      value_a: JSON.stringify({
        store_id,
        discount,
        items,
      }),
      value_b: 'lucky-pos',
      value_c: user.id,
    })

    const gatewayResponse = await fetch(SSL_GATEWAY_URL, {
      method: 'POST',
      body: payload,
    })

    const data = await gatewayResponse.json()
    const redirectUrl = data?.GatewayPageURL as string | undefined

    if (!redirectUrl) {
      console.error('SSLCommerz checkout initialization failed:', data)
      throw new Error('Failed to initialize card checkout')
    }

    return new Response(
      JSON.stringify({
        success: true,
        redirect_url: redirectUrl,
        tran_id: tranId,
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
