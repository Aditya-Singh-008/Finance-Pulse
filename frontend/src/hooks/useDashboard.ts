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

export const useDashboard = () => {
    // track which user's data we're viewing (default is null -> my dashboard)
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const functionName = selectedUserId 
                ? `get-dashboard-summary?user_id=${selectedUserId}` 
                : 'get-dashboard-summary';

            const { data: responseBody, error: invokeError } = await supabase.functions.invoke(functionName);
            
            if (invokeError) {
              // Supabase FunctionsHttpError wraps the actual response body in context.json()
              // We attempt to extract a clear message for the UI lockout check
              let message = invokeError.message;
              
              if ((invokeError as any).context && typeof (invokeError as any).context.json === 'function') {
                try {
                  const errorData = await (invokeError as any).context.json();
                  message = errorData?.error || message;
                } catch (e) {
                  // Fallback to existing message if JSON parsing fails
                }
              }
              
              throw new Error(message || 'Error recalibrating dashboard data');
            }
            
            if (responseBody?.error) {
                throw new Error(responseBody.error);
            }

            setData(responseBody.data as DashboardData);
        } catch (err: any) {
            setError(err.message || 'Error fetching dashboard data');
            console.error('Dashboard Error:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedUserId]);

    // Force a re-fetch whenever the selected user ID changes
    useEffect(() => {
        fetchData();
    }, [fetchData, selectedUserId]);

    return { 
        data, 
        loading, 
        error, 
        refetch: fetchData,
        selectedUserId, // Expose which user is currently being viewed
        setSelectedUserId 
    };
};
