import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// CORS Headers
// Allow the Vite dev server and any future production origin.
// In production, replace '*' with your exact frontend URL.
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

/** Mirrors the `transaction_type` enum defined in the Supabase DB schema. */
type TransactionType = "income" | "expense";

/** The shape of the JSON body the client must POST to this function. */
interface CreateTransactionPayload {
  amount: unknown;
  type: unknown;
  category_id: unknown;
  date: unknown;
  description?: unknown;
  target_user_id?: unknown; // Optional: Allows admins to insert for others
}

/** Shape returned to the client on success. */
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
// (Pure functions — no Zod required in Deno's edge runtime)
// ---------------------------------------------------------------------------

/** UUID v4 regex. Used to validate category_id. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** ISO date string YYYY-MM-DD regex. */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates the raw parsed body and returns either a clean typed payload or
 * a human-readable error string.
 *
 * Rules mirror the DB constraints exactly so the client gets a clear message
 * BEFORE hitting the database layer:
 *  • amount  : number, > 0, at most 2 decimal places
 *  • type    : exactly "income" or "expense"
 *  • category_id : valid UUIDv4 string
 *  • date    : YYYY-MM-DD, not in the future
 *  • description : optional string, max 500 chars
 */
function validatePayload(
  body: CreateTransactionPayload
): { ok: true; data: Required<Omit<CreateTransactionPayload, "description" | "target_user_id">> & { description: string | null; target_user_id: string | null } }
  | { ok: false; error: string } {

  // ── amount ────────────────────────────────────────────────────────────────
  const rawAmount = Number(body.amount);
  if (body.amount === undefined || body.amount === null || body.amount === "") {
    return { ok: false, error: "amount is required." };
  }
  if (isNaN(rawAmount)) {
    return { ok: false, error: "amount must be a number." };
  }
  if (rawAmount <= 0) {
    return { ok: false, error: "amount must be greater than 0." };
  }
  // Enforce 2 decimal places max — mirrors the NUMERIC DB type precision
  if (parseFloat(rawAmount.toFixed(2)) !== rawAmount && String(body.amount).split(".")[1]?.length > 2) {
    return { ok: false, error: "amount may have at most 2 decimal places." };
  }

  // ── type ──────────────────────────────────────────────────────────────────
  if (body.type !== "income" && body.type !== "expense") {
    return {
      ok: false,
      error: `type must be "income" or "expense", got "${body.type}".`,
    };
  }

  // ── category_id ───────────────────────────────────────────────────────────
  if (typeof body.category_id !== "string" || !UUID_RE.test(body.category_id)) {
    return { ok: false, error: "category_id must be a valid UUID." };
  }

  // ── date ──────────────────────────────────────────────────────────────────
  if (typeof body.date !== "string" || !DATE_RE.test(body.date)) {
    return { ok: false, error: "date must be a string in YYYY-MM-DD format." };
  }
  const parsedDate = new Date(body.date);
  if (isNaN(parsedDate.getTime())) {
    return { ok: false, error: "date is not a valid calendar date." };
  }
  // Reject future dates — transactions must be in the past or today
  const todayUTC = new Date();
  todayUTC.setUTCHours(23, 59, 59, 999);
  if (parsedDate > todayUTC) {
    return { ok: false, error: "date cannot be in the future." };
  }

  // ── description (optional) ────────────────────────────────────────────────
  let description: string | null = null;
  if (body.description !== undefined && body.description !== null && body.description !== "") {
    if (typeof body.description !== "string") {
      return { ok: false, error: "description must be a string." };
    }
    if (body.description.length > 500) {
      return { ok: false, error: "description must be 500 characters or fewer." };
    }
    description = body.description.trim();
  }

  // ── target_user_id (optional) ─────────────────────────────────────────────
  let target_user_id: string | null = null;
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
      target_user_id,
    },
  };
}

// ---------------------------------------------------------------------------
// Utility: Standardised error + success responses
// ---------------------------------------------------------------------------

