import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// CORS Headers
// ---------------------------------------------------------------------------
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, apikey, x-client-info",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type TransactionType = "income" | "expense";

interface CreateTransactionPayload {
  amount: unknown;
  type: unknown;
  category_id: unknown;
  date: unknown;
  description?: unknown;
  target_user_id?: unknown; // <--- ADDED: Optional target for Admins
}

interface CreatedTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  category_id: string;
  date: string;
  description: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validatePayload(
  body: CreateTransactionPayload
): { ok: true; data: Required<Omit<CreateTransactionPayload, "description" | "target_user_id">> & { description: string | null, target_user_id?: string } }
  | { ok: false; error: string } {

  // ── amount ──
  const rawAmount = Number(body.amount);
  if (body.amount === undefined || body.amount === null || body.amount === "") {
    return { ok: false, error: "amount is required." };
  }
  if (isNaN(rawAmount) || rawAmount <= 0) {
    return { ok: false, error: "amount must be a number greater than 0." };
  }
  if (parseFloat(rawAmount.toFixed(2)) !== rawAmount && String(body.amount).split(".")[1]?.length > 2) {
    return { ok: false, error: "amount may have at most 2 decimal places." };
  }

  // ── type ──
  if (body.type !== "income" && body.type !== "expense") {
    return { ok: false, error: `type must be "income" or "expense".` };
  }

  // ── category_id ──
  if (typeof body.category_id !== "string" || !UUID_RE.test(body.category_id)) {
    return { ok: false, error: "category_id must be a valid UUID." };
  }

  // ── date ──
  if (typeof body.date !== "string" || !DATE_RE.test(body.date)) {
    return { ok: false, error: "date must be a string in YYYY-MM-DD format." };
  }
  const parsedDate = new Date(body.date);
  if (isNaN(parsedDate.getTime())) {
    return { ok: false, error: "date is not a valid calendar date." };
  }
  const todayUTC = new Date();
  todayUTC.setUTCHours(23, 59, 59, 999);
  if (parsedDate > todayUTC) {
    return { ok: false, error: "date cannot be in the future." };
  }

  // ── description ──
  let description: string | null = null;
  if (body.description !== undefined && body.description !== null && body.description !== "") {
    if (typeof body.description !== "string" || body.description.length > 500) {
      return { ok: false, error: "description must be a string (max 500 chars)." };
    }
    description = body.description.trim();
  }

  // ── target_user_id (Admin specific) ──
  let target_user_id: string | undefined = undefined;
  if (body.target_user_id !== undefined && body.target_user_id !== null && body.target_user_id !== "") {
    if (typeof body.target_user_id !== "string" || !UUID_RE.test(body.target_user_id)) {
      return { ok: false, error: "target_user_id must be a valid UUID." };
    }
    target_user_id = body.target_user_id;
  }

  return {
    ok: true,
    data: {
      amount: parseFloat(rawAmount.toFixed(2)),
      type: body.type as TransactionType,
      category_id: body.category_id,
      date: body.date,
      description,
      target_user_id, // <--- Extracted and validated safely
    },
  };
}

// ---------------------------------------------------------------------------
// Standard Responses
// ---------------------------------------------------------------------------
function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function successResponse(data: CreatedTransaction): Response {
  return new Response(JSON.stringify({ data }), {
    status: 201,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return errorResponse(405, `Method ${req.method} not allowed. Use POST.`);
  }

  try {
    // ── STEP 1: Authenticate caller ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse(401, "Missing Authorization header.");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, "Unauthenticated or session expired.");
    }

    // ── STEP 2: Parse body ──
    let rawBody: Record<string, unknown>;
    try {
      rawBody = await req.json();
    } catch {
      return errorResponse(400, "Request body must be valid JSON.");
    }

    // ── STEP 3: Validate fields ──
    const validation = validatePayload(rawBody as CreateTransactionPayload);
    if (!validation.ok) {
      return errorResponse(422, `Validation error: ${validation.error}`);
    }
    const { amount, type, category_id, date, description, target_user_id } = validation.data;

    // ── STEP 4: Verify Category ──
    const { data: category, error: catError } = await supabase
      .from("categories")
      .select("id, type")
      .eq("id", category_id)
      .maybeSingle();

    if (catError) return errorResponse(500, `Failed to verify category: ${catError.message}`);
    if (!category) return errorResponse(422, `category_id "${category_id}" does not exist.`);
    if (category.type !== type) {
      return errorResponse(422, `Category mismatch: expected "${type}" but got "${category.type}".`);
    }

    // ── STEP 5: Resolve Identity & Support Admin Overrides ──
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return errorResponse(500, `Failed to recalibrate identity: ${profileError.message}`);
    }

    // MANDATORY: Block inactive callers immediately
    if (profile.status === "inactive") {
      return errorResponse(403, "Account is inactive. Please contact system administrator.");
    }

    let effectiveUserId = user.id; // Default to self

    if (target_user_id && target_user_id !== user.id) {
      if (profile.role === "admin") {
        effectiveUserId = target_user_id; // Admin override applied
      } else {
        // Normal user trying to spoof a transaction for someone else
        return errorResponse(403, "Forbidden: Only Admins can assign transactions to other users.");
      }
    }

    // ── STEP 6: Insert Transaction ──
    const { data: inserted, error: insertError } = await supabase
      .from("transactions")
      .insert([
        {
          user_id: effectiveUserId, // Uses the dynamically resolved ID!
          amount,
          type,
          category_id,
          date,
          description,
        },
      ])
      .select("id, user_id, amount, type, category_id, date, description, created_at")
      .single();

    if (insertError) {
      console.error("[create-transaction] DB insert error:", insertError);
      return errorResponse(500, `Failed to create transaction: ${insertError.message}`);
    }

    console.info(`[create-transaction] OK — effective_user=${effectiveUserId} caller=${user.id}`);
    return successResponse(inserted as CreatedTransaction);

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    console.error("[create-transaction] Unhandled error:", err);
    return errorResponse(500, message);
  }
});