/**
 * useTransactions.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom hook to fetch a list of transactions for the authenticated user,
 * including their category information.
 *
 * It uses Supabase's auto-generation of types (if available) or the raw client
 * to pull the history. Includes automatic refetching support.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  description: string | null;
  category: {
    name: string;
  } | null;
}

export const useTransactions = (limit: number = 5, selectedUserId: string | null = null) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      // Default to current user if no specific ID provided
      const targetUserId = selectedUserId || user.id;

      const { data, error: sbError } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          type,
          date,
          description,
          category_id,
          category:categories(name)
        `)
        .eq('user_id', targetUserId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (sbError) throw sbError;
      
      console.log('DEBUG: Transactions Map From DB:', data);
      setTransactions((data as any) || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching transactions');
      console.error('Transactions Hook Error:', err);
    } finally {
      setLoading(false);
    }
  }, [limit, selectedUserId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { 
    transactions, 
    loading, 
    error, 
    refetch: fetchTransactions 
  };
};
