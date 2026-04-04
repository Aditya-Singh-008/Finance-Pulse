import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, apikey, x-client-info",
};

interface UpdateTransactionPayload {
  id: string;
  amount?: unknown;
  type?: unknown;
  category_id?: unknown;
  date?: unknown;
  description?: unknown;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validatePayload(body: UpdateTransactionPayload) {
  if (!body.id || !UUID_RE.test(body.id)) {
    return { ok: false, error: "Valid id is required." };
  }

  const updates: any = {};

  if (body.amount !== undefined) {
    const rawAmount = Number(body.amount);
    if (isNaN(rawAmount) || rawAmount <= 0) {
      return { ok: false, error: "amount must be a number greater than 0." };
    }
    updates.amount = parseFloat(rawAmount.toFixed(2));
  }

  if (body.type !== undefined) {
    if (body.type !== "income" && body.type !== "expense") {
      return { ok: false, error: 'type must be "income" or "expense".' };
    }
    updates.type = body.type;
  }

  if (body.category_id !== undefined) {
    if (typeof body.category_id !== "string" || !UUID_RE.test(body.category_id)) {
      return { ok: false, error: "category_id must be a valid UUID." };
    }
    updates.category_id = body.category_id;
  }

  if (body.date !== undefined) {
    if (typeof body.date !== "string" || !DATE_RE.test(body.date)) {
      return { ok: false, error: "date must be in YYYY-MM-DD format." };
    }
    updates.date = body.date;
  }

  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== "string") {
      return { ok: false, error: "description must be a string." };
    }
    updates.description = body.description?.trim() || null;
  }

  return { ok: true, data: updates };
}

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST" && req.method !== "PATCH") {
    return errorResponse(405, `Method ${req.method} not allowed.`);
  }

  try {
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
    if (authError || !user) return errorResponse(401, "Unauthorized.");

    // Verify account integrity (active vs inactive)
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single();

    if (profile?.status === "inactive") {
      return errorResponse(403, "Account is inactive. Please contact system administrator.");
    }

    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return errorResponse(400, "Invalid JSON.");
    }

    const validation = validatePayload(rawBody);
    if (!validation.ok) return errorResponse(422, validation.error!);

    // Ensure category matches type if both are provided
    if (validation.data.category_id || validation.data.type) {
      // We need current values to check consistency if only one is updated
      const { data: currentTx } = await supabase
        .from("transactions")
        .select("type, category_id")
        .eq("id", rawBody.id)
        .single();

      const finalType = validation.data.type || currentTx?.type;
      const finalCatId = validation.data.category_id || currentTx?.category_id;

      if (finalType && finalCatId) {
        const { data: category } = await supabase
          .from("categories")
          .select("type")
          .eq("id", finalCatId)
          .single();

        if (category && category.type !== finalType) {
          return errorResponse(422, `Category type mismatch.`);
        }
      }
    }

    const { data, error: updateError } = await supabase
      .from("transactions")
      .update(validation.data)
      .eq("id", rawBody.id)
      .select()
      .single();

    if (updateError) return errorResponse(500, updateError.message);

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  } catch (err) {
    return errorResponse(500, err instanceof Error ? err.message : "Internal Error");
  }
});
