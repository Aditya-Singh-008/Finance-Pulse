// ============================================================================
// performance-tests/k6/config.js
// Shared configuration for all Finance Pulse k6 load tests.
//
// HOW TO POPULATE TOKENS:
//   Run `node get-tokens.js` (see performance-tests/get-tokens.js) and paste
//   the JWT access_token values below, OR set env vars before running k6:
//
//   $env:VIEWER_TOKEN  = "eyJhbGci..."
//   $env:ANALYST_TOKEN = "eyJhbGci..."
//   $env:ADMIN_TOKEN   = "eyJhbGci..."
//
//   Then run:  k6 run --env VIEWER_TOKEN=$env:VIEWER_TOKEN ... main-load-test.js
// ============================================================================

export const BASE_URL =
  __ENV.BASE_URL || "https://jrogpnnnnosuygqzkrol.supabase.co/functions/v1";

export const ANON_KEY = __ENV.ANON_KEY || "";

// ─── Paste your JWT tokens here (or use env vars) ───────────────────────────
// Tokens expire! Re-run get-tokens.js if you get 401 errors.
export const TOKENS = {
  viewer:  __ENV.VIEWER_TOKEN  || "",
  analyst: __ENV.ANALYST_TOKEN || "",
  admin:   __ENV.ADMIN_TOKEN   || "",
};


// A valid category_id from your DB (run `node get-tokens.js` to print them)
// Or paste manually from: supabase -> Table Editor -> categories
export const CATEGORY_IDS = {
  income: "dd9cda6a-6f9a-4fa3-a3f3-5b168565d55f",
  expense: "0c4e6d0c-4c81-4557-98ca-a30f2f9fbb64",
};

// ─── Standard headers factory ─────────────────────────────────────────────────
export function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    apikey: ANON_KEY,
    "Content-Type": "application/json",
  };
}
