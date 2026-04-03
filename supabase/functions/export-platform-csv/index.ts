import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Authenticate user via the provided JWT
    // We use a temporary client with the user's token to verify identity
    const authClient = createClient(
      supabaseUrl, 
      Deno.env.get("SUPABASE_ANON_KEY")!, 
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );
    
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Initialize God-Mode client with Service Role Key to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Verify user's role in the profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || !["admin", "analyst"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Forbidden: Administrative access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Fetch all transactions from the entire platform
    // We join the categories table to get the human-readable name
    const { data: transactions, error: txError } = await supabaseAdmin
      .from("transactions")
      .select(`
        date,
        type,
        amount,
        description,
        user_id,
        categories(name)
      `)
      .order("date", { ascending: false });

    if (txError) throw txError;

    // 5. Build CSV String
    const headers = ["Date", "Type", "Category", "Amount", "Description", "User ID"];
    
    const rows = (transactions || []).map((tx: any) => {
      // Clean description to prevent CSV injection or breaking format
      const cleanDescription = (tx.description || "").replace(/"/g, '""');
      
      return [
        tx.date,
        tx.type.toUpperCase(),
        tx.categories?.name || "Uncategorized",
        tx.amount,
        `"${cleanDescription}"`,
        tx.user_id,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    // 6. Return response with correct headers for browser download
    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="finance-pulse-platform-export.csv"',
      },
      status: 200,
    });

  } catch (error: any) {
    console.error("Export Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
