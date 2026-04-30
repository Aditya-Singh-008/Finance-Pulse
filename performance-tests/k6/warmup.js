
import http from 'k6/http';
import { sleep, check } from 'k6';
import { BASE_URL, TOKENS, CATEGORY_IDS } from './config.js';

export const options = {
  vus: 3,
  duration: '15s',
};

export default function () {
  // Rotate through our 3 tokens
  const users = ['admin', 'analyst', 'viewer'];
  const userType = users[Math.floor(Math.random() * users.length)];
  const token = TOKENS[userType];

  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  // 1. Warm up Dashboard
  const dashRes = http.get(`${BASE_URL}/get-dashboard-summary`, params);
  if (!check(dashRes, { 'dash status is 200': (r) => r.status === 200 })) {
    console.log(`DASH FAIL: ${dashRes.status} - ${dashRes.body}`);
  }

  // 2. Warm up Analytics
  const analyticsRes = http.get(`${BASE_URL}/get-platform-analytics`, params);
  if (!check(analyticsRes, { 'analytics status is 200 or 403': (r) => r.status === 200 || r.status === 403 })) {
    console.log(`ANALYTICS FAIL: ${analyticsRes.status} - ${analyticsRes.body}`);
  }

  // 3. Warm up Create Transaction
  if (Math.random() > 0.5) {
    const payload = JSON.stringify({
      amount: 10.50,
      type: 'expense',
      category_id: CATEGORY_IDS.expense,
      date: new Date().toISOString().split('T')[0],
      description: 'Warmup transaction'
    });
    const createRes = http.post(`${BASE_URL}/create-transaction`, payload, params);
    if (!check(createRes, { 'create status is 201': (r) => r.status === 201 })) {
      console.log(`CREATE FAIL: ${createRes.status} - ${createRes.body}`);
    }
  }

  sleep(1);
}
