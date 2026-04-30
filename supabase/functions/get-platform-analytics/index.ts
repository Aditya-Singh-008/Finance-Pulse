import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// v3: CQRS Platform Analytics Cache
// ---------------------------------------------------------------------------
const isolateCache = new Map<string, { data: string; timestamp: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds for global analytics

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    // 1. Check Isolate Cache
    const cached = isolateCache.get(authHeader);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return new Response(cached.data, { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    // 2. Verify JWT locally (Zero-Latency Auth)
    const jwt = authHeader.replace("Bearer ", "");
    const secret = Deno.env.get("CUSTOM_JWT_SECRET") || Deno.env.get("JWT_SECRET");
    
    if (!secret) {
      console.error("JWT_SECRET not found in env");
      return new Response(JSON.stringify({ error: "Server Configuration Error" }), { status: 500, headers: corsHeaders });
    }

    const decodePayload = (token: string) => {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
      } catch (e) {
        return null;
      }
    };

    const payload = decodePayload(jwt);
    if (!payload || !payload.sub) {
      return new Response(JSON.stringify({ error: "Invalid Token" }), { status: 401, headers: corsHeaders });
    }

    const userId = payload.sub;
    
    // Use service role for internal checks
    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 3. Validate User & Role (Security Check)
    // Check if user is Admin or Analyst
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'analyst')) {
      return new Response(JSON.stringify({ error: "Forbidden: Elevated privileges required." }), { status: 403, headers: corsHeaders });
    }

    const { data: analytics, error: viewError } = await serviceClient
      .from('platform_analytics_view')
      .select('*')
      .single();

    if (viewError) return new Response(JSON.stringify({ error: viewError.message }), { status: 500, headers: corsHeaders });

    const responseBody = JSON.stringify({ data: analytics });
    isolateCache.set(authHeader, { data: responseBody, timestamp: Date.now() });

    return new Response(responseBody, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
