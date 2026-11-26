import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface CategoryBreakdown {
  category_name: string;
  total: number;
}

export interface DashboardData {
  user_name: string;
  total_income: number;
  total_expenses: number;
  net_balance: number;
  category_breakdown: CategoryBreakdown[];
}

interface DashboardResponse {
  data?: DashboardData;
  error?: string;
}

const readErrorDetail = async (context: unknown): Promise<string | null> => {
  if (!(context instanceof Response)) return null;
  try {
    const body: unknown = await context.clone().json();
    if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') return body.error;
  } catch {
    return null;
  }
  return null;
};

export const useDashboard = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const functionName = selectedUserId ? `get-dashboard-summary?user_id=${selectedUserId}` : 'get-dashboard-summary';
      const { data: responseBody, error: invokeError } = await supabase.functions.invoke<DashboardResponse>(functionName);

      if (invokeError) {
        const details = await readErrorDetail(invokeError.context);
        throw new Error(details || invokeError.message || 'Error loading dashboard data.');
      }
      if (responseBody?.error) throw new Error(responseBody.error);
      if (!responseBody?.data) throw new Error('The dashboard service returned no financial summary.');
      setData(responseBody.data);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Error fetching dashboard data');
      console.error('Dashboard Error:', requestError);
    } finally {
      setLoading(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, selectedUserId, setSelectedUserId };
};
