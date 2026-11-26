import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface PlatformAnalytics {
  total_platform_users: number;
  total_transaction_volume: number;
  platform_total_income: number;
  platform_total_expenses: number;
  total_transaction_count: number;
  category_breakdown: { name: string; value: number }[];
  daily_trends: { date: string; income: number; expense: number }[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isPlatformAnalytics = (value: unknown): value is PlatformAnalytics => {
  if (!isRecord(value)) return false;
  const numericFields = ['total_platform_users', 'total_transaction_volume', 'platform_total_income', 'platform_total_expenses', 'total_transaction_count'];
  if (!numericFields.every((field) => typeof value[field] === 'number')) return false;
  if (!Array.isArray(value.category_breakdown) || !Array.isArray(value.daily_trends)) return false;
  const categoriesValid = value.category_breakdown.every((category: unknown) => isRecord(category) && typeof category.name === 'string' && typeof category.value === 'number');
  const trendsValid = value.daily_trends.every((trend: unknown) => isRecord(trend) && typeof trend.date === 'string' && typeof trend.income === 'number' && typeof trend.expense === 'number');
  return categoriesValid && trendsValid;
};

const readErrorDetail = async (context: unknown): Promise<string | null> => {
  if (!(context instanceof Response)) return null;
  try {
    const body: unknown = await context.clone().json();
    if (isRecord(body) && typeof body.error === 'string') return body.error;
  } catch {
    return null;
  }
  return null;
};

export function usePlatformAnalytics() {
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: responseBody, error: invokeError } = await supabase.functions.invoke<unknown>('get-platform-analytics');

      if (invokeError) {
        const details = await readErrorDetail(invokeError.context);
        throw new Error(details || invokeError.message || 'Analytics request failed.');
      }

      let parsed: unknown = responseBody;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed) as unknown;
        } catch {
          throw new Error('The analytics service returned invalid JSON.');
        }
      }

      while (isRecord(parsed) && 'data' in parsed && !('total_platform_users' in parsed)) parsed = parsed.data;
      if (!isPlatformAnalytics(parsed)) throw new Error('The analytics service returned an invalid response.');
      setData(parsed);
    } catch (requestError: unknown) {
      const message = requestError instanceof Error ? requestError.message : 'Failed to load platform analytics.';
      console.error('Error fetching platform analytics:', requestError);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { data, loading, error, refetch: fetchAnalytics };
}
