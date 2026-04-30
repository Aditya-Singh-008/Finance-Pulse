-- ============================================================================
-- supabase/migrations/20260428_add_analytics_cache.sql
-- Finance Pulse — v2 Optimization: Database Cache & Native RPC
-- ============================================================================

-- 1. Create the Cache Table
CREATE TABLE IF NOT EXISTS public.analytics_cache (
    key VARCHAR PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on the cache table (Admins/Analysts only)
ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to analytics cache for authorized roles"
ON public.analytics_cache
FOR SELECT
TO authenticated
USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'analyst')
);

-- Service role bypasses RLS for inserting/updating cache

-- 2. Create the RPC function to do the heavy math natively in PostgreSQL
-- This replaces the Javascript loop in the Edge Function!
CREATE OR REPLACE FUNCTION calculate_platform_analytics()
RETURNS jsonb AS $$
DECLARE
    v_total_users INT;
    v_volume NUMERIC;
    v_income NUMERIC;
    v_expense NUMERIC;
    v_tx_count INT;
    v_categories JSONB;
    v_trends JSONB;
BEGIN
    -- Get total users
    SELECT count(*) INTO v_total_users FROM profiles;

    -- Get global totals
    SELECT 
        count(*), 
        COALESCE(sum(amount), 0), 
        COALESCE(sum(amount) FILTER (WHERE type = 'income'), 0), 
        COALESCE(sum(amount) FILTER (WHERE type = 'expense'), 0)
    INTO v_tx_count, v_volume, v_income, v_expense
    FROM transactions;

    -- Get category breakdown
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', c.name, 'value', c.value)), '[]'::jsonb) INTO v_categories
    FROM (
        SELECT cat.name, COALESCE(sum(t.amount), 0) AS value
        FROM transactions t
        JOIN categories cat ON cat.id = t.category_id
        GROUP BY cat.name
        ORDER BY value DESC
    ) c;

    -- Get 30-day trends
    SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d.date_str, 'income', d.income, 'expense', d.expense)), '[]'::jsonb) INTO v_trends
    FROM (
        SELECT 
            to_char(date, 'YYYY-MM-DD') AS date_str,
            COALESCE(sum(amount) FILTER (WHERE type = 'income'), 0) AS income,
            COALESCE(sum(amount) FILTER (WHERE type = 'expense'), 0) AS expense
        FROM transactions
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY date_str
        ORDER BY date_str ASC
    ) d;

    -- Return the fully built JSON object exactly as the frontend expects it
    RETURN jsonb_build_object(
        'total_platform_users', v_total_users,
        'total_transaction_volume', ROUND(v_volume, 2),
        'platform_total_income', ROUND(v_income, 2),
        'platform_total_expenses', ROUND(v_expense, 2),
        'total_transaction_count', v_tx_count,
        'category_breakdown', v_categories,
        'daily_trends', v_trends
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
