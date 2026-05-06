// Enhanced create-sale edge function with rate limiting and input validation
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import {
  checkRateLimit,
  validateBodySize,
  sanitizeString,
  isValidUUID,
  isValidPositiveInt,
  isValidPositiveNumber,
  getClientIP,
  getRateLimitHeaders,
} from '../_shared/rate-limit.ts'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://lucky-store.vercel.app';
const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB
const MAX_ITEMS_PER_SALE = 100;
const MAX_DISCOUNT_PERCENT = 100;
const MAX_SALE_AMOUNT = 1000000; // 1 million (adjust based on your currency)

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SaleItem {
  item_id: string
  quantity: number
  price: number
  cost?: number
  discount?: number
}

interface CreateSaleRequest {
  store_id: string | null
  client_transaction_id: string
  items: SaleItem[]
  discount: number
  payment_method_id: string
  reference?: string
}

/**
 * Validate sale item structure and values
 */
function validateSaleItem(item: unknown, index: number): { valid: boolean; error?: string } {
  if (typeof item !== 'object' || item === null) {
    return { valid: false, error: `Item ${index}: must be an object` };
  }

  const saleItem = item as Record<string, unknown>;

  // Validate item_id (required, must be UUID)
  if (!saleItem.item_id || typeof saleItem.item_id !== 'string') {
    return { valid: false, error: `Item ${index}: item_id is required` };
  }
  if (!isValidUUID(saleItem.item_id)) {
    return { valid: false, error: `Item ${index}: item_id must be a valid UUID` };
  }

  // Validate quantity (required, positive integer, max 10000)
  if (typeof saleItem.quantity !== 'number') {
    return { valid: false, error: `Item ${index}: quantity must be a number` };
  }
  if (!isValidPositiveInt(saleItem.quantity) || saleItem.quantity > 10000) {
    return { valid: false, error: `Item ${index}: quantity must be between 1 and 10,000` };
  }

  // Validate price (required, positive number, max 2 decimal places)
  if (typeof saleItem.price !== 'number') {
    return { valid: false, error: `Item ${index}: price must be a number` };
  }
  if (!isValidPositiveNumber(saleItem.price, 2) || saleItem.price > MAX_SALE_AMOUNT) {
    return { valid: false, error: `Item ${index}: price must be positive with max 2 decimal places` };
  }

  // Validate optional cost (if provided)
  if (saleItem.cost !== undefined) {
    if (typeof saleItem.cost !== 'number' || !isValidPositiveNumber(saleItem.cost, 2)) {
      return { valid: false, error: `Item ${index}: cost must be a positive number` };
    }
  }

  // Validate optional discount (if provided)
  if (saleItem.discount !== undefined) {
    if (typeof saleItem.discount !== 'number' || !isValidPositiveNumber(saleItem.discount, 2)) {
      return { valid: false, error: `Item ${index}: discount must be a positive number` };
    }
    // Check per-item discount doesn't exceed price
    const itemDiscount = saleItem.discount as number;
    const itemPrice = saleItem.price as number;
    if (itemDiscount > itemPrice) {
      return { valid: false, error: `Item ${index}: discount cannot exceed item price` };
    }
  }

  return { valid: true };
}

/**
 * Validate complete sale request
 */
