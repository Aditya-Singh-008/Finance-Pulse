import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  description: string | null;
  category_id?: string;
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

const EMPTY_FILTERS: TransactionFilters = {};

export const useTransactions = (limit = 5, selectedUserId: string | null = null, filters: TransactionFilters = EMPTY_FILTERS, page = 1) => {
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

      const targetUserId = selectedUserId || user.id;
      let query = supabase
        .from('transactions')
        .select('id, amount, type, date, description, category_id, category:categories(name)', { count: 'exact' })
        .eq('user_id', targetUserId);

      if (filters.category_id && filters.category_id !== 'all') query = query.eq('category_id', filters.category_id);
      if (filters.type && filters.type !== 'all') query = query.eq('type', filters.type);
      if (filters.startDate) query = query.gte('date', filters.startDate);
      if (filters.endDate) query = query.lte('date', filters.endDate);
      if (filters.search) query = query.ilike('description', `%${filters.search}%`);

      const currentPage = page || 1;
      const from = (currentPage - 1) * limit;
      const to = from + limit - 1;
      const { data, error: queryError, count } = await query.order('date', { ascending: false }).order('created_at', { ascending: false }).range(from, to);

      if (queryError) throw queryError;
      setTransactions((data as unknown as Transaction[] | null) || []);
      if (count !== null) setTotalCount(count);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Error fetching transactions');
      console.error('Transactions Hook Error:', requestError);
    } finally {
      setLoading(false);
    }
  }, [limit, selectedUserId, filters, page]);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, loading, error, totalCount, refetch: fetchTransactions };
};
