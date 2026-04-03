/**
 * useCategories.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * A lightweight custom hook that fetches all rows from the `categories` table
 * using the Supabase JS client. Results are memoized inside component state, so
 * repeated renders never trigger extra network requests.
 *
 * The categories table has the schema:
 *   id   uuid  PK
 *   name text
 *   type text  ('income' | 'expense')
 *
 * The hook is used by DashboardOverview to supply the `categories` prop to
 * TransactionForm. The form then filters them by the selected transaction type
 * so the user only sees relevant options in the dropdown.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// ─── Public type ─────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false; // Guard against setting state after unmount

    const fetchCategories = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: sbError } = await supabase
          .from('categories')
          .select('id, name, type')
          .order('type')      // Groups income/expense together in the dropdown
          .order('name');     // Alphabetical within each type group

        if (sbError) throw sbError;
        if (!cancelled) {
          setCategories((data ?? []) as Category[]);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load categories.';
          setError(message);
          console.error('[useCategories] Error:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCategories();

    // Cleanup: if the component unmounts before the fetch completes, skip
    // the state update to prevent the "Can't perform state update on unmounted
    // component" warning.
    return () => {
      cancelled = true;
    };
  }, []); // Empty dependency array → runs exactly once on mount

  return { categories, loading, error };
};
