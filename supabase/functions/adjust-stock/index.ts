import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://lucky-store.vercel.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type UserRole = "admin" | "manager" | "cashier" | "stock";

const ALLOWED_ROLES: UserRole[] = ["admin", "manager", "stock"];

const VALID_REASONS = [
  "received",
  "damaged",
  "lost",
  "correction",
  "returned",
  "transfer_in",
  "transfer_out",
  "expired",
  "other",
] as const;

// Threshold for requiring manager PIN (5%)
const FRAUD_THRESHOLD_PERCENT = 0.05;

interface AdjustStockRequest {
  store_id: string;
  item_id: string;
  delta: number;
  reason: (typeof VALID_REASONS)[number];
  notes?: string;
  manager_pin?: string; // Required for adjustments > 5%
}

interface PinVerificationResult {
  valid: boolean;
  role?: string;
  user_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only POST allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Auth
    const authHeader =
      req.headers.get("authorization") ?? req.headers.get("Authorization");
    const token = authHeader?.toLowerCase().startsWith("bearer ")
      ? authHeader.replace(/^Bearer\s+/i, "").trim()
      : null;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Authorization token missing" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid JWT token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("users")
      .select("id, role")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      !ALLOWED_ROLES.includes(profile.role as UserRole)
    ) {
      return new Response(
        JSON.stringify({
          error: "Only admin, manager, or stock roles can adjust stock",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse request
    const body: AdjustStockRequest = await req.json();
    const { store_id, item_id, delta, reason, notes, manager_pin } = body;

    // Validate required fields
    if (!store_id || !item_id || delta === undefined || delta === null) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: store_id, item_id, delta",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!Number.isInteger(delta) || delta === 0) {
      return new Response(
        JSON.stringify({
          error: "delta must be a non-zero integer",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!reason || !VALID_REASONS.includes(reason)) {
      return new Response(
        JSON.stringify({
          error: `Invalid reason. Must be one of: ${VALID_REASONS.join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── Fraud Protection: Check adjustment magnitude ─────────────────────────
    // Get current stock level to calculate % change
    const { data: stockData, error: stockError } = await supabaseClient
      .from("stock_levels")
      .select("qty")
      .eq("store_id", store_id)
      .eq("item_id", item_id)
      .maybeSingle();

    if (stockError) {
      console.error("Error fetching stock level:", stockError);
      return new Response(
        JSON.stringify({ error: "Failed to verify stock level" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const currentQty = stockData?.qty ?? 0;
    const adjustmentPercent = Math.abs(delta) / Math.max(currentQty, 1);
    const requiresManagerAuth = adjustmentPercent > FRAUD_THRESHOLD_PERCENT;

    // If adjustment > 5%, require manager PIN verification
    if (requiresManagerAuth) {
      // Manager role bypasses PIN check
      const isManager = profile.role === "admin" || profile.role === "manager";
      
      if (!isManager) {
        // Non-managers must provide valid manager PIN
        if (!manager_pin || manager_pin.length !== 4) {
          return new Response(
            JSON.stringify({
              error: "Manager PIN required",
              error_code: "MANAGER_AUTH_REQUIRED",
              details: `Stock adjustment of ${Math.round(adjustmentPercent * 100)}% exceeds ${Math.round(FRAUD_THRESHOLD_PERCENT * 100)}% threshold. Manager authorization required.`,
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Verify manager PIN
        const { data: pinResult, error: pinError } = await supabaseClient.rpc(
          "authenticate_staff_pin",
          { p_pin: manager_pin }
        );

        if (pinError || !pinResult || (Array.isArray(pinResult) && pinResult.length === 0)) {
          return new Response(
            JSON.stringify({
              error: "Invalid manager PIN",
              error_code: "INVALID_MANAGER_PIN",
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const pinProfile = Array.isArray(pinResult) ? pinResult[0] : pinResult;
        const pinRole = (pinProfile?.role as string)?.toLowerCase();
        
        if (pinRole !== "manager" && pinRole !== "admin") {
          return new Response(
            JSON.stringify({
              error: "PIN does not belong to a manager",
              error_code: "NOT_MANAGER_PIN",
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    // Call the RPC
    const { data, error: rpcError } = await supabaseClient.rpc("adjust_stock", {
      p_store_id: store_id,
      p_item_id: item_id,
      p_delta: delta,
      p_reason: reason,
      p_notes: notes ?? null,
      p_performed_by: profile.id,
    });

    if (rpcError) {
      console.error("adjust_stock RPC error:", rpcError);
      return new Response(
        JSON.stringify({
          error: rpcError.message || "Failed to adjust stock",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...data,
        fraud_check: {
          threshold_percent: FRAUD_THRESHOLD_PERCENT * 100,
          adjustment_percent: Math.round(adjustmentPercent * 100 * 100) / 100,
          manager_auth_required: requiresManagerAuth,
          manager_auth_provided: requiresManagerAuth && (profile.role === "admin" || profile.role === "manager" || !!manager_pin),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in adjust-stock function:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
