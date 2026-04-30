// ============================================================================
// performance-tests/k6/soak-test.js
//
// Finance Pulse — Soak Test
// Tests system stability over an extended period at a steady, moderate load (50 VUs).
// Helps uncover memory leaks, cache degradation, or connection pool exhaustion.
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
// Soak tests run for a longer duration at a steady state.
export const options = {
  stages: [
    { duration: "2m", target: 50 },  // Ramp up to 50 VUs
    { duration: "10m", target: 50 }, // Hold at 50 VUs for 10 mins (Mini-soak)
    { duration: "1m", target: 0 },   // Ramp down
  ],

  // ── Performance Thresholds (SLOs) ─────────────────────────────────────────
  thresholds: {
    http_req_duration:           ["p(95)<12000"], 
    http_req_failed:             ["rate<0.01"],    

    create_transaction_duration: ["p(95)<20000"], 
    dashboard_duration:          ["p(95)<12000"], 
    analytics_duration:          ["p(95)<12000"], 
    error_rate:                  ["rate<0.01"],   
  },
};

// ─── VU Scenario Distribution ─────────────────────────────────────────────────
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
  const amount   = parseFloat((Math.random() * 9900 + 100).toFixed(2));
  const daysAgo  = Math.floor(Math.random() * 90);
  const date     = new Date(Date.now() - daysAgo * 86400000).toISOString().split("T")[0];
  const category_id = type === "income" ? CATEGORY_IDS.income : CATEGORY_IDS.expense;

  return JSON.stringify({
    amount,
    type,
    category_id,
    date,
    description: `k6 soak test — ${type} — ${new Date().toISOString()}`,
  });
}

// ─── Main VU Function ─────────────────────────────────────────────────────────
export default function () {
  const role  = pickRole();
  const token = TOKENS[role];

  if (!token || token.startsWith("PASTE_")) {
    console.error(`[SETUP ERROR] Token for role "${role}" not configured.`);
    sleep(1);
    return;
  }

  const headers = authHeaders(token);

  // ── 1. POST /create-transaction (10% probability) ───────────────────────────
  if ((role === "viewer" || role === "admin") && Math.random() < 0.10) {
    group("POST /create-transaction", () => {
      const payload = randomTransactionPayload();
      const res = http.post(`${BASE_URL}/create-transaction`, payload, { headers, tags: { endpoint: "create-transaction" } });

      const ok = check(res, {
        "create-transaction: status 201": (r) => r.status === 201,
        "create-transaction: has data.id": (r) => {
          try { return JSON.parse(r.body)?.data?.id !== undefined; } catch { return false; }
        },
      });

      createTransactionDuration.add(res.timings.duration);
      errorRate.add(!ok);
      if (!ok) createErrors.add(1);
    });
    sleep(0.5);
  }

  // ── 2. GET /get-dashboard-summary ───────────────────────────────────────────
  group("GET /get-dashboard-summary", () => {
    const res = http.get(`${BASE_URL}/get-dashboard-summary`, { headers, tags: { endpoint: "dashboard-summary" } });

    const ok = check(res, {
      "dashboard: status 200": (r) => r.status === 200,
      "dashboard: has data": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body?.data?.full_name !== undefined && body?.data?.total_income !== undefined;
        } catch { return false; }
      },
      "dashboard: response < 12000ms": (r) => r.timings.duration < 12000,
    });

    dashboardDuration.add(res.timings.duration);
    errorRate.add(!ok);
    if (!ok) dashboardErrors.add(1);
  });

  sleep(0.3);

  // ── 3. GET /get-platform-analytics (analyst/admin only) ───────────────────
  if (role === "analyst" || role === "admin") {
    group("GET /get-platform-analytics", () => {
      const res = http.get(`${BASE_URL}/get-platform-analytics`, { headers, tags: { endpoint: "platform-analytics" } });

      const ok = check(res, {
        "analytics: status 200": (r) => r.status === 200,
        "analytics: has data": (r) => {
          try { return JSON.parse(r.body)?.data !== undefined; } catch { return false; }
        },
        "analytics: response < 12000ms": (r) => r.timings.duration < 12000,
      });

      analyticsDuration.add(res.timings.duration);
      errorRate.add(!ok);
      if (!ok) analyticsErrors.add(1);
    });
  }

  // Realistic think time
  sleep(Math.random() * 2 + 3); 
}

// ─── Summary Handler ──────────────────────────────────────────────────────────
export function handleSummary(data) {
  const metrics = data.metrics;
  const avg = (m) => (m?.values?.avg ?? 0).toFixed(0);
  const p95 = (m) => (m?.values["p(95)"] ?? 0).toFixed(0);
  const rps = (m) => (m?.values?.rate ?? 0).toFixed(2);
  const pct = (m) => ((m?.values?.rate ?? 0) * 100).toFixed(2);

  const report = `
╔══════════════════════════════════════════════════════════════════╗
║          Finance Pulse — SOAK TEST Summary                       ║
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
`;

  console.log(report);
  return {
    "stdout": report,
    "../results/soak-test.json": JSON.stringify(data, null, 2),
  };
}
