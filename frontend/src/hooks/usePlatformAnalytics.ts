/**
 * usePlatformAnalytics.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom hook to fetch platform-wide analytics from the Supabase Edge Function.
 * Returns macro-level data including total users, transaction volume, and count.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface PlatformAnalytics {
  total_platform_users: number;
  total_transaction_volume: number;
  platform_total_income: number;
  platform_total_expenses: number;
  total_transaction_count: number;
  category_breakdown: { name: string; value: number }[];
}

export function usePlatformAnalytics() {
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: responseBody, error } = await supabase.functions.invoke('get-platform-analytics');

      if (error) throw error;

      console.log('DEBUG: Platform Analytics Response Body (Raw):', responseBody);

      // 1. HANDLE POTENTIAL STRINGIFICATION
      let parsed = responseBody;
      if (typeof responseBody === 'string') {
        try {
          parsed = JSON.parse(responseBody);
        } catch (e) {
          console.error('Failed to parse analytics JSON string', e);
        }
      }

      // 2. UNPACK THE NESTING (Supabase invoke sometimes double-wraps data)
      let actualMetrics = parsed;
      // Navigate through 'data' wrappers until we find the metrics
      while (actualMetrics?.data && typeof actualMetrics.total_platform_users === 'undefined') {
          actualMetrics = actualMetrics.data;
      }

      // 3. Validate the unpacked metrics
      if (!actualMetrics || typeof actualMetrics.total_platform_users === 'undefined') {
        console.error('DEBUG: Unpacked Metrics Failed Validation:', actualMetrics);
        throw new Error('Invalid response format from analytics service');
      }
      
      setData(actualMetrics);
    } catch (err: any) {
      console.error('Error fetching platform analytics:', err);
      setError(err.message || 'Failed to recalibrate platform data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { data, loading, error, refetch: fetchAnalytics };
}
