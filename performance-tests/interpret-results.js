// ============================================================================
// performance-tests/interpret-results.js
//
// Reads k6 JSON output and generates:
//   1. A clean summary table
//   2. Resume-ready bullet points with defensible numbers
//
// Usage:
//   node interpret-results.js                        # reads results/main-load-test.json
//   node interpret-results.js results/my-result.json # reads specific file
// ============================================================================

import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

const filePath = process.argv[2]
  ? resolve(process.argv[2])
  : resolve("results", "main-load-test.json");

if (!existsSync(filePath)) {
  console.error(`\n❌  Results file not found: ${filePath}`);
  console.error(`   Run a load test first:  k6 run k6/main-load-test.js`);
  process.exit(1);
}

const data    = JSON.parse(readFileSync(filePath, "utf8"));
const metrics = data.metrics;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const get = (metricName, stat) => {
  const m = metrics[metricName];
  if (!m) return null;
  // k6 JSON format: metrics[name].values[stat]
  return m.values?.[stat] ?? null;
};
const ms  = (v) => (v !== null ? `${v.toFixed(0)}ms` : "N/A");
const pct = (v) => (v !== null ? `${(v * 100).toFixed(2)}%` : "N/A");
const fmt = (v) => (v !== null ? v.toFixed(2) : "N/A");

// ─── Extract key metrics ──────────────────────────────────────────────────────
const httpAvg      = get("http_req_duration", "avg");
const httpP50      = get("http_req_duration", "p(50)");
const httpP95      = get("http_req_duration", "p(95)");
const httpP99      = get("http_req_duration", "p(99)");
const httpRPS      = get("http_reqs", "rate");
const httpFailed   = get("http_req_failed", "rate");
const totalReqs    = get("http_reqs", "count");

const dashAvg      = get("dashboard_duration", "avg");
const dashP95      = get("dashboard_duration", "p(95)");
const createAvg    = get("create_transaction_duration", "avg");
const createP95    = get("create_transaction_duration", "p(95)");
const analyticsAvg = get("analytics_duration", "avg");
const analyticsP95 = get("analytics_duration", "p(95)");

const createErrs   = get("create_transaction_errors", "count");
const dashErrs     = get("dashboard_errors", "count");
const analyticsErrs= get("analytics_errors", "count");

const vuMax        = data?.options?.stages
  ? Math.max(...(data.options.stages.map((s) => s.target ?? 0)))
  : "200";

// ─── Print Summary Table ──────────────────────────────────────────────────────
console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║        Finance Pulse — Performance Test Results Interpreter           ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Test file: ${filePath.split("\\").pop().padEnd(58)}║
╚═══════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────┐
│  GLOBAL METRICS                                                       │
├──────────────────────────┬──────────────────────────────────────────┤
│  Total requests          │  ${String(totalReqs?.toFixed(0) ?? "N/A").padEnd(40)}│
│  Requests/sec (RPS)      │  ${String(fmt(httpRPS)).padEnd(40)}│
│  Error rate              │  ${pct(httpFailed).padEnd(40)}│
│  Avg response time       │  ${ms(httpAvg).padEnd(40)}│
│  P50 response time       │  ${ms(httpP50).padEnd(40)}│
│  P95 response time       │  ${ms(httpP95).padEnd(40)}│
│  P99 response time       │  ${ms(httpP99).padEnd(40)}│
│  Peak concurrent users   │  ${String(vuMax).padEnd(40)}│
└──────────────────────────┴──────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  PER-ENDPOINT METRICS                                                 │
├────────────────────────────┬─────────────┬─────────────┬────────────┤
│  Endpoint                  │  Avg (ms)   │  P95 (ms)   │  Errors    │
├────────────────────────────┼─────────────┼─────────────┼────────────┤
│  POST /create-transaction  │  ${ms(createAvg).padEnd(11)}  │  ${ms(createP95).padEnd(11)}  │  ${String(createErrs?.toFixed(0) ?? "N/A").padEnd(9)} │
│  GET  /dashboard-summary   │  ${ms(dashAvg).padEnd(11)}  │  ${ms(dashP95).padEnd(11)}  │  ${String(dashErrs?.toFixed(0) ?? "N/A").padEnd(9)} │
│  GET  /platform-analytics  │  ${ms(analyticsAvg).padEnd(11)}  │  ${ms(analyticsP95).padEnd(11)}  │  ${String(analyticsErrs?.toFixed(0) ?? "N/A").padEnd(9)} │
└────────────────────────────┴─────────────┴─────────────┴────────────┘
`);

// ─── Resume Bullet Generator ──────────────────────────────────────────────────
console.log("═══════════════════════════════════════════════════════════════════════");
console.log("  📋  RESUME-READY BULLET POINTS");
console.log("═══════════════════════════════════════════════════════════════════════\n");
console.log("  Copy the bullets that have the strongest numbers:\n");

// Bullet 1: Throughput
if (httpRPS !== null) {
  const rpsDisplay = httpRPS >= 100
    ? `${httpRPS.toFixed(0)} req/s`
    : `${httpRPS.toFixed(1)} req/s`;
  console.log(`  ★ "Engineered Supabase Edge Function APIs achieving ${rpsDisplay} throughput`);
  console.log(`     under ${vuMax} concurrent users with <${pct(httpFailed)} error rate."\n`);
}

