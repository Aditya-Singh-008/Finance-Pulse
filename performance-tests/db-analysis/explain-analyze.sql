-- ============================================================================
-- performance-tests/db-analysis/explain-analyze.sql
--
-- Run these in Supabase SQL Editor (or psql) to measure query plans.
-- First run BEFORE adding indexes, then AFTER to compare.
--
-- HOW TO USE:
--   1. Go to: Supabase Dashboard → SQL Editor
--   2. Paste each block separately and run
--   3. Save the output to compare before/after optimization
-- ============================================================================


-- ─── Replace these with real UUIDs from your database ────────────────────────
-- Run: SELECT id FROM profiles LIMIT 1;
-- Run: SELECT id FROM categories WHERE type = 'expense' LIMIT 1;

\set test_user_id   'PASTE-USER-UUID-HERE'
\set test_cat_id    'PASTE-CATEGORY-UUID-HERE'


-- ============================================================================
-- QUERY 1: Dashboard Summary — Income/Expense Aggregation
-- (Mirrors what get-dashboard-summary does)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
    type,
    SUM(amount)::NUMERIC(12,2) AS total
FROM transactions
WHERE user_id = :'test_user_id'
GROUP BY type;

-- Expected indexes to help: idx_transactions_user_id


-- ============================================================================
-- QUERY 2: Dashboard — Expense Category Breakdown
-- (Join transactions + categories, filtered by user)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
    t.category_id,
    c.name   AS category_name,
    SUM(t.amount)::NUMERIC(12,2) AS total
FROM transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.user_id   = :'test_user_id'
  AND t.type      = 'expense'
GROUP BY t.category_id, c.name
ORDER BY total DESC;

-- Expected indexes to help: idx_transactions_user_id_type, idx_transactions_category_id


-- ============================================================================
-- QUERY 3: Platform Analytics — All Transactions by Month
-- (Analyst/Admin view — no user filter, full table aggregation)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
    DATE_TRUNC('month', date)            AS month,
    type,
    SUM(amount)::NUMERIC(12,2)           AS total,
    COUNT(*)                             AS count
FROM transactions
GROUP BY month, type
ORDER BY month DESC, type;

-- Expected indexes to help: idx_transactions_date_type


-- ============================================================================
-- QUERY 4: Platform Analytics — Per-User Totals (Admin view)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
    t.user_id,
    p.full_name,
    SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END)::NUMERIC(12,2) AS income,
    SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END)::NUMERIC(12,2) AS expenses
FROM transactions t
JOIN profiles p ON p.id = t.user_id
GROUP BY t.user_id, p.full_name
ORDER BY income DESC;

-- Expected indexes to help: idx_transactions_user_id


-- ============================================================================
-- QUERY 5: Date-Range Query (for potential future date-filter feature)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
    id, amount, type, date, description
FROM transactions
WHERE user_id = :'test_user_id'
  AND date BETWEEN '2025-01-01' AND '2025-12-31'
ORDER BY date DESC;

-- Expected indexes to help: idx_transactions_user_id_date


-- ============================================================================
-- UTILITY: Check which indexes are actually being used by Postgres
-- ============================================================================
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan     AS times_used,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'transactions'
ORDER BY idx_scan DESC;


-- ============================================================================
-- UTILITY: Table bloat and seq scan indicators
-- ============================================================================
SELECT
    relname           AS table_name,
    seq_scan          AS sequential_scans,     -- High = missing index!
    idx_scan          AS index_scans,
    n_live_tup        AS live_rows,
    n_dead_tup        AS dead_rows             -- High = needs VACUUM
FROM pg_stat_user_tables
WHERE relname IN ('transactions', 'profiles', 'categories')
ORDER BY seq_scan DESC;
