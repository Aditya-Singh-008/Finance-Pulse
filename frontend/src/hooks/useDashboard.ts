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
            // If an ID is selected, we append as a query param. 
            // The Edge Function then checks if the caller is an admin before allowing the fetch.
            const functionName = selectedUserId 
                ? `get-dashboard-summary?user_id=${selectedUserId}` 
                : 'get-dashboard-summary';

            const { data: responseBody, error: invokeError } = await supabase.functions.invoke(functionName);
            
            if (invokeError) throw invokeError;
            
            // Success: unwrap global metadata from response
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