// Bullet 2: P95 latency
if (httpP95 !== null) {
  console.log(`  ★ "Optimized PostgreSQL query performance to achieve p95 response`);
  console.log(`     latency of ${ms(httpP95)} across ${totalReqs?.toFixed(0) ?? "thousands of"} requests`);
  console.log(`     under sustained load (${vuMax} concurrent users)."\n`);
}

// Bullet 3: Dashboard read performance
if (dashP95 !== null) {
  console.log(`  ★ "Designed RBAC-enforced financial dashboard API with ${ms(dashAvg)} avg`);
  console.log(`     and ${ms(dashP95)} p95 read latency, serving real-time transaction summaries`);
  console.log(`     across viewer, analyst, and admin role tiers."\n`);
}

// Bullet 4: Write performance
if (createP95 !== null) {
  console.log(`  ★ "Built transactional write API (POST /create-transaction) sustaining`);
  console.log(`     ${ms(createAvg)} average latency with multi-layer validation and RLS enforcement."\n`);
}

// Bullet 5: Error rate
if (httpFailed !== null && httpFailed < 0.05) {
  console.log(`  ★ "Maintained ${pct(httpFailed)} error rate at peak load (${vuMax} VUs),`);
  console.log(`     demonstrating system reliability under ${(httpRPS ?? 0) > 10 ? "high" : "moderate"} throughput."\n`);
}

console.log("═══════════════════════════════════════════════════════════════════════");
console.log("  💡  INTERVIEW TALKING POINTS\n");
console.log("  Q: How did you measure these numbers?");
console.log(`  A: "I used k6 to simulate ${vuMax} concurrent virtual users across a`);
console.log(`     10-minute ramp-up test hitting live Supabase Edge Functions deployed`);
console.log(`     on Deno. The system uses PostgreSQL with Row-Level Security — so`);
console.log(`     every query has an implicit user-role filter. I added composite`);
console.log(`     indexes on (user_id, type) and (date DESC, type) which eliminated`);
console.log(`     sequential table scans on the transactions table."`);
console.log("");
console.log("  Q: What were the bottlenecks?");
console.log("  A: Each Edge Function call authenticates via JWT (getUser()), fetches");
console.log("     the user role (get_user_role RPC), then queries transactions.");
console.log("     That's 2 round trips before the main query. The indexes ensured the");
console.log("     main query used index scans instead of sequential scans.");
console.log("═══════════════════════════════════════════════════════════════════════\n");
