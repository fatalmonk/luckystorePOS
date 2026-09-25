// extract-receipt-vision edge function
// Processes supplier invoices securely using multimodal vision models.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function extractWithOpenAI(imageBase64: string, mimeType: string, apiKey: string) {
  const model = Deno.env.get('AI_MODEL') || 'gpt-4o';
  const systemPrompt = `You extract evidence from supplier invoices for a retail purchase-entry system. The document may contain Bengali and English.
Inspect the original image visually, including table geometry, row boundaries, column headings, printed text, handwriting, and how handwritten values align with printed rows. Associate handwritten quantity, unit price, and amount with the populated printed product row they occupy. Distinguish populated rows from unused template rows.
Preserve product descriptions and pack/size information. Extract quantities, unit costs, line amounts, and dates only when supported by the image. Return null for unreadable or uncertain fields; do not guess or alter values to make arithmetic reconcile. Never invent database IDs, supplier IDs, inventory identities, or accounting decisions. The document issuer and printed receipt number are document metadata; they are not Lucky Store's filename-derived business supplier or internal invoice reference.`;

  const requestBody = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: [
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
      ]}
    ],
    temperature: 0,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "receipt_extraction",
        schema: {
          type: "object",
          properties: {
            invoiceNumber: { type: ["string", "null"] },
            invoiceDate: { type: ["string", "null"], description: "ISO date if parsable, else text" },
            invoiceTotal: { type: ["number", "null"] },
            subtotal: { type: ["number", "null"] },
            discount: { type: ["number", "null"] },
            vat: { type: ["number", "null"] },
            supplierName: { type: ["string", "null"] },
            confidence: { type: "string", enum: ["high", "medium", "low"], description: "Overall extraction confidence" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  quantity: { type: ["number", "null"] },
                  unitPrice: { type: ["number", "null"] },
                  total: { type: ["number", "null"] },
                  packSize: { type: ["string", "null"] },
                  unit: { type: ["string", "null"] },
                  confidence: { type: "string", enum: ["high", "medium", "low"] }
                },
                required: ["name", "quantity", "unitPrice", "total", "packSize", "unit", "confidence"],
                additionalProperties: false
              }
            }
          },
          required: ["invoiceNumber", "invoiceDate", "invoiceTotal", "subtotal", "discount", "vat", "supplierName", "confidence", "items"],
          additionalProperties: false
        },
        strict: true
      }
    }
  };

  let aiUrl = Deno.env.get('AI_BASE_URL') || 'https://api.openai.com/v1/chat/completions';
      if (aiUrl.endsWith('/')) aiUrl = aiUrl.slice(0, -1);
      if (aiUrl.endsWith('/v1')) aiUrl += '/chat/completions';
      
  const providerName = aiUrl.includes('api.openai.com') ? 'openai' : 'openai-compatible';
  const res = await fetch(aiUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "ngrok-skip-browser-warning": "true",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  if (!res.ok) {
    const providerBody = await res.json().catch(() => null);
    const providerCode = providerBody?.error?.code ?? providerBody?.error?.type;
    console.error('Receipt vision provider rejected request', {
      provider: providerName,
      model,
      status: res.status,
      code: providerCode,
    });
    if (res.status === 401 || res.status === 403) {
      throw Object.assign(new Error('Vision provider authentication failed. Contact an administrator.'), {
        code: 'PROVIDER_AUTH_FAILED',
        status: 502,
      });
    }
    if (providerCode === 'insufficient_quota' || providerCode === 'credit_balance_exhausted') {
      throw Object.assign(new Error('Vision provider credits are exhausted. Contact an administrator.'), {
        code: 'PROVIDER_CREDITS_EXHAUSTED',
        status: 429,
      });
    }
    if (res.status === 429) {
      throw Object.assign(new Error('Vision provider rate limit reached.'), {
        code: 'PROVIDER_RATE_LIMIT',
        status: 503,
      });
    }
    if (res.status >= 400 && res.status < 500) {
      throw Object.assign(new Error('Vision provider rejected the configured request.'), {
        code: 'PROVIDER_REQUEST_REJECTED',
        status: 502,
      });
    }
    throw Object.assign(new Error('Vision provider request failed.'), {
      code: 'PROVIDER_REQUEST_FAILED',
      status: res.status >= 500 ? 503 : 502,
    });
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  let parsed: any;
  try {
    if (typeof content !== 'string') throw new Error('Missing structured content');
    parsed = JSON.parse(content);
  } catch {
    throw Object.assign(new Error('Vision provider returned an invalid structured response.'), {
      code: 'PROVIDER_INVALID_RESPONSE',
      status: 502,
    });
  }

  const confidence = (value: unknown) => value === 'high' || value === 'medium' || value === 'low';
  const optionalNumber = (value: unknown) => value === null || (typeof value === 'number' && Number.isFinite(value));
  const expectedFields = ['invoiceNumber', 'invoiceDate', 'invoiceTotal', 'subtotal', 'discount', 'vat', 'supplierName', 'confidence', 'items'];
  const expectedItemFields = ['name', 'quantity', 'unitPrice', 'total', 'packSize', 'unit', 'confidence'];
  const valid = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    && expectedFields.every((field) => Object.hasOwn(parsed, field))
    && Object.keys(parsed).every((field) => expectedFields.includes(field))
    && (parsed.invoiceNumber === null || typeof parsed.invoiceNumber === 'string')
    && (parsed.invoiceDate === null || typeof parsed.invoiceDate === 'string')
    && optionalNumber(parsed.invoiceTotal)
    && optionalNumber(parsed.subtotal)
    && optionalNumber(parsed.discount)
    && optionalNumber(parsed.vat)
    && (parsed.supplierName === null || typeof parsed.supplierName === 'string')
    && confidence(parsed.confidence)
    && Array.isArray(parsed.items)
    && parsed.items.every((item: any) => item && typeof item === 'object' && !Array.isArray(item)
      && expectedItemFields.every((field) => Object.hasOwn(item, field))
      && Object.keys(item).every((field) => expectedItemFields.includes(field))
      && typeof item.name === 'string' && item.name.trim()
      && optionalNumber(item.quantity) && optionalNumber(item.unitPrice) && optionalNumber(item.total)
      && (item.packSize === null || typeof item.packSize === 'string')
      && (item.unit === null || typeof item.unit === 'string')
      && confidence(item.confidence));
  if (!valid) {
    throw Object.assign(new Error('Vision provider returned data that does not match the receipt extraction schema.'), {
      code: 'PROVIDER_INVALID_RESPONSE',
      status: 502,
    });
  }
  return { parsed, provider: providerName, model };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { imageBase64, mimeType = 'image/jpeg' } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'Missing imageBase64' }), { status: 400, headers: corsHeaders });
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      return new Response(JSON.stringify({ error: 'Unsupported image MIME type' }), { status: 415, headers: corsHeaders });
    }

    // Just check length roughly - 10MB base64 limits
    if (imageBase64.length > 15 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413, headers: corsHeaders });
    }

    const apiKey = Deno.env.get('OMNI_ROUTE_API_KEY') || Deno.env.get('OMNIROUTE_API_KEY') || Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Vision provider is not configured.', code: 'PROVIDER_NOT_CONFIGURED' }), { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { parsed, provider, model } = await extractWithOpenAI(imageBase64, mimeType, apiKey);

    return new Response(JSON.stringify({ success: true, data: parsed, diagnostics: { provider, model } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const failure = error as Error & { code?: string; status?: number };
    console.error('Vision extraction failed', { code: failure.code ?? 'VISION_EXTRACTION_FAILED' });
    return new Response(JSON.stringify({
      error: failure.message || 'Vision extraction failed.',
      ...(failure.code ? { code: failure.code } : {}),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: failure.status ?? 500,
    });
  }
})
