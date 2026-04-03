-- =============================================================================
-- Phase 1.3: Database Seeding
-- Script: seed.sql
-- Description: Populates categories, a test profile, and mock transactions.
-- =============================================================================

-- 1. Insert Categories (Income & Expense)
-- Using a CTE to ensure we can reference these IDs if needed, 
-- but for a simple seed, we'll just insert them.
INSERT INTO public.categories (name, type) VALUES
('Salary', 'income'),
('Freelance', 'income'),
('Bonus', 'income'),
('Dividends', 'income'),
('Sale', 'income'),
('Rent', 'expense'),
('Groceries', 'expense'),
('Utilities', 'expense'),
('Entertainment', 'expense'),
('Transport', 'expense')
ON CONFLICT DO NOTHING;

-- 2. Mock User Profile
-- REPLACE '00000000-0000-0000-0000-000000000000' with your actual auth.uid() 
-- from the Supabase Dashboard -> Authentication -> Users.
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
    '00000000-0000-0000-0000-000000000000', -- <--- REPLACE THIS
    'testuser@example.com', 
    'Demo User', 
    'admin'
)
ON CONFLICT (id) DO UPDATE 
SET full_name = EXCLUDED.full_name;

-- 3. Realistic Transactions
-- We use a subquery to look up category IDs dynamically to ensure consistency.
-- Replace the UUID below with the same one used above.

DO $$
DECLARE
    v_user_id UUID := '00000000-0000-0000-0000-000000000000'; -- <--- REPLACE THIS ID
BEGIN
    INSERT INTO public.transactions (user_id, category_id, amount, type, date, description)
    VALUES
    -- Income
    (v_user_id, (SELECT id FROM categories WHERE name = 'Salary' LIMIT 1), 5000.00, 'income', CURRENT_DATE - INTERVAL '28 days', 'Monthly Salary'),
    (v_user_id, (SELECT id FROM categories WHERE name = 'Freelance' LIMIT 1), 1200.00, 'income', CURRENT_DATE - INTERVAL '20 days', 'Web Design Project'),
    (v_user_id, (SELECT id FROM categories WHERE name = 'Dividends' LIMIT 1), 150.00, 'income', CURRENT_DATE - INTERVAL '15 days', 'Stock Dividends'),
    (v_user_id, (SELECT id FROM categories WHERE name = 'Sale' LIMIT 1), 45.00, 'income', CURRENT_DATE - INTERVAL '5 days', 'Sold old monitor'),
    (v_user_id, (SELECT id FROM categories WHERE name = 'Bonus' LIMIT 1), 500.00, 'income', CURRENT_DATE - INTERVAL '2 days', 'Performance Bonus'),

    -- Expenses
    (v_user_id, (SELECT id FROM categories WHERE name = 'Rent' LIMIT 1), 1500.00, 'expense', CURRENT_DATE - INTERVAL '27 days', 'Apartment Rent'),
    (v_user_id, (SELECT id FROM categories WHERE name = 'Groceries' LIMIT 1), 85.50, 'expense', CURRENT_DATE - INTERVAL '26 days', 'Weekly Grocery Shopping'),
    (v_user_id, (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 40.00, 'expense', CURRENT_DATE - INTERVAL '25 days', 'Monthly Bus Pass'),
    (v_user_id, (SELECT id FROM categories WHERE name = 'Utilities' LIMIT 1), 120.00, 'expense', CURRENT_DATE - INTERVAL '22 days', 'Electricity & Water Bill'),
    (v_user_id, (SELECT id FROM categories WHERE name = 'Groceries' LIMIT 1), 64.20, 'expense', CURRENT_DATE - INTERVAL '19 days', 'Mid-week Grocery Run'),
    (v_user_id, (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 55.00, 'expense', CURRENT_DATE - INTERVAL '18 days', 'Movie Night & Snacks'),
    (v_user_id, (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 32.00, 'expense', CURRENT_DATE - INTERVAL '14 days', 'Uber to Airport'),
    (v_user_id, (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 120.00, 'expense', CURRENT_DATE - INTERVAL '12 days', 'Concert Tickets'),
    (v_user_id, (SELECT id FROM categories WHERE name = 'Groceries' LIMIT 1), 92.10, 'expense', CURRENT_DATE - INTERVAL '10 days', 'Bulk Grocery Haul'),
    (v_user_id, (SELECT id FROM categories WHERE name = 'Utilities' LIMIT 1), 60.00, 'expense', CURRENT_DATE - INTERVAL '8 days', 'Internet Bill'),
    (v_user_id, (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 15.00, 'expense', CURRENT_DATE - INTERVAL '6 days', 'Parking Fee'),
    (v_user_id, (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 30.00, 'expense', CURRENT_DATE - INTERVAL '4 days', 'Dinner out'),
    (v_user_id, (SELECT id FROM categories WHERE name = 'Groceries' LIMIT 1), 45.00, 'expense', CURRENT_DATE - INTERVAL '1 day', 'Fresh Produce');
END $$;
