/**
 * MainLayout.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * A navigation wrapper that manages the dashboard context.
 * Features:
 * - Tab switching between 'Personal Wallet' and 'Platform Analytics'.
 * - Role-based access control: 'Platform Analytics' is only for admin/analyst.
 * - Manages activeTab state to switch between DashboardOverview and AnalystDashboard.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import DashboardOverview from '../dashboard/DashboardOverview';
import AnalystDashboard from '../dashboard/AnalystDashboard';
import AdminUserManagement from '../dashboard/AdminUserManagement';
import { Wallet, BarChart2, ShieldCheck, ChevronRight, Shield } from 'lucide-react';

type TabType = 'personal' | 'analyst' | 'iam';

const MainLayout: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('personal');
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserRole = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();
                    setUserRole(profile?.role || 'viewer');
                }
            } catch (err) {
                console.error('Error fetching role for navigation:', err);
                setUserRole('viewer');
            } finally {
                setLoading(false);
            }
        };
        fetchUserRole();
    }, []);

    const isAuthorizedForAnalytics = userRole === 'admin' || userRole === 'analyst';

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-14 w-full bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800"></div>
                <div className="h-[600px] w-full bg-slate-50 dark:bg-slate-950/50 rounded-[3rem]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Context Navigation Bar */}
            <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center shadow-sm sticky top-20 z-10 transition-all duration-300">
                <div className="flex flex-1 items-center gap-1">
                    <button
                        onClick={() => setActiveTab('personal')}
                        className={`
                            flex items-center gap-3 px-6 py-2.5 rounded-xl font-bold transition-all duration-300
                            ${activeTab === 'personal' 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                            }
                        `}
                    >
                        <Wallet className={`w-4 h-4 ${activeTab === 'personal' ? 'animate-bounce' : ''}`} />
                        <span>Personal Wallet</span>
                    </button>

                    {isAuthorizedForAnalytics && (
                        <>
                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
                            <button
                                onClick={() => setActiveTab('analyst')}
                                className={`
                                    flex items-center gap-3 px-6 py-2.5 rounded-xl font-bold transition-all duration-300
                                    ${activeTab === 'analyst' 
                                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' 
                                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }
                                `}
                            >
                                <BarChart2 className={`w-4 h-4 ${activeTab === 'analyst' ? 'rotate-12 transition-transform' : ''}`} />
                                <span>Platform Analytics</span>
                            </button>
                        </>
                    )}

                    {userRole === 'admin' && (
                        <>
                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
                            <button
                                onClick={() => setActiveTab('iam')}
                                className={`
                                    flex items-center gap-3 px-6 py-2.5 rounded-xl font-bold transition-all duration-300
                                    ${activeTab === 'iam' 
                                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30' 
                                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }
                                `}
                            >
                                <Shield className={`w-4 h-4 ${activeTab === 'iam' ? 'scale-110' : ''}`} />
                                <span className="hidden md:inline">Access Control Center</span>
                                <span className="md:hidden">Access</span>
                            </button>
                        </>
                    )}
                </div>

                <div className="hidden md:flex items-center gap-2 px-4 border-l border-slate-200 dark:border-slate-800">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {userRole === 'admin' && 'Security Cleared: ADMIN'}
                        {userRole === 'analyst' && 'Security Cleared: ANALYST'}
                        {userRole === 'viewer' && 'Standard Access: VIEWER'}
                        {!['admin', 'analyst', 'viewer'].includes(userRole || '') && `Role: ${userRole?.toUpperCase()}`}
                    </span>
                    <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-700" />
                </div>
            </div>

            {/* Dashboard Rendering Zone */}
            <div className={`transition-all duration-500 transform ${activeTab === 'analyst' ? 'analyst-theme' : ''}`}>
                {activeTab === 'personal' && <DashboardOverview />}
                {activeTab === 'analyst' && <AnalystDashboard />}
                {activeTab === 'iam' && <AdminUserManagement />}
            </div>

            {/* Global style injection for Analyst Theme if needed */}
            {activeTab === 'analyst' && (
                <style dangerouslySetInnerHTML={{ __html: `
                    .analyst-theme {
                        --dashboard-bg: #0f172a;
                    }
                `}} />
            )}
        </div>
    );
};

export default MainLayout;
