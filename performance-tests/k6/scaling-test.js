// ============================================================================
// performance-tests/k6/scaling-test.js
//
// Finance Pulse — Data Scaling Test
//
// After seeding 10k–50k transactions (see ../seed-data.js), this test
// measures how query latency degrades as data volume increases.
//
// Pairs with: run-scaling-test.ps1 (seeds data between each stage)
//
// Run:
//   k6 run --env DATA_SIZE=small --out json=../results/scaling-small.json scaling-test.js
//   k6 run --env DATA_SIZE=medium --out json=../results/scaling-medium.json scaling-test.js
//   k6 run --env DATA_SIZE=large --out json=../results/scaling-large.json scaling-test.js
// ============================================================================

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import { BASE_URL, TOKENS, authHeaders } from "./config.js";

const dashboardLatency  = new Trend("dashboard_latency_scaling", true);
const analyticsLatency  = new Trend("analytics_latency_scaling", true);

const DATA_SIZE = __ENV.DATA_SIZE || "small"; // small=10k, medium=30k, large=50k

export const options = {
  // Fixed 30 VUs for 3 minutes — controlled, reproducible measurement
  vus:      30,
  duration: "3m",

  thresholds: {
    dashboard_latency_scaling:  ["p(95)<5000"],
    analytics_latency_scaling:  ["p(95)<8000"],
    http_req_failed:            ["rate<0.10"],
  },
};

export default function () {
  // Prefer analyst (sees all data = worst-case RLS); fall back to viewer
  const token = (TOKENS.analyst && !TOKENS.analyst.startsWith("PASTE_"))
    ? TOKENS.analyst
    : TOKENS.viewer;

  if (!token || token.startsWith("PASTE_")) {
    console.error("[SETUP ERROR] Set ANALYST_TOKEN or VIEWER_TOKEN env var.");
    sleep(1);
    return;
  }

  const headers = authHeaders(token);

  // Dashboard summary — aggregates user's transactions
  const dashRes = http.get(`${BASE_URL}/get-dashboard-summary`, {
    headers,
    tags: { data_size: DATA_SIZE, endpoint: "dashboard" },
  });

  check(dashRes, {
    "scaling - dashboard 200": (r) => r.status === 200,
  });
  dashboardLatency.add(dashRes.timings.duration);

  sleep(0.5);

  // Platform analytics — aggregates ALL transactions (full table scan risk)
  const analyticsRes = http.get(`${BASE_URL}/get-platform-analytics`, {
    headers,
    tags: { data_size: DATA_SIZE, endpoint: "analytics" },
  });

  check(analyticsRes, {
    "scaling - analytics 200": (r) => r.status === 200,
  });
  analyticsLatency.add(analyticsRes.timings.duration);

  sleep(0.3);
}

export function handleSummary(data) {
  const metrics = data.metrics;
  const p = (m, percentile) =>
    (m?.values?.[`p(${percentile})`] ?? 0).toFixed(0);

  const report = `
╔═══════════════════════════════════════════════════════╗
║  Finance Pulse — Data Scaling Test [${DATA_SIZE.toUpperCase().padEnd(6)}]        ║
╠═══════════════════════════════════════════════════════╣
║  Endpoint               │ P50 (ms) │ P95 (ms) │ P99  ║
╠═══════════════════════════════════════════════════════╣
║  /get-dashboard-summary │  ${p(metrics.dashboard_latency_scaling, 50).padStart(6)}  │  ${p(metrics.dashboard_latency_scaling, 95).padStart(6)}  │ ${p(metrics.dashboard_latency_scaling, 99).padStart(4)}  ║
║  /get-platform-analytics│  ${p(metrics.analytics_latency_scaling, 50).padStart(6)}  │  ${p(metrics.analytics_latency_scaling, 95).padStart(6)}  │ ${p(metrics.analytics_latency_scaling, 99).padStart(4)}  ║
╚═══════════════════════════════════════════════════════╝
Data size tier: ${DATA_SIZE} (small=10k rows, medium=30k, large=50k)
`;

  console.log(report);
  return {
    "stdout":                                        report,
    [`results/scaling-${DATA_SIZE}.json`]:           JSON.stringify(data, null, 2),
  };
}
