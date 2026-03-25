import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type SSLValidationResult = Record<string, string>

function sslCommerzValidatorBase(isLive: boolean): string {
  const raw = Deno.env.get('SSLCOMMERZ_VALIDATOR_URL')?.trim()
  if (raw) {
    const u = new URL(raw)
    u.search = ''
    return u.toString().replace(/\/$/, '')
  }
  return isLive
    ? 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php'
    : 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const params = new URLSearchParams()
    if (req.method === 'POST') {
      const form = await req.formData()
      form.forEach((value, key) => params.set(key, String(value)))
    } else {
      const reqUrl = new URL(req.url)
      reqUrl.searchParams.forEach((value, key) => params.set(key, value))
    }

    const valId = params.get('val_id')
    const tranId = params.get('tran_id')
    if (!valId) {
      throw new Error('Missing val_id in IPN payload')
    }

    const storeId = Deno.env.get('SSLCOMMERZ_STORE_ID') || Deno.env.get('SSL_COMMERZ_STORE_ID') || ''
    const storePassword = Deno.env.get('SSLCOMMERZ_STORE_PASSWORD') || Deno.env.get('SSL_COMMERZ_STORE_PASSWORD') || ''
    const isLive = (Deno.env.get('SSLCOMMERZ_IS_LIVE') || 'false') === 'true'
    const validatorBase = sslCommerzValidatorBase(isLive)

    if (!storeId || !storePassword) {
      throw new Error('SSLCommerz credentials are missing')
    }

    const validationUrl = new URL(validatorBase)
    validationUrl.searchParams.set('val_id', valId)
    validationUrl.searchParams.set('store_id', storeId)
    validationUrl.searchParams.set('store_passwd', storePassword)
    validationUrl.searchParams.set('v', '1')
    validationUrl.searchParams.set('format', 'json')

    const response = await fetch(validationUrl.toString())
    const result: SSLValidationResult = await response.json()

    const valid = result.status === 'VALID' || result.status === 'VALIDATED'

    return new Response(
      JSON.stringify({
        ok: valid,
        tran_id: tranId,
        status: result.status ?? 'UNKNOWN',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'IPN processing failed'
    return new Response(
      JSON.stringify({
        ok: false,
        error: message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