function validateSaleRequest(body: unknown): { valid: boolean; error?: string; data?: CreateSaleRequest } {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Request body must be an object' };
  }

  const request = body as Record<string, unknown>;

  // Validate store_id (required, must be UUID)
  if (!request.store_id || typeof request.store_id !== 'string') {
    return { valid: false, error: 'store_id is required' };
  }
  if (!isValidUUID(request.store_id)) {
    return { valid: false, error: 'store_id must be a valid UUID' };
  }

  // Validate client_transaction_id (required, non-empty string, max 100 chars)
  if (!request.client_transaction_id || typeof request.client_transaction_id !== 'string') {
    return { valid: false, error: 'client_transaction_id is required' };
  }
  const sanitizedTransactionId = sanitizeString(request.client_transaction_id, 100);
  if (sanitizedTransactionId.length === 0) {
    return { valid: false, error: 'client_transaction_id cannot be empty' };
  }

  // Validate items array
  if (!Array.isArray(request.items)) {
    return { valid: false, error: 'items must be an array' };
  }
  if (request.items.length === 0) {
    return { valid: false, error: 'Sale must have at least one item' };
  }
  if (request.items.length > MAX_ITEMS_PER_SALE) {
    return { valid: false, error: `Maximum ${MAX_ITEMS_PER_SALE} items per sale` };
  }

  // Validate each item
  for (let i = 0; i < request.items.length; i++) {
    const itemValidation = validateSaleItem(request.items[i], i);
    if (!itemValidation.valid) {
      return { valid: false, error: itemValidation.error };
    }
  }

  // Validate discount (optional, number, non-negative, max 100% of subtotal)
  let discount = 0;
  if (request.discount !== undefined) {
    if (typeof request.discount !== 'number') {
      return { valid: false, error: 'discount must be a number' };
    }
    if (request.discount < 0 || !isValidPositiveNumber(request.discount, 2)) {
      return { valid: false, error: 'discount must be non-negative with max 2 decimal places' };
    }
    discount = request.discount;
  }

  // Calculate subtotal and validate discount
  const subtotal = (request.items as SaleItem[]).reduce(
    (sum, item) => sum + (item.price * item.quantity),
    0
  );
  if (discount > subtotal) {
    return { valid: false, error: 'discount cannot exceed subtotal' };
  }
  if (subtotal - discount > MAX_SALE_AMOUNT) {
    return { valid: false, error: `Sale total cannot exceed ${MAX_SALE_AMOUNT}` };
  }

  // Validate payment_method_id (required, must be UUID)
  if (!request.payment_method_id || typeof request.payment_method_id !== 'string') {
    return { valid: false, error: 'payment_method_id is required' };
  }
  if (!isValidUUID(request.payment_method_id)) {
    return { valid: false, error: 'payment_method_id must be a valid UUID' };
  }

  // Validate optional reference (string, max 500 chars)
  let reference: string | undefined;
  if (request.reference !== undefined && request.reference !== null) {
    if (typeof request.reference !== 'string') {
      return { valid: false, error: 'reference must be a string' };
    }
    reference = sanitizeString(request.reference, 500);
  }

  return {
    valid: true,
    data: {
      store_id: request.store_id,
      client_transaction_id: sanitizedTransactionId,
      items: request.items as SaleItem[],
      discount,
      payment_method_id: request.payment_method_id,
      reference,
    },
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      }
    );
  }

  try {
    // Get user from auth header first (needed for rate limiting)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      throw new Error('Server configuration error');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Rate limiting: Max 10 sales per minute per user
    const rateLimitKey = `sale:${user.id}`;
    const rateLimit = checkRateLimit(rateLimitKey, {
      maxRequests: 10,
      windowMs: 60 * 1000, // 1 minute
    });

    const rateLimitHeaders = getRateLimitHeaders(
      rateLimit.remaining,
      rateLimit.resetAfter,
      10
    );

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          retry_after: Math.ceil(rateLimit.resetAfter / 1000),
        }),
        {
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          status: 429,
        }
      );
    }

    // Validate request body size
    const bodyText = await req.text();
    if (!validateBodySize(bodyText, MAX_REQUEST_SIZE)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Request body too large' }),
        {
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          status: 413,
        }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON in request body' }),
        {
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const validation = validateSaleRequest(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        {
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const requestData = validation.data!;

    // Get user profile to get cashier_id
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('User profile not found:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found' }),
        {
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    // Prepare RPC parameters
    const rpcItems = requestData.items.map((item) => ({
      item_id: item.item_id,
      qty: item.quantity,
      unit_price: item.price,
      cost: item.cost ?? 0,
      discount: item.discount ?? 0,
    }));

    const subtotal = rpcItems.reduce((sum, line) => sum + (line.unit_price * line.qty), 0);
    const total = subtotal - requestData.discount;

    const rpcPayments = [
      {
        payment_method_id: requestData.payment_method_id,
        amount: total,
        reference: requestData.reference ?? null,
      },
    ];

    const snapshot = {
      client_transaction_id: requestData.client_transaction_id,
      store_id: requestData.store_id,
      user_id: profile.id,
      mode: 'online',
      pricing_source: 'rpc',
      inventory_source: 'rpc',
      created_at: new Date().toISOString(),
      items: requestData.items.map((item) => ({
        product_id: item.item_id,
        quantity: item.quantity,
        unit_price_snapshot: item.price,
        discount_snapshot: item.discount ?? 0,
        stock_snapshot: 0,
      })),
    };

    // Call the complete_sale RPC
    const { data: saleResult, error: saleError } = await supabase.rpc('complete_sale', {
      p_store_id: requestData.store_id,
      p_cashier_id: profile.id,
      p_session_id: null,
      p_items: rpcItems,
      p_payments: rpcPayments,
      p_discount: requestData.discount,
      p_client_transaction_id: requestData.client_transaction_id,
      p_notes: null,
      p_snapshot: snapshot,
      p_fulfillment_policy: 'STRICT',
      p_override_token: null,
      p_override_reason: null,
    });

    if (saleError) {
      console.error('complete_sale RPC error:', saleError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create sale' }),
        {
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const result = saleResult as Record<string, unknown>;
    const syncStatus = (result.sync_status as string | undefined) ?? 'synced';
    const status = (result.status as string | undefined) ?? 'REJECTED';

    // Return success response
    return new Response(
      JSON.stringify({
        success: status === 'SUCCESS' || status === 'ADJUSTED',
        status,
        sync_status: syncStatus,
        duplicate_detected: result.duplicate_detected ?? false,
        conflict_type: result.conflict_type ?? null,
        conflict_reason: result.conflict_reason ?? null,
        adjustments: result.adjustments ?? [],
        message: result.message ?? null,
        sale_id: result.sale_id,
        sale_number: result.sale_number,
        total: result.total_amount ?? 0,
        items: rpcItems.length,
      }),
      {
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in create-sale function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
