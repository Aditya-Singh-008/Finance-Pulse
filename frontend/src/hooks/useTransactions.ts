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

export interface TransactionFilters {
  category_id?: string;
  type?: 'income' | 'expense' | 'all';
  startDate?: string;
  endDate?: string;
  search?: string;
}

export const useTransactions = (limit: number = 5, selectedUserId: string | null = null, filters: TransactionFilters = {}, page: number = 1) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      // Default to current user if no specific ID provided
      const targetUserId = selectedUserId || user.id;

      let query = supabase
        .from('transactions')
        .select(`
          id,
          amount,
          type,
          date,
          description,
          category_id,
          category:categories(name)
        `, { count: 'exact' })
        .eq('user_id', targetUserId);

      // Apply Filters
      if (filters.category_id && filters.category_id !== 'all') {
        query = query.eq('category_id', filters.category_id);
      }
      
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }
      
      if (filters.startDate) {
        query = query.gte('date', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte('date', filters.endDate);
      }
      
      if (filters.search) {
        query = query.ilike('description', `%${filters.search}%`);
      }

      // Set pagination
      const currentPage = page || 1;
      const from = (currentPage - 1) * limit;
      const to = from + limit - 1;

      const { data, error: sbError, count } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (sbError) throw sbError;
      
      setTransactions((data as any) || []);
      if (count !== null) setTotalCount(count);
    } catch (err: any) {
      setError(err.message || 'Error fetching transactions');
      console.error('Transactions Hook Error:', err);
    } finally {
      setLoading(false);
    }
  }, [limit, selectedUserId, JSON.stringify(filters), page]); // Stringify filters to prevent effect loop

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { 
    transactions, 
    loading, 
    error, 
    totalCount,
    refetch: fetchTransactions 
  };
};
