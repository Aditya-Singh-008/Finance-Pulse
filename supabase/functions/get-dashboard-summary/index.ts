import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// CORS Headers — allows any origin during development.
// In production, replace '*' with your hosted frontend URL.
// ---------------------------------------------------------------------------
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  total: number;
}

interface DashboardSummary {
  user_id: string;
  user_name: string; // New field for personalization
  total_income: number;
  total_expenses: number;
  net_balance: number;
  category_breakdown: CategoryBreakdown[];
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS pre-flight request
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // ------------------------------------------------------------------
    // 1. Bootstrap Supabase client — using the CALLER's JWT so that RLS
    //    is automatically enforced for non-admin users.
    // ------------------------------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(401, "Missing Authorization header.", CORS_HEADERS);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    // ------------------------------------------------------------------
    // 2. Resolve the effective user_id.
    //    - Admins may optionally pass ?user_id=<uuid> to inspect any user.
    //    - Everyone else always gets their own uid() from the JWT.
    // ------------------------------------------------------------------
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(
        401,
        authError?.message === "invalid jwt token"
          ? "Unauthenticated: Please log in to your account."
          : "Your session has expired. Please sign in again.",
        CORS_HEADERS
      );
    }

    // Fetch the caller's role via the security-definer helper we created in Phase 1.2.
    const { data: roleRow, error: roleError } = await supabase
      .rpc("get_user_role");

    if (roleError) {
      return errorResponse(500, `Failed to resolve user role: ${roleError.message}`, CORS_HEADERS);
    }

    const callerRole: string = roleRow ?? "viewer";

    // Parse optional ?user_id query param
    const url = new URL(req.url);
    const requestedUserId = url.searchParams.get("user_id");

    // Admins can query any user; analysts/viewers can only see themselves.
    let effectiveUserId: string;
    if (requestedUserId && callerRole === "admin") {
      effectiveUserId = requestedUserId;
    } else {
      effectiveUserId = user.id;
    }

    // ──────────────────────────────────────────────────────────────────
    // 2.5 Fetch the caller's integrity status and display name.
    // ──────────────────────────────────────────────────────────────────
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("full_name, status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileRow?.status === "inactive") {
      return errorResponse(403, "Account is inactive. Please contact system administrator.", CORS_HEADERS);
    }

    const displayName = profileRow?.full_name ?? user?.user_metadata?.full_name ?? "User";

    // ------------------------------------------------------------------
    // 3. Aggregate income and expenses in a single pass.
    //    RLS ensures the query only returns rows the caller is allowed to read.
    // ------------------------------------------------------------------
    const { data: aggregates, error: aggError } = await supabase
      .from("transactions")
      .select("type, amount")
      .eq("user_id", effectiveUserId);

    if (aggError) {
      return errorResponse(500, `Failed to fetch transactions: ${aggError.message}`, CORS_HEADERS);
    }

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const tx of aggregates ?? []) {
      if (tx.type === "income") {
        totalIncome += Number(tx.amount);
      } else if (tx.type === "expense") {
        totalExpenses += Number(tx.amount);
      }
    }

    // ------------------------------------------------------------------
    // 4. Group expenses by category for the chart breakdown.
    //    We join categories to get a human-readable name.
    // ------------------------------------------------------------------
    const { data: expenseTxns, error: expenseError } = await supabase
      .from("transactions")
      .select("amount, category_id, categories(name)")
      .eq("user_id", effectiveUserId)
      .eq("type", "expense");

    if (expenseError) {
      return errorResponse(500, `Failed to fetch expense breakdown: ${expenseError.message}`, CORS_HEADERS);
    }

    // Accumulate totals per category
    const categoryMap = new Map<string, { name: string; total: number }>();

    for (const tx of expenseTxns ?? []) {
      const existing = categoryMap.get(tx.category_id);
      const categoryName =
        (tx.categories as { name: string } | null)?.name ?? "Unknown";
      const amount = Number(tx.amount);

      if (existing) {
        existing.total += amount;
      } else {
        categoryMap.set(tx.category_id, { name: categoryName, total: amount });
      }
    }

    const categoryBreakdown: CategoryBreakdown[] = Array.from(
      categoryMap.entries()
    ).map(([category_id, { name, total }]) => ({
      category_id,
      category_name: name,
      total: parseFloat(total.toFixed(2)),
    }));

    // Sort descending by spend amount — useful for charts
    categoryBreakdown.sort((a, b) => b.total - a.total);

    // ------------------------------------------------------------------
    // 5. Build and return the response
    // ------------------------------------------------------------------
    const summary: DashboardSummary = {
      user_id: effectiveUserId,
      user_name: displayName,
      total_income: parseFloat(totalIncome.toFixed(2)),
      total_expenses: parseFloat(totalExpenses.toFixed(2)),
      net_balance: parseFloat((totalIncome - totalExpenses).toFixed(2)),
      category_breakdown: categoryBreakdown,
    };

    return new Response(JSON.stringify({ data: summary }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return errorResponse(500, message, CORS_HEADERS);
  }
});

// ---------------------------------------------------------------------------
// Utility: Standardised error response
// ---------------------------------------------------------------------------
function errorResponse(
  status: number,
  message: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
