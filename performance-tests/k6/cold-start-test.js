// ============================================================================
// performance-tests/k6/cold-start-test.js
//
// Finance Pulse — Cold Start vs Warm Latency Test
//
// Measures first-request (cold start) latency vs subsequent (warm) latency
// for Supabase Edge Functions (Deno runtime).
//
// Strategy:
//   • 1 VU, sequential requests
//   • First request = cold start (after idle period)
//   • Requests 2–10 = warm (function container is alive)
//   • Wait 5 min between cycles to force a new cold start
//
// Run:
//   k6 run --out json=../results/cold-start.json cold-start-test.js
// ============================================================================

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import { BASE_URL, TOKENS, ANON_KEY, authHeaders } from "./config.js";

const coldStartDuration = new Trend("cold_start_ms", true);
const warmDuration      = new Trend("warm_ms", true);

export const options = {
  // Single VU, 3 cold-start cycles separated by idle time
  scenarios: {
    cold_start_test: {
      executor:    "per-vu-iterations",
      vus:          1,
      iterations:   1,
      maxDuration: "20m",
    },
  },
  thresholds: {
    cold_start_ms: ["p(100)<10000"], // Cold starts should be < 10s
    warm_ms:       ["p(95)<500"],    // Warm requests should be < 500ms
  },
};

export default function () {
  const token = TOKENS.viewer;
  if (!token || token.startsWith("PASTE_")) {
    console.error("[SETUP ERROR] Set VIEWER_TOKEN. See config.js.");
    return;
  }

  const headers = authHeaders(token);

  // ── CYCLE 1: First cold start ─────────────────────────────────────────────
  console.log("\n[Cold Start Cycle 1] Sending first request (cold start)...");
  const coldRes1 = http.get(`${BASE_URL}/get-dashboard-summary`, {
    headers,
    tags: { type: "cold_start" },
  });

  check(coldRes1, { "cold start 1: status 200": (r) => r.status === 200 });
  coldStartDuration.add(coldRes1.timings.duration);
  console.log(`[Cold Start 1] ${coldRes1.timings.duration.toFixed(0)}ms — status=${coldRes1.status}`);

  // ── Warm requests after cold start ────────────────────────────────────────
  console.log("[Warm Requests] Firing 10 consecutive warm requests...");
  for (let i = 0; i < 10; i++) {
    const warmRes = http.get(`${BASE_URL}/get-dashboard-summary`, {
      headers,
      tags: { type: "warm" },
    });
    check(warmRes, { "warm request: status 200": (r) => r.status === 200 });
    warmDuration.add(warmRes.timings.duration);
    console.log(`  [Warm ${i + 1}] ${warmRes.timings.duration.toFixed(0)}ms`);
    sleep(0.2); // 200ms between warm requests
  }

  // ── Wait 5 minutes to let the function container go cold ──────────────────
  console.log("\n[Idle] Waiting 5 minutes to force cold start...");
  sleep(300); // 300 seconds = 5 minutes

  // ── CYCLE 2: Second cold start ────────────────────────────────────────────
  console.log("[Cold Start Cycle 2] Second cold start...");
  const coldRes2 = http.get(`${BASE_URL}/get-dashboard-summary`, {
    headers,
    tags: { type: "cold_start" },
  });

  check(coldRes2, { "cold start 2: status 200": (r) => r.status === 200 });
  coldStartDuration.add(coldRes2.timings.duration);
  console.log(`[Cold Start 2] ${coldRes2.timings.duration.toFixed(0)}ms — status=${coldRes2.status}`);

  // Second batch of warm requests
  for (let i = 0; i < 5; i++) {
    const warmRes = http.get(`${BASE_URL}/get-dashboard-summary`, {
      headers,
      tags: { type: "warm" },
    });
    warmDuration.add(warmRes.timings.duration);
    console.log(`  [Warm 2.${i + 1}] ${warmRes.timings.duration.toFixed(0)}ms`);
    sleep(0.2);
  }
}

export function handleSummary(data) {
  const metrics = data.metrics;
  const avg = (m) => (m?.values?.avg ?? 0).toFixed(0);
  const min = (m) => (m?.values?.min ?? 0).toFixed(0);
  const max = (m) => (m?.values?.max ?? 0).toFixed(0);

  const report = `
╔══════════════════════════════════════════════════════╗
║   Finance Pulse — Cold Start vs Warm Latency         ║
╠══════════════════════════════════════════════════════╣
║  Metric         │  Min (ms) │  Avg (ms) │  Max (ms)  ║
╠══════════════════════════════════════════════════════╣
║  Cold Start     │  ${min(metrics.cold_start_ms).padStart(7)} │  ${avg(metrics.cold_start_ms).padStart(7)} │  ${max(metrics.cold_start_ms).padStart(7)}  ║
║  Warm Request   │  ${min(metrics.warm_ms).padStart(7)} │  ${avg(metrics.warm_ms).padStart(7)} │  ${max(metrics.warm_ms).padStart(7)}  ║
╠══════════════════════════════════════════════════════╣
║  Cold/Warm Ratio: ${(
    (metrics.cold_start_ms?.values?.avg ?? 1) /
    (metrics.warm_ms?.values?.avg ?? 1)
  ).toFixed(1)}x slower on cold start          ║
╚══════════════════════════════════════════════════════╝

📋 RESUME BULLET:
  "Edge Functions achieve ~Xms warm latency vs Yms cold start"
`;

  console.log(report);
  return {
    "stdout":                        report,
    "../results/cold-start.json":    JSON.stringify(data, null, 2),
  };
}
