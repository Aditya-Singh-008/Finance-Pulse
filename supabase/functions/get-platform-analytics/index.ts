import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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
      .select("amount, type, categories(name)");

    if (txError) throw txError;

    // 3. Aggregate metrics and categorical breakdown
    let totalVolume = 0;
    let totalIncome = 0;
    let totalExpenses = 0;
    const breakdownMap: Record<string, number> = {};

    transactions?.forEach((tx: any) => {
      const amount = Number(tx.amount);
      const categoryName = tx.categories?.name || "Uncategorized";

      totalVolume += amount;
      if (tx.type === "income") {
        totalIncome += amount;
      } else if (tx.type === "expense") {
        totalExpenses += amount;
      }

      // Group by category name
      if (!breakdownMap[categoryName]) {
        breakdownMap[categoryName] = 0;
      }
      breakdownMap[categoryName] += amount;
    });

    // Convert breakdown map to array format for Recharts
    const category_breakdown = Object.entries(breakdownMap).map(([name, value]) => ({
      name,
      value
    }));

    // Construct the final response payload
    const data = {
      total_platform_users: totalUsers || 0,
      total_transaction_volume: totalVolume,
      platform_total_income: totalIncome,
      platform_total_expenses: totalExpenses,
      total_transaction_count: transactions?.length || 0,
      category_breakdown
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
