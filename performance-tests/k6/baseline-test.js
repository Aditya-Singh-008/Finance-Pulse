// ============================================================================
// performance-tests/k6/baseline-test.js
//
// Finance Pulse — Baseline Load Test (Free Tier Optimized)
// 
// A more realistic test for Supabase free tier:
//  - 50 VUs maximum (free tier saturates above this)
//  - Shorter ramp, reasonable think time
//  - Same endpoints, same metrics
//
// Run:
//   k6 run --env VIEWER_TOKEN=... --env ANALYST_TOKEN=... --env ADMIN_TOKEN=...
//          --env INCOME_CATEGORY_ID=... --env EXPENSE_CATEGORY_ID=...
//          --out json=results/baseline.json k6/baseline-test.js
// ============================================================================

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { BASE_URL, TOKENS, CATEGORY_IDS, authHeaders } from "./config.js";

const createTransactionDuration = new Trend("create_transaction_duration", true);
const dashboardDuration         = new Trend("dashboard_duration", true);
const analyticsDuration         = new Trend("analytics_duration", true);
const errorRate                 = new Rate("error_rate");
const createErrors              = new Counter("create_transaction_errors");
const dashboardErrors           = new Counter("dashboard_errors");
const analyticsErrors           = new Counter("analytics_errors");

// Free-tier optimized load profile:
// Stage 1 (0→1 min): Ramp to 10 VUs
// Stage 2 (1→3 min): Hold at 10 VUs — baseline
// Stage 3 (3→4 min): Ramp to 30 VUs
// Stage 4 (4→6 min): Hold at 30 VUs — moderate load
// Stage 5 (6→7 min): Ramp to 50 VUs — peak
// Stage 6 (7→8 min): Hold at 50 VUs
// Stage 7 (8→9 min): Ramp down
export const options = {
  stages: [
    { duration: "1m", target: 10 },
    { duration: "2m", target: 10 },
    { duration: "1m", target: 30 },
    { duration: "2m", target: 30 },
    { duration: "1m", target: 50 },
    { duration: "1m", target: 50 },
    { duration: "1m", target: 0  },
  ],
  thresholds: {
    http_req_duration:           ["p(95)<5000"],
    http_req_failed:             ["rate<0.05"],
    create_transaction_duration: ["p(95)<5000"],
    dashboard_duration:          ["p(95)<5000"],
    analytics_duration:          ["p(95)<5000"],
    error_rate:                  ["rate<0.05"],
  },
};

function pickRole() {
  const r = Math.random();
  if (r < 0.60) return "viewer";
  if (r < 0.85) return "analyst";
  return "admin";
}

function randomTransactionPayload() {
  const type       = Math.random() < 0.5 ? "income" : "expense";
  const amount     = parseFloat((Math.random() * 4900 + 100).toFixed(2));
  const daysAgo    = Math.floor(Math.random() * 90);
  const date       = new Date(Date.now() - daysAgo * 86400000).toISOString().split("T")[0];
  const category_id = type === "income" ? CATEGORY_IDS.income : CATEGORY_IDS.expense;
  return JSON.stringify({ amount, type, category_id, date, description: `k6 baseline test` });
}

