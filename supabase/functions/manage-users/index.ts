import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info, Prefer, content-range",
};

/**
 * manage-users Edge Function
 * Provides an administrative API for user management:
 * - GET: List all profiles (Admin only)
 * - PATCH: Update a user's role or status (Admin only)
 */

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "No auth header." }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Create client with caller's JWT to verify their identity/role
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Check if the caller is an admin by querying their profile
    const { data: callerProfile } = await userClient
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (callerProfile?.status === "inactive") {
      return new Response(JSON.stringify({ error: "Forbidden: Account is inactive." }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access only." }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 2. Create admin client with SERVICE_ROLE_KEY for privileged operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // --- Handle GET (List Users) ---
    if (req.method === "GET") {
      const { data: profiles, error: listError } = await adminClient
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (listError) throw listError;

      return new Response(JSON.stringify({ data: profiles }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // --- Handle PATCH/POST (Update User) ---
    if (req.method === "PATCH" || req.method === "POST") {
      let body: any = {};
      try {
        body = await req.json();
      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid or empty JSON body." }), { 
          status: 400, 
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" } 
        });
      }

      const { userId, role, status } = body;
      if (!userId) {
          return new Response(JSON.stringify({ error: "User ID is required in body." }), { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
      }

      const updates: any = {};
      if (role) updates.role = role;
      if (status) updates.status = status;

      if (Object.keys(updates).length === 0) {
          return new Response(JSON.stringify({ error: "No fields to update." }), { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
      }

      const { data: updated, error: patchError } = await adminClient
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();

      if (patchError) throw patchError;

      return new Response(JSON.stringify({ data: updated }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: CORS_HEADERS,
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
