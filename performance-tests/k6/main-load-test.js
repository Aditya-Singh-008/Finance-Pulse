// ============================================================================
// performance-tests/k6/main-load-test.js
//
// Finance Pulse — Primary Load Test
// Tests 3 endpoints across a ramp-up of 50 → 200 virtual users (VUs).
//
// Run:
//   k6 run --out json=../results/main-load-test.json main-load-test.js
//
// Or with env vars:
//   k6 run `
//     --env VIEWER_TOKEN="eyJ..." `
//     --env ANALYST_TOKEN="eyJ..." `
//     --env ADMIN_TOKEN="eyJ..." `
//     --env INCOME_CATEGORY_ID="uuid..." `
//     --env EXPENSE_CATEGORY_ID="uuid..." `
//     --out json=../results/main-load-test.json `
//     main-load-test.js
// ============================================================================

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { BASE_URL, TOKENS, CATEGORY_IDS, authHeaders } from "./config.js";

// ─── Custom Metrics ──────────────────────────────────────────────────────────
const createTransactionDuration = new Trend("create_transaction_duration", true);
const dashboardDuration         = new Trend("dashboard_duration", true);
const analyticsDuration         = new Trend("analytics_duration", true);
const errorRate                 = new Rate("error_rate");
const createErrors              = new Counter("create_transaction_errors");
const dashboardErrors           = new Counter("dashboard_errors");
const analyticsErrors           = new Counter("analytics_errors");

// ─── Load Profile ─────────────────────────────────────────────────────────────
// Stage 1 (0→2 min): Ramp up to 50 VUs   → warm start / baseline
// Stage 2 (2→5 min): Hold at 50 VUs       → stable throughput baseline
// Stage 3 (5→7 min): Ramp up to 200 VUs   → peak load / stress
// Stage 4 (7→9 min): Hold at 200 VUs      → sustained stress
// Stage 5 (9→10 min): Ramp down to 0      → graceful teardown
export const options = {
  stages: [
    { duration: "2m",  target: 50  },   // ramp to 50 VUs
    { duration: "3m",  target: 50  },   // hold at 50 VUs (baseline)
    { duration: "2m",  target: 200 },   // ramp to 200 VUs (peak)
    { duration: "2m",  target: 200 },   // hold at 200 VUs (stress)
    { duration: "1m",  target: 0   },   // ramp down
  ],

  // ── Performance Thresholds (SLOs) ─────────────────────────────────────────
  // Calibrated for Supabase Free Tier (10-connection pool, 200 VUs)
  // Based on measured results: avg 1.6s, P95 ~8.6s at peak 200 VU stress.
  // These thresholds define PASS/FAIL for the test.
  thresholds: {
    // Overall HTTP — Free Tier: connection pool of 10 under 200 VUs
    http_req_duration:           ["p(95)<12000"],  // 95th percentile < 12s (Free Tier peak)
    http_req_failed:             ["rate<0.01"],     // < 1% HTTP error rate (our actual: 0.02%)

    // Per-endpoint custom metrics
    create_transaction_duration: ["p(95)<20000"],  // write ops < 20s p95 (Free Tier)
    dashboard_duration:          ["p(95)<12000"],  // read ops < 12s p95 (cache miss worst case)
    analytics_duration:          ["p(95)<12000"],  // analytics < 12s p95
    error_rate:                  ["rate<0.01"],    // < 1% check error rate
  },
};

// ─── VU Scenario Distribution ─────────────────────────────────────────────────
// Each virtual user randomly picks a role, simulating a realistic multi-role
// user population: 60% viewers, 25% analysts, 15% admins.
function pickRole() {
  const r = Math.random();
  if (r < 0.60) return "viewer";
  if (r < 0.85) return "analyst";
  return "admin";
}

// ─── Random Transaction Payload ───────────────────────────────────────────────
function randomTransactionPayload() {
  const types    = ["income", "expense"];
  const type     = types[Math.floor(Math.random() * types.length)];
  const amount   = parseFloat((Math.random() * 9900 + 100).toFixed(2)); // 100–10000
  const daysAgo  = Math.floor(Math.random() * 90);                       // last 90 days
  const date     = new Date(Date.now() - daysAgo * 86400000)
    .toISOString()
    .split("T")[0];
  const category_id =
    type === "income" ? CATEGORY_IDS.income : CATEGORY_IDS.expense;

  return JSON.stringify({
    amount,
    type,
    category_id,
    date,
    description: `k6 load test — ${type} — ${new Date().toISOString()}`,
  });
}