export default function () {
  const role  = pickRole();
  const token = TOKENS[role];

  if (!token || token.startsWith("PASTE_")) {
    console.error(`[SETUP] Token for ${role} not set.`);
    sleep(1);
    return;
  }

  const headers = authHeaders(token);

  // Write: only viewers and admins create transactions
  if (role === "viewer" || role === "admin") {
    if (!CATEGORY_IDS.income.startsWith("PASTE_")) {
      group("POST /create-transaction", () => {
        const res = http.post(`${BASE_URL}/create-transaction`, randomTransactionPayload(), {
          headers,
          tags: { endpoint: "create-transaction" },
        });
        const ok = check(res, {
          "create: status 201": (r) => r.status === 201,
          "create: has id":     (r) => { try { return !!JSON.parse(r.body)?.data?.id; } catch { return false; } },
        });
        createTransactionDuration.add(res.timings.duration);
        errorRate.add(!ok);
        if (!ok) createErrors.add(1);
      });
      sleep(1);
    }
  }

  // Read: dashboard (all roles)
  group("GET /get-dashboard-summary", () => {
    const res = http.get(`${BASE_URL}/get-dashboard-summary`, {
      headers,
      tags: { endpoint: "dashboard" },
    });
    const ok = check(res, {
      "dashboard: status 200":       (r) => r.status === 200,
      "dashboard: has user_id":      (r) => { try { return !!JSON.parse(r.body)?.data?.user_id; } catch { return false; } },
      "dashboard: has total_income": (r) => { try { return JSON.parse(r.body)?.data?.total_income !== undefined; } catch { return false; } },
    });
    dashboardDuration.add(res.timings.duration);
    errorRate.add(!ok);
    if (!ok) dashboardErrors.add(1);
  });

  sleep(1);

  // Analytics: analyst and admin only
  if (role === "analyst" || role === "admin") {
    group("GET /get-platform-analytics", () => {
      const res = http.get(`${BASE_URL}/get-platform-analytics`, {
        headers,
        tags: { endpoint: "analytics" },
      });
      const ok = check(res, {
        "analytics: status 200": (r) => r.status === 200,
        "analytics: has data":   (r) => { try { return JSON.parse(r.body)?.data !== undefined; } catch { return false; } },
      });
      analyticsDuration.add(res.timings.duration);
      errorRate.add(!ok);
      if (!ok) analyticsErrors.add(1);
    });
  }

  // Longer think time to be gentle on free tier
  sleep(Math.random() * 2 + 1); // 1–3s between iterations
}

export function handleSummary(data) {
  const metrics = data.metrics;
  const avg = (m) => (m?.values?.avg  ?? 0).toFixed(0);
  const p95 = (m) => (m?.values?.["p(95)"] ?? 0).toFixed(0);
  const p50 = (m) => (m?.values?.["p(50)"] ?? 0).toFixed(0);
  const rps = (m) => (m?.values?.rate ?? 0).toFixed(2);
  const pct = (m) => ((m?.values?.rate ?? 0) * 100).toFixed(2);

  const report = `
╔══════════════════════════════════════════════════════════════════════╗
║     Finance Pulse — Baseline Load Test Results (Free Tier)           ║
╠══════════════════════════════════════════════════════════════════════╣
║  ENDPOINT                   │ P50 (ms) │ AVG (ms) │ P95 (ms)        ║
╠══════════════════════════════════════════════════════════════════════╣
║  POST /create-transaction   │  ${p50(metrics.create_transaction_duration).padStart(6)}  │  ${avg(metrics.create_transaction_duration).padStart(6)}  │  ${p95(metrics.create_transaction_duration).padStart(6)}       ║
║  GET  /get-dashboard-summary│  ${p50(metrics.dashboard_duration).padStart(6)}  │  ${avg(metrics.dashboard_duration).padStart(6)}  │  ${p95(metrics.dashboard_duration).padStart(6)}       ║
║  GET  /get-platform-analytics│ ${p50(metrics.analytics_duration).padStart(6)}  │  ${avg(metrics.analytics_duration).padStart(6)}  │  ${p95(metrics.analytics_duration).padStart(6)}       ║
╠══════════════════════════════════════════════════════════════════════╣
║  GLOBAL METRICS                                                       ║
╠══════════════════════════════════════════════════════════════════════╣
║  Requests/sec (RPS)         │  ${rps(metrics.http_reqs).padStart(8)}                             ║
║  Total requests             │  ${(metrics.http_reqs?.values?.count ?? 0).toFixed(0).padStart(8)}                             ║
║  Error rate                 │  ${pct(metrics.http_req_failed).padStart(7)}%                            ║
║  Avg response time          │  ${avg(metrics.http_req_duration).padStart(6)}ms                             ║
║  P95 response time          │  ${p95(metrics.http_req_duration).padStart(6)}ms                             ║
╚══════════════════════════════════════════════════════════════════════╝`;

  console.log(report);
  return {
    "stdout":                    report,
    "results/baseline.json":     JSON.stringify(data, null, 2),
  };
}
