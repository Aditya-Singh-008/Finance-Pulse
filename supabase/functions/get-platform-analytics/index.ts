import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[get-platform-analytics] Missing Authorization header.");
      return new Response(JSON.stringify({ error: "Identity token required (Missing Header)." }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const authClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      console.error("[get-platform-analytics] Auth Error:", authError?.message || "User not found");
      return new Response(JSON.stringify({ error: `Unauthorized session: ${authError?.message || 'User not found'}` }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { data: profile } = await authClient
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "analyst")) {
      return new Response(JSON.stringify({ error: "Forbidden: Administrative clearance required." }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (profile.status === "inactive") {
      return new Response(JSON.stringify({ error: "Account is inactive. Access denied." }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Privilege Escalation: Use Service Role only for the data aggregation phase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Get total platform users
    const { count: totalUsers, error: userError } = await supabaseClient
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (userError) throw userError;

    // 2. Get all transactions with category names for aggregation
    // We join with the 'categories' table to get the name
    const { data: transactions, error: txError } = await supabaseClient
      .from("transactions")
      .select("amount, type, date, categories(name)");

    if (txError) throw txError;

    // 3. Aggregate metrics, categorical breakdown, and daily trends
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Filter transactions for trends explicitly (though analytics usually shows all)
    // For premium feel, we'll provide trends for the last 30 days
    let totalVolume = 0;
    let totalIncome = 0;
    let totalExpenses = 0;
    const breakdownMap: Record<string, number> = {};
    const trendsMap: Record<string, { date: string; income: number; expense: number }> = {};

    transactions?.forEach((tx: any) => {
      const amount = Number(tx.amount);
      const categoryName = tx.categories?.name || "Uncategorized";
      const dateStr = tx.date; // already in YYYY-MM-DD or ISO

      totalVolume += amount;
      if (tx.type === "income") {
        totalIncome += amount;
      } else if (tx.type === "expense") {
        totalExpenses += amount;
      }

      // Categorical breakdown
      if (!breakdownMap[categoryName]) breakdownMap[categoryName] = 0;
      breakdownMap[categoryName] += amount;

      // Daily Trends (last 30 days)
      if (dateStr >= thirtyDaysAgoStr) {
          const simpleDate = dateStr.split('T')[0];
          if (!trendsMap[simpleDate]) {
              trendsMap[simpleDate] = { date: simpleDate, income: 0, expense: 0 };
          }
          if (tx.type === 'income') trendsMap[simpleDate].income += amount;
          if (tx.type === 'expense') trendsMap[simpleDate].expense += amount;
      }
    });

    // Convert breakdown map to array format for Recharts
    const category_breakdown = Object.entries(breakdownMap).map(([name, value]) => ({
      name,
      value
    }));

    // Convert trends map to sorted array
    const daily_trends = Object.values(trendsMap).sort((a, b) => a.date.localeCompare(b.date));

    // Construct the final response payload with strict 2-decimal precision
    const data = {
      total_platform_users: totalUsers || 0,
      total_transaction_volume: parseFloat(totalVolume.toFixed(2)),
      platform_total_income: parseFloat(totalIncome.toFixed(2)),
      platform_total_expenses: parseFloat(totalExpenses.toFixed(2)),
      total_transaction_count: transactions?.length || 0,
      category_breakdown,
      daily_trends: daily_trends.map(t => ({
          ...t,
          income: parseFloat(t.income.toFixed(2)),
          expense: parseFloat(t.expense.toFixed(2))
      }))
    };

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