function errorResponse(
  status: number,
  message: string,
): Response {
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

  // ── CORS pre-flight ───────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // ── Method guard — this endpoint only accepts POST ────────────────────────
  if (req.method !== "POST") {
    return errorResponse(405, `Method ${req.method} not allowed. Use POST.`);
  }

  try {
    // ────────────────────────────────────────────────────────────────────────
    // STEP 1 — Authenticate the caller
    //
    // We bootstrap the Supabase client with the caller's JWT (forwarded from
    // the Authorization header). This means ALL queries below run with the
    // caller's RLS context — the DB enforces row-level access automatically.
    // ────────────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(401, "Missing Authorization header. Please sign in.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    // Verify the JWT and extract the user identity — live round-trip,
    // not a local decode, so revoked tokens are correctly rejected.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(
        401,
        authError?.message?.includes("invalid jwt")
          ? "Unauthenticated: please sign in again."
          : "Session expired. Please sign in again."
      );
    }

    // ────────────────────────────────────────────────────────────────────────
    // STEP 2 — Parse request body
    //
    // We wrap JSON.parse in a try/catch because a malformed body (e.g. empty
    // body, truncated JSON) would otherwise throw an unhandled exception.
    // ────────────────────────────────────────────────────────────────────────
    let rawBody: Record<string, unknown>;
    try {
      rawBody = await req.json();
    } catch {
      return errorResponse(400, "Request body must be valid JSON.");
    }

    // ────────────────────────────────────────────────────────────────────────
    // STEP 3 — Validate the payload fields
    //
    // All rules mirror the DB constraints so we short-circuit before hitting
    // the database and return a user-friendly error message.
    // ────────────────────────────────────────────────────────────────────────
    const validation = validatePayload(rawBody as CreateTransactionPayload);
    if (!validation.ok) {
      return errorResponse(422, `Validation error: ${validation.error}`);
    }
    const { amount, type, category_id, date, description, target_user_id } = validation.data;

    // ────────────────────────────────────────────────────────────────────────
    // STEP 4 — Check Caller's Role & Assign Target User
    //
    // If target_user_id is provided, we MUST verify the caller is an 'admin'.
    // We query the profiles table directly using the caller's JWT client.
    // ────────────────────────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'viewer';
    let userIdToUse = user.id; // Default to self

    if (target_user_id) {
      if (userRole === 'admin') {
        userIdToUse = target_user_id;
      } else {
        return errorResponse(403, "Forbidden: Only admins can insert transactions for other users.");
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // STEP 5 — Verify the category_id exists and matches the transaction type
    //
    // Without this check, a user could POST category_id for an "income"
    // category on an "expense" transaction (or supply a random UUID), and the
    // DB would silently accept it if the FK constraint alone is the guard.
    // We enforce semantic consistency here at the application layer.
    // ────────────────────────────────────────────────────────────────────────
    const { data: category, error: catError } = await supabase
      .from("categories")
      .select("id, type")
      .eq("id", category_id)
      .maybeSingle();

    if (catError) {
      return errorResponse(500, `Failed to verify category: ${catError.message}`);
    }

    if (!category) {
      return errorResponse(422, `category_id "${category_id}" does not exist.`);
    }

    if (category.type !== type) {
      return errorResponse(
        422,
        `Category type mismatch: category is "${category.type}" but transaction type is "${type}".`
      );
    }

    // ────────────────────────────────────────────────────────────────────────
    // STEP 5 — Insert the transaction
    //
    // `user_id` is set to the authenticated user's ID from the verified JWT.
    // We never trust any `user_id` field the client might send in the body —
    // the server always derives it from the auth context. This prevents users
    // from inserting rows on behalf of other users.
    //
    // The RLS INSERT policy also enforces `user_id = auth.uid()`, so even if
    // a bug slipped through here, the DB would reject a mismatched user_id.
    // ────────────────────────────────────────────────────────────────────────
    const { data: inserted, error: insertError } = await supabase
      .from("transactions")
      .insert([
        {
          user_id: userIdToUse,   // Uses either caller's ID or target ID (if admin override)
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
      // Surface the DB error message — it's useful for debugging (e.g. FK
      // violation, CHECK constraint failure) without exposing internals.
      console.error("[create-transaction] DB insert error:", insertError);
      return errorResponse(500, `Failed to create transaction: ${insertError.message}`);
    }

    // ────────────────────────────────────────────────────────────────────────
    // STEP 6 — Return the created record
    //
    // HTTP 201 Created is the semantically correct status for a successful
    // resource creation. The full inserted row is returned so the client
    // can optimistically update local state without a separate fetch.
    // ────────────────────────────────────────────────────────────────────────
    console.info(
      `[create-transaction] OK — caller=${user.id} target=${userIdToUse} amount=${amount} type=${type} category=${category_id}`
    );

    return successResponse(inserted as CreatedTransaction);

  } catch (err) {
    // Top-level catch for truly unexpected errors (network glitch, Deno API
    // failure, etc.). We log the full error server-side for debugging but
    // return only a generic message to the client.
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    console.error("[create-transaction] Unhandled error:", err);
    return errorResponse(500, message);
  }
});
