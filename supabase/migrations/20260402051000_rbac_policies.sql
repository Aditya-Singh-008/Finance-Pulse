-- =============================================================================
-- Phase 1.2: RBAC & Security Policies
-- Migration: 20260402051000_rbac_policies.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SECTION 1: SECURITY DEFINER HELPER FUNCTION
-- ---------------------------------------------------------------------------
-- This function fetches the current user's role from the profiles table.
-- Using SECURITY DEFINER + SET search_path prevents infinite RLS recursion:
-- without it, every RLS policy SELECT on `profiles` would call itself.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE          -- result is consistent within a single transaction
SECURITY DEFINER
SET search_path = public  -- pin search_path to prevent search_path injection
AS $$
  SELECT role
  FROM   public.profiles
  WHERE  id = auth.uid();
$$;

-- Revoke public execute; only the DB superuser/service role should grant it
REVOKE EXECUTE ON FUNCTION get_user_role() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_user_role() TO authenticated;


-- =============================================================================
-- SECTION 2: PROFILES TABLE POLICIES
-- =============================================================================

-- Users can view their own profile
CREATE POLICY "profiles: users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admins can view ALL profiles
CREATE POLICY "profiles: admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

-- Users can update their own profile (non-role fields only; role escalation
-- must go through a privileged API, not direct table writes)
CREATE POLICY "profiles: users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING  (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Prevent self-role-escalation: new role must equal current role
    AND role = get_user_role()
  );

-- Admins can update any profile (including assigning roles)
CREATE POLICY "profiles: admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');


-- =============================================================================
-- SECTION 3: CATEGORIES TABLE POLICIES
-- =============================================================================
-- Categories are reference data. All authenticated users may read them.
-- Only admins may mutate them.

-- All authenticated users: read-only access
CREATE POLICY "categories: authenticated users can read"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Admin: full write access
CREATE POLICY "categories: admins can insert"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "categories: admins can update"
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "categories: admins can delete"
  ON public.categories
  FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');


-- =============================================================================
-- SECTION 4: TRANSACTIONS TABLE POLICIES
-- =============================================================================

-- ── Admin: Full access ────────────────────────────────────────────────────────

CREATE POLICY "transactions: admins full select"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "transactions: admins full insert"
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "transactions: admins full update"
  ON public.transactions
  FOR UPDATE
  TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "transactions: admins full delete"
  ON public.transactions
  FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- ── Analyst: Read-all access ──────────────────────────────────────────────────
-- Analysts can read every transaction but cannot write, update, or delete.

CREATE POLICY "transactions: analysts read all"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'analyst');

-- ── Viewer: Read-only for own transactions ────────────────────────────────────
-- Viewers can only see transactions where user_id matches their own auth UID.

CREATE POLICY "transactions: viewers read own"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'viewer'
    AND user_id = auth.uid()
  );
