// verify-receipt-jev edge function
// Independent advisory verification layer for Lucky Store receipt processing.
// Evaluates deterministic arithmetic, BDT 0.05 tolerance, and JEV evidence assessment.
// SAFETY INVARIANT: Advisory only. Never authorizes inventory or ledger mutations.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const allowedOrigins = [
  ...(Deno.env.get('ALLOWED_ORIGINS') ?? Deno.env.get('ALLOWED_ORIGIN') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin')
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
  const originAllowed = !origin || allowedOrigins.includes(origin)
  if (origin && originAllowed) headers['Access-Control-Allow-Origin'] = origin
  return { headers, originAllowed }
}

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100
}

interface VerifyRequestPayload {
  receipt_id: string
  supplier_name?: string | null
  supplier_id?: string | null
  invoice_number?: string | null
  invoice_date?: string | null
  invoice_total?: number | null
  currency?: string
  doc_type?: string
  line_items: Array<{
    name: string
    quantity: number
    unit_price: number
    line_total?: number | null
    sku?: string
  }>
  source_image_verified?: boolean
  ocr_raw_text?: string | null
  extraction_confidence?: number | null
  tenant_id?: string | null
}

serve(async (req: Request) => {
  const { headers, originAllowed } = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  if (!originAllowed) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const authHeader = req.headers.get('Authorization')

  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Authorization header required' }), {
      status: 401,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  // Authenticate user & identify tenant
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid authentication credentials' }), {
      status: 401,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }

  let body: VerifyRequestPayload
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Malformed JSON payload' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }

  // Tenant Isolation Check
  const userTenantId = (user.app_metadata?.tenant_id as string | undefined) ??
                       (user.user_metadata?.tenant_id as string | undefined)

  if (userTenantId && body.tenant_id && body.tenant_id !== userTenantId) {
    return new Response(
      JSON.stringify({
        error: 'Tenant boundary violation: caller tenant does not match receipt tenant',
      }),
      { status: 403, headers: { ...headers, 'Content-Type': 'application/json' } }
    )
  }

  const tenantId = body.tenant_id || userTenantId

  // 1. Deterministic Financial Reconciliation
  const missingFields: string[] = []
  const mathErrors: string[] = []

  if (!body.supplier_name?.trim()) missingFields.push('supplier_name')
  if (!body.invoice_number?.trim()) missingFields.push('invoice_number')

  const invoiceTotal = body.invoice_total ?? null
  if (invoiceTotal === null || isNaN(invoiceTotal)) {
    missingFields.push('invoice_total')
    mathErrors.push('Missing or invalid invoice total')
  } else if (invoiceTotal < 0) {
    mathErrors.push('Invoice total cannot be negative')
  }

  let calculatedTotal = 0
  let lineItemsValid = true

  if (!body.line_items || !Array.isArray(body.line_items) || body.line_items.length === 0) {
    missingFields.push('line_items')
    lineItemsValid = false
    mathErrors.push('Receipt contains no line items')
  } else {
    for (let i = 0; i < body.line_items.length; i++) {
      const item = body.line_items[i]
      const idx = i + 1

      if (!item.name?.trim()) {
        lineItemsValid = false
        mathErrors.push(`Line item #${idx} missing name description`)
      }

      if (typeof item.quantity !== 'number' || isNaN(item.quantity) || item.quantity <= 0) {
        lineItemsValid = false
        mathErrors.push(`Line item #${idx} has invalid non-positive quantity: ${item.quantity}`)
      }

      if (typeof item.unit_price !== 'number' || isNaN(item.unit_price) || item.unit_price < 0) {
        lineItemsValid = false
        mathErrors.push(`Line item #${idx} has invalid negative unit price: ${item.unit_price}`)
      }

      const expectedItemTotal = round2((item.quantity || 0) * (item.unit_price || 0))

      if (item.line_total !== null && item.line_total !== undefined) {
        if (typeof item.line_total !== 'number' || isNaN(item.line_total) || item.line_total < 0) {
          lineItemsValid = false
          mathErrors.push(`Line item #${idx} has invalid line total: ${item.line_total}`)
        } else {
          const itemDiff = Math.abs(item.line_total - expectedItemTotal)
          if (itemDiff > 0.05) {
            lineItemsValid = false
            mathErrors.push(
              `Line item #${idx} ("${item.name}") arithmetic mismatch: ${item.quantity} * ${item.unit_price} = ${expectedItemTotal}, extracted line_total = ${item.line_total}`
            )
          }
          calculatedTotal = round2(calculatedTotal + item.line_total)
        }
      } else {
        calculatedTotal = round2(calculatedTotal + expectedItemTotal)
      }
    }
  }

  const effectiveInvoiceTotal = invoiceTotal ?? 0
  const reconciliationDifference = round2(Math.abs(effectiveInvoiceTotal - calculatedTotal))
  const totalsMatch = missingFields.length === 0 && lineItemsValid && reconciliationDifference <= 0.05

  // 2. JEV Advisory Evidence & Contradiction Detection
  const contradictions: string[] = []
  const hallucinations: string[] = []
  const warnings: string[] = []

  if (body.currency && body.currency.toUpperCase() !== 'BDT') {
    contradictions.push(`Receipt currency is ${body.currency}, but Lucky Store operates in BDT`)
  }

  if (body.doc_type && body.doc_type !== 'purchase_invoice') {
    contradictions.push(`Document classified as "${body.doc_type}", not an authorized purchase invoice`)
  }

  // Check for duplicate invoice in database if tenant_id and invoice_number available
  let duplicateRisk = false
  if (tenantId && body.invoice_number?.trim()) {
    try {
      let query = supabase
        .from('purchase_receipts')
        .select('id, supplier_id, invoice_number, created_at')
        .eq('tenant_id', tenantId)
        .eq('invoice_number', body.invoice_number.trim())

      if (body.supplier_id) {
        query = query.eq('supplier_id', body.supplier_id)
      }

      const { data: dupData } = await query.limit(1)
      if (dupData && dupData.length > 0) {
        duplicateRisk = true
        warnings.push(
          `Invoice #${body.invoice_number} already exists in database (recorded on ${new Date(dupData[0].created_at).toLocaleDateString()})`
        )
      }
    } catch {
      // Database check failure non-fatal for advisory evaluation
    }
  }

  // Raw OCR source grounding and hallucination check
  let groundedInSource = true
  if (body.ocr_raw_text) {
    const rawLower = body.ocr_raw_text.toLowerCase()

    if (body.supplier_name) {
      const supplierKeywords = body.supplier_name.toLowerCase().split(/\s+/).filter(w => w.length > 2)
      const supplierFound = supplierKeywords.some(kw => rawLower.includes(kw))
      if (!supplierFound) {
        contradictions.push(`Extracted supplier "${body.supplier_name}" not found in source text`)
        groundedInSource = false
      }
    }

    if (body.line_items && body.line_items.length > 0) {
      for (const item of body.line_items) {
        const itemWords = item.name.toLowerCase().split(/\s+/).filter(w => w.length > 3)
        const matchFound = itemWords.length === 0 || itemWords.some(w => rawLower.includes(w))
        if (!matchFound) {
          hallucinations.push(
            `Extracted line item "${item.name}" has no corresponding mention in source text (potential hallucination)`
          )
          groundedInSource = false
        }
      }
    }
  }

  // Optional TypeSafe API call if TYPESAFE_API_KEY configured
  const typeSafeKey = Deno.env.get('TYPESAFE_API_KEY') || Deno.env.get('JEV_CLI_API_KEY')
  let evalSource = 'advisory_engine'

  if (typeSafeKey) {
    try {
      // TypeSafe System One API call for semantic contradiction verification
      const promptState = {
        supplier: body.supplier_name,
        invoice_number: body.invoice_number,
        total: effectiveInvoiceTotal,
        items: body.line_items?.map(it => it.name) || [],
        raw_snippet: body.ocr_raw_text ? body.ocr_raw_text.slice(0, 400) : '',
      }

      const tsResp = await fetch('https://api.typesafe.ai/v1/systemone', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${typeSafeKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          state: JSON.stringify(promptState),
          questions: {
            has_contradictions: {
              type: 'boolean',
              instructions: 'Are there direct contradictions between extracted data and source text?',
            },
          },
        }),
      })

      if (tsResp.ok) {
        const tsData = await tsResp.json()
        evalSource = 'typesafe_api'
        if (tsData.answers?.has_contradictions?.answer === true) {
          contradictions.push('TypeSafe JEV detected internal contradictions in receipt claims')
        }
      }
    } catch {
      evalSource = 'advisory_engine'
    }
  }

  // 3. Recommendation Resolution
  const sourceVerified = body.source_image_verified === true
  let recommendation: 'PASS' | 'REVIEW' | 'FAIL'
  let requiredAction: string

  const allContradictions = [...contradictions, ...hallucinations]

  if (!totalsMatch || !lineItemsValid || missingFields.length > 0 || allContradictions.length > 0) {
    recommendation = 'FAIL'
    requiredAction =
      'Quarantine receipt. Resolve arithmetic mismatches, missing fields, or source contradictions before re-submission.'
  } else if (!sourceVerified || warnings.length > 0 || duplicateRisk) {
    recommendation = 'REVIEW'
    requiredAction = !sourceVerified
      ? 'Manual document verification required: Inspect source receipt image in Lucky Store Admin to confirm item details.'
      : 'Review potential duplicate invoice warning or field warnings with purchasing manager.'
  } else {
    recommendation = 'PASS'
    requiredAction =
      'Arithmetic and source evidence verified. Ready for authorized manual manager/admin approval.'
  }

  const report = {
    receipt_id: body.receipt_id || 'UNKNOWN',
    supplier: body.supplier_name || 'UNKNOWN_SUPPLIER',
    invoice_number: body.invoice_number || 'UNKNOWN_INVOICE',
    extracted_total: effectiveInvoiceTotal,
    calculated_total: calculatedTotal,
    reconciliation_difference: reconciliationDifference,
    missing_fields: missingFields,
    contradictions: allContradictions,
    source_verification_status: sourceVerified ? 'VERIFIED' : 'NOT_COMPLETED',
    advisory_recommendation: recommendation,
    required_human_action: requiredAction,
    safety: {
      advisory_only: true,
      posting_authorized: false,
      inventory_mutation_authorized: false,
    },
    deterministic: {
      calculated_total: calculatedTotal,
      invoice_total: effectiveInvoiceTotal,
      reconciliation_difference: reconciliationDifference,
      line_items_valid: lineItemsValid,
      tolerance_applied: 0.05,
      totals_match: totalsMatch,
      missing_fields: missingFields,
      arithmetic_status: totalsMatch ? 'PASS' : 'FAIL',
      errors: mathErrors,
    },
    jev_evidence: {
      grounded_in_source: groundedInSource,
      contradictions: allContradictions,
      hallucinations_detected: hallucinations,
      field_warnings: warnings,
      duplicate_invoice_risk: duplicateRisk,
      extraction_confidence: body.extraction_confidence ?? null,
      eval_source: evalSource,
    },
    timestamp: new Date().toISOString(),
  }

  return new Response(JSON.stringify(report), {
    status: 200,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
})