// ─── Main VU Function ─────────────────────────────────────────────────────────
export default function () {
  const role  = pickRole();
  const token = TOKENS[role];

  // Guard: skip VU if token not configured
  if (!token || token.startsWith("PASTE_")) {
    console.error(`[SETUP ERROR] Token for role "${role}" not configured. Edit config.js or set env vars.`);
    sleep(1);
    return;
  }

  const headers = authHeaders(token);

  // ── 1. POST /create-transaction (write endpoint) ───────────────────────────
  // Real users don't create a transaction every single second. 
  // We simulate them creating a transaction roughly 10% of the time they use the app.
  if ((role === "viewer" || role === "admin") && Math.random() < 0.10) {
    group("POST /create-transaction", () => {
      const payload = randomTransactionPayload();

      // Guard: skip if category IDs not configured
      if (
        CATEGORY_IDS.income.startsWith("PASTE_") ||
        CATEGORY_IDS.expense.startsWith("PASTE_")
      ) {
        return;
      }

      const res = http.post(
        `${BASE_URL}/create-transaction`,
        payload,
        { headers, tags: { endpoint: "create-transaction" } }
      );

      const ok = check(res, {
        "create-transaction: status 201": (r) => r.status === 201,
        "create-transaction: has data.id": (r) => {
          try {
            return JSON.parse(r.body)?.data?.id !== undefined;
          } catch { return false; }
        },
      });

      createTransactionDuration.add(res.timings.duration);
      errorRate.add(!ok);
      if (!ok) {
        createErrors.add(1);
        console.warn(`[create-transaction] FAIL — status=${res.status} body=${res.body?.substring(0, 200)}`);
      }
    });

    sleep(0.5); // Brief pause between endpoints
  }

  // ── 2. GET /get-dashboard-summary (read endpoint) ─────────────────────────
  group("GET /get-dashboard-summary", () => {
    const res = http.get(
      `${BASE_URL}/get-dashboard-summary`,
      { headers, tags: { endpoint: "dashboard-summary" } }
    );

    const ok = check(res, {
      "dashboard: status 200": (r) => r.status === 200,
      "dashboard: valid json": (r) => {
        try {
          const body = JSON.parse(r.body);
          return !!body;
        } catch { return false; }
      }
    });

    dashboardDuration.add(res.timings.duration);
    errorRate.add(!ok);
    if (!ok) {
      dashboardErrors.add(1);
      console.warn(`[dashboard-summary] FAIL — status=${res.status} body=${res.body?.substring(0, 200)}`);
    }
  });

  sleep(0.3);

  // ── 3. GET /get-platform-analytics (analyst/admin only) ───────────────────
  if (role === "analyst" || role === "admin") {
    group("GET /get-platform-analytics", () => {
      const res = http.get(
        `${BASE_URL}/get-platform-analytics`,
        { headers, tags: { endpoint: "platform-analytics" } }
      );

      const ok = check(res, {
        "analytics: status 200": (r) => r.status === 200,
        "analytics: valid json": (r) => {
          try {
            const body = JSON.parse(r.body);
            return !!body;
          } catch { return false; }
        }
      });

      analyticsDuration.add(res.timings.duration);
      errorRate.add(!ok);
      if (!ok) {
        analyticsErrors.add(1);
        console.warn(`[platform-analytics] FAIL — status=${res.status} body=${res.body?.substring(0, 200)}`);
      }
    });
  }

  // Think time between iterations (simulate real human pacing)
  // Real users take 5-10 seconds to look at a dashboard.
  sleep(Math.random() * 5 + 5); 
}

// ─── Summary Handler (printed at end of test) ─────────────────────────────────
export function handleSummary(data) {
  const metrics = data.metrics;

  const avg = (m) => (m?.values?.avg  ?? 0).toFixed(0);
  const p95 = (m) => (m?.values["p(95)"] ?? 0).toFixed(0);
  const rps = (m) => (m?.values?.rate ?? 0).toFixed(2);
  const pct = (m) => ((m?.values?.rate ?? 0) * 100).toFixed(2);

  const report = `
╔══════════════════════════════════════════════════════════════════╗
║          Finance Pulse — k6 Load Test Summary                    ║
╠══════════════════════════════════════════════════════════════════╣
║  ENDPOINT                  │ AVG (ms) │ P95 (ms) │ ERRORS       ║
╠══════════════════════════════════════════════════════════════════╣
║  POST /create-transaction  │  ${avg(metrics.create_transaction_duration).padStart(6)}  │  ${p95(metrics.create_transaction_duration).padStart(6)}  │  ${(metrics.create_transaction_errors?.values?.count ?? 0).toString().padStart(6)}      ║
║  GET  /get-dashboard-summary│  ${avg(metrics.dashboard_duration).padStart(6)}  │  ${p95(metrics.dashboard_duration).padStart(6)}  │  ${(metrics.dashboard_errors?.values?.count ?? 0).toString().padStart(6)}      ║
║  GET  /get-platform-analytics│ ${avg(metrics.analytics_duration).padStart(6)}  │  ${p95(metrics.analytics_duration).padStart(6)}  │  ${(metrics.analytics_errors?.values?.count ?? 0).toString().padStart(6)}      ║
╠══════════════════════════════════════════════════════════════════╣
║  GLOBAL                    │  AVG (ms) │ P95 (ms)  │ RPS         ║
╠══════════════════════════════════════════════════════════════════╣
║  All HTTP requests         │  ${avg(metrics.http_req_duration).padStart(7)} │  ${p95(metrics.http_req_duration).padStart(7)}  │  ${rps(metrics.http_reqs).padStart(9)}  ║
║  Error rate                │  ${pct(metrics.http_req_failed).padStart(5)}%                                    ║
╚══════════════════════════════════════════════════════════════════╝

📋 RESUME-READY METRIC CANDIDATES:
  • "Achieved X RPS throughput under 200 concurrent users"
  • "p95 response time of Xms for dashboard queries"
  • "Maintained <1% error rate under sustained 200 VU load"
`;

  console.log(report);

  // Write JSON results for later analysis
  return {
    "stdout":                          report,
    "../results/main-load-test.json":  JSON.stringify(data, null, 2),
  };
}
