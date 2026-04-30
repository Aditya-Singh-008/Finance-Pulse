// ============================================================================
// performance-tests/get-tokens.js
//
// Helper script to obtain JWT access tokens for each test user role.
// Run ONCE before your load tests to get fresh tokens.
//
// Prerequisites:
//   node get-tokens.js
//
// What this does:
//   1. Reads credentials from test-users.json (create this file first — see below)
//   2. Signs in each user via Supabase Auth REST API
//   3. Prints the access_token and sets env var instructions
//   4. Also fetches category IDs for use in config.js
//
// Create test-users.json:
//   {
//     "viewer":  { "email": "viewer@test.com",  "password": "YourPassword1!" },
//     "analyst": { "email": "analyst@test.com", "password": "YourPassword1!" },
//     "admin":   { "email": "admin@test.com",   "password": "YourPassword1!" }
//   }
//
// IMPORTANT: Add test-users.json to .gitignore!
// ============================================================================

import { readFileSync } from "fs";
import { URL } from "url";

const SUPABASE_URL  = "https://jrogpnnnnosuygqzkrol.supabase.co";
const ANON_KEY      =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyb2dwbm5ubm9zdXlncXprcm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDUzOTMsImV4cCI6MjA5MDYyMTM5M30.mbPfjaKSFC00Nb3RfVxR2flOW29sz47Anrk6us0z3ks";

async function signIn(email, password) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method:  "POST",
      headers: {
        apikey:         ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sign-in failed for ${email}: ${err}`);
  }
  return res.json();
}

async function fetchCategories(accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/categories?select=id,name,type`, {
    headers: {
      apikey:         ANON_KEY,
      Authorization:  `Bearer ${accessToken}`,
    },
  });
  return res.json();
}

async function main() {
  let users;
  try {
    users = JSON.parse(readFileSync("./test-users.json", "utf8"));
  } catch {
    console.error(`
❌  File "test-users.json" not found!

Create it in the performance-tests/ directory:
{
  "viewer":  { "email": "viewer@test.com",  "password": "YourStrongPassword1!" },
  "analyst": { "email": "analyst@test.com", "password": "YourStrongPassword1!" },
  "admin":   { "email": "admin@test.com",   "password": "YourStrongPassword1!" }
}

Make sure these users exist in your Supabase Auth and have the correct roles
set in the profiles table.
`);
    process.exit(1);
  }

  console.log("🔐  Fetching JWT tokens from Supabase Auth...\n");

  const tokens = {};
  for (const [role, { email, password }] of Object.entries(users)) {
    try {
      const data = await signIn(email, password);
      tokens[role] = data.access_token;
      // Token expires in 1 hour by default
      const expiresAt = new Date(Date.now() + data.expires_in * 1000).toLocaleTimeString();
      console.log(`✅  ${role.padEnd(8)} — token obtained (expires ~${expiresAt})`);
    } catch (e) {
      console.error(`❌  ${role}: ${e.message}`);
    }
  }

  // Fetch categories using admin token
  let categories = [];
  if (tokens.admin) {
    try {
      categories = await fetchCategories(tokens.admin);
    } catch (e) {
      console.warn("⚠️  Could not fetch categories:", e.message);
    }
  }

  const incomeCategories  = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  console.log("\n─────────────────────────────────────────────────────────");
  console.log("📋  COPY THESE INTO k6/config.js (or set as env vars)\n");

  console.log(`export const TOKENS = {`);
  for (const [role, token] of Object.entries(tokens)) {
    console.log(`  ${role}: "${token}",`);
  }
  console.log(`};\n`);

  if (incomeCategories.length > 0) {
    console.log(`export const CATEGORY_IDS = {`);
    console.log(`  income:  "${incomeCategories[0].id}",  // ${incomeCategories[0].name}`);
    console.log(`  expense: "${expenseCategories[0]?.id || "NO_EXPENSE_CATEGORIES_FOUND"}",  // ${expenseCategories[0]?.name || ""}`);
    console.log(`};\n`);
  } else {
    console.log("⚠️  No categories found. Run seed.sql first via Supabase SQL editor.");
  }

  console.log("─── OR set PowerShell env vars: ───────────────────────");
  for (const [role, token] of Object.entries(tokens)) {
    console.log(`$env:${role.toUpperCase()}_TOKEN = "${token}"`);
  }
  if (incomeCategories.length > 0) {
    console.log(`$env:INCOME_CATEGORY_ID  = "${incomeCategories[0].id}"`);
    console.log(`$env:EXPENSE_CATEGORY_ID = "${expenseCategories[0]?.id || ""}"`);
  }

  console.log("\n─────────────────────────────────────────────────────────");
  console.log("⚡  All categories in your database:");
  categories.forEach((c) =>
    console.log(`   [${c.type.padEnd(7)}] ${c.name.padEnd(25)} id=${c.id}`)
  );
}

main();
