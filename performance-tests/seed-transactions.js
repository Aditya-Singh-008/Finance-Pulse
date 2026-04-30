// ============================================================================
// performance-tests/seed-transactions.js
//
// Seeds 10k–50k transactions into your Supabase database for data scaling tests.
// Uses the service_role key to bypass RLS for bulk inserts.
//
// Prerequisites:
//   npm install @supabase/supabase-js
//
// Usage:
//   node seed-transactions.js --count 10000   # seed 10k rows
//   node seed-transactions.js --count 50000   # seed 50k rows
//   node seed-transactions.js --clear         # delete all seeded test rows
//
// The script inserts in batches of 500 to avoid Supabase request size limits.
// ============================================================================

import { createClient } from "@supabase/supabase-js";

// ⚠️  SERVICE ROLE KEY — never commit this, never expose to frontend!
// Get it from: Supabase Dashboard > Settings > API > service_role secret
const SUPABASE_URL          = "https://jrogpnnnnosuygqzkrol.supabase.co";
const SERVICE_ROLE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY || "PASTE_SERVICE_ROLE_KEY_HERE";

if (SERVICE_ROLE_KEY === "PASTE_SERVICE_ROLE_KEY_HERE") {
  console.error(`
❌  SERVICE_ROLE_KEY not set!

Get it from: Supabase Dashboard > Settings > API > service_role (secret)
Then run:
  $env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGci..."
  node seed-transactions.js --count 10000
`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Parse CLI args ──────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const shouldClear = args.includes("--clear");
const countArg   = args.find((a) => a.startsWith("--count=") || args[args.indexOf("--count") + 1]);
const TARGET     = parseInt(
  args.find((_, i) => args[i - 1] === "--count") || "10000",
  10
);
const BATCH_SIZE = 500;

// ─── Fetch real users and categories ─────────────────────────────────────────
async function fetchSeeds() {
  const { data: users, error: ue } = await supabase
    .from("profiles")
    .select("id")
    .limit(20);
  if (ue) throw new Error(`Cannot fetch users: ${ue.message}`);
  if (!users?.length) throw new Error("No users found. Create some test accounts first.");

  const { data: categories, error: ce } = await supabase
    .from("categories")
    .select("id, type");
  if (ce) throw new Error(`Cannot fetch categories: ${ce.message}`);
  if (!categories?.length) throw new Error("No categories found. Run supabase/seed.sql first.");

  return { users, categories };
}

// ─── Generate random transaction ─────────────────────────────────────────────
function randomTransaction(users, categories) {
  const user       = users[Math.floor(Math.random() * users.length)];
  const category   = categories[Math.floor(Math.random() * categories.length)];
  const daysAgo    = Math.floor(Math.random() * 730); // up to 2 years back
  const date       = new Date(Date.now() - daysAgo * 86400000)
    .toISOString()
    .split("T")[0];
  const amount     = parseFloat((Math.random() * 9900 + 100).toFixed(2));

  return {
    user_id:     user.id,
    category_id: category.id,
    amount,
    type:        category.type,
    date,
    description: `[PERF-TEST] Seeded transaction ${Date.now()}`,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Clear mode
  if (shouldClear) {
    console.log("🗑️  Deleting all [PERF-TEST] transactions...");
    const { error, count } = await supabase
      .from("transactions")
      .delete()
      .like("description", "[PERF-TEST]%");
    if (error) {
      console.error("Delete failed:", error.message);
    } else {
      console.log(`✅  Deleted perf-test transactions.`);
    }
    return;
  }

  // Seed mode
  console.log(`\n🌱  Seeding ${TARGET.toLocaleString()} transactions...`);
  const { users, categories } = await fetchSeeds();

  console.log(`   Users available:      ${users.length}`);
  console.log(`   Categories available: ${categories.length}`);
  console.log(`   Batch size:           ${BATCH_SIZE}\n`);

  let inserted = 0;
  const startTime = Date.now();

  while (inserted < TARGET) {
    const batchCount = Math.min(BATCH_SIZE, TARGET - inserted);
    const batch = Array.from({ length: batchCount }, () =>
      randomTransaction(users, categories)
    );

    const { error } = await supabase.from("transactions").insert(batch);
    if (error) {
      console.error(`❌  Batch insert failed at row ${inserted}: ${error.message}`);
      process.exit(1);
    }

    inserted += batchCount;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const pct     = ((inserted / TARGET) * 100).toFixed(1);
    process.stdout.write(`\r   Progress: ${inserted.toLocaleString()} / ${TARGET.toLocaleString()} (${pct}%) — ${elapsed}s elapsed`);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n✅  Seeded ${inserted.toLocaleString()} transactions in ${totalTime}s`);
  console.log(`   Rate: ${(inserted / parseFloat(totalTime)).toFixed(0)} rows/second`);
  console.log(`\n📊  Now run the scaling test:`);
  console.log(`   k6 run --env DATA_SIZE=small --out json=results/scaling-small.json k6/scaling-test.js`);
}

main().catch((e) => {
  console.error("\n❌  Seeder failed:", e.message);
  process.exit(1);
});
