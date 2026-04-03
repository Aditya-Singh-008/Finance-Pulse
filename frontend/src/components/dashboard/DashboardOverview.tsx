/**
 * DashboardOverview.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The main user interface for Finance Pulse. 
 * Handles loading states, empty states, and role-based admin controls.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import TransactionList from './TransactionList';
import AdminUserSwitcher from './AdminUserSwitcher';
import { supabase } from '../../lib/supabaseClient';
import { useDashboard } from '../../hooks/useDashboard';
import { useCategories } from '../../hooks/useCategories';
import { useTransactions } from '../../hooks/useTransactions';
import TransactionForm from './TransactionForm';
import type { TransactionFormHandle } from './TransactionForm';
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    RefreshCcw,
    AlertCircle,
    PieChart,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';

const DashboardOverview: React.FC = () => {
    const { data, loading, error, refetch: refetchDashboard, selectedUserId, setSelectedUserId } = useDashboard();
    const formRef = useRef<TransactionFormHandle>(null);

    // Fetch real categories from Supabase once on mount.
    const { categories } = useCategories();

    // Transaction history hook for the activity table — we pass the selectedUserId
    // here to ensure that refetching also targets the selected user's data.
    const { refetch: refetchTx } = useTransactions(5, selectedUserId);

    // Track current user's role to conditionally show admin tools
    const [userRole, setUserRole] = useState<string | null>(null);

    // 1. Fetch user role on mount for security checks
    useEffect(() => {
        const fetchRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                setUserRole(profile?.role || 'viewer');
            }
        };
        fetchRole();
    }, []);

    /**
     * Unified refetch handler — called whenever a new transaction is successfully
     * recorded. Triggers both the Edge Function (aggregates) and the direct DB fetch.
     */
    const handleRefresh = useCallback(() => {
        refetchDashboard();
        refetchTx();
    }, [refetchDashboard, refetchTx]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    /** ──────── PHASE 1: LOADING STATE (SKELETON UI) ──────── */
    if (loading) {
        return (
            <div className="space-y-10 animate-pulse">
                {/* Header Skeleton */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                        <div className="h-5 w-80 bg-slate-100 dark:bg-slate-900 rounded-xl"></div>
                    </div>
                    <div className="flex gap-3">
                        <div className="h-12 w-32 bg-slate-100 dark:bg-slate-900 rounded-2xl"></div>
                        <div className="h-12 w-40 bg-slate-100 dark:bg-slate-900 rounded-2xl"></div>
                    </div>
                </div>

                {/* Metric Cards Skeleton */}
                <div className="grid md:grid-cols-3 gap-8">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-56 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/50"></div>
                    ))}
                </div>

                {/* Main Content Skeleton */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Activity List Placeholder */}
                    <div className="lg:col-span-2 h-[560px] bg-slate-100 dark:bg-slate-900 rounded-[3rem] border border-slate-200/50 dark:border-slate-800/50"></div>

                    {/* Category Breakdown Sidebar Placeholder */}
                    <div className="p-8 bg-slate-100 dark:bg-slate-900 rounded-[3rem] border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-6">
                        <div className="h-6 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-xl mb-2"></div>
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex flex-col gap-2">
                                <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                                <div className="h-10 w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    /** ──────── PHASE 3: ERROR BOUNDARY ──────── */
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-500">
                <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-[2rem] mb-8">
                    <AlertCircle className="w-16 h-16 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">System Out of Sync</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-sm text-lg leading-relaxed font-medium">
                    We couldn't load your financial data right now. Please try again or contact support if the issue persists.
                </p>
                <div className="flex gap-4">
                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-3 px-10 py-4 bg-indigo-600 text-white font-bold rounded-[2rem] hover:bg-indigo-700 transition-all shadow-xl shadow-slate-200 dark:shadow-indigo-900/50 active:scale-95"
                    >
                        <RefreshCcw className="w-5 h-5" />
                        Reconnect Now
                    </button>
                </div>
            </div>
        );
    }

    /** ──────── PHASE 2: EMPTY STATE ──────── */
    const isDashboardEmpty =
        !data ||
        (data.total_income === 0 && data.total_expenses === 0 && (!data.category_breakdown || data.category_breakdown.length === 0));

    if (isDashboardEmpty) {
        return (
            <div className="space-y-10 animate-in fade-in duration-1000">
                {/* Header always stays visible even in empty state so user can still switch users if admin */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
                            Hello, <span className="text-indigo-600 dark:text-indigo-400">{data?.user_name || 'there'}</span>!
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Let's start your financial journey today.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {userRole === 'admin' && <AdminUserSwitcher onUserSelected={setSelectedUserId} />}
                        {/* FORM LEAK PATCHED: Passed targetUserId into Empty State form */}
                        <TransactionForm
                            ref={formRef}
                            categories={categories}
                            onSuccess={handleRefresh}
                            targetUserId={selectedUserId}
                        />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[4rem] p-16 text-center shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 opacity-50"></div>

                    <div className="relative z-10 flex flex-col items-center max-w-xl mx-auto">
                        <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-[2.5rem] flex items-center justify-center mb-8 rotate-3 hover:rotate-0 transition-transform duration-500 shadow-inner">
                            <Wallet className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
                        </div>

                        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight leading-tight">
                            Welcome to Finance Pulse
                        </h2>

                        <p className="text-xl text-slate-500 dark:text-slate-400 mb-12 font-medium leading-relaxed italic">
                            "Your dashboard is like a garden. Plant your first transaction to see your financial insights grow."
                        </p>

                        <button
                            onClick={() => formRef.current?.openModal()}
                            className="group relative inline-flex items-center justify-center px-12 py-5 text-xl font-bold text-white bg-indigo-600 dark:bg-indigo-500 rounded-[2.5rem] hover:bg-indigo-700 dark:hover:bg-indigo-600 hover:-translate-y-1 transition-all duration-300 shadow-2xl shadow-slate-200 dark:shadow-indigo-950/50"
                        >
                            <span>Add First Transaction</span>
                            <ChevronRight className="w-6 h-6 ml-2 transform group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    {/* Decorative Background for empty state */}
                    <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-full blur-3xl"></div>
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-violet-50/50 dark:bg-violet-900/10 rounded-full blur-3xl"></div>
                </div>
            </div>
        );
    }

    /** ──────── MAIN DASHBOARD VIEW ──────── */
    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
                        Hello, <span className="text-indigo-600 dark:text-indigo-400">{data?.user_name || 'there'}</span>!
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Here's what's happening with your finances today.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {userRole === 'admin' && (
                        <AdminUserSwitcher onUserSelected={setSelectedUserId} />
                    )}

                    {/* FORM LEAK PATCHED: Passed targetUserId into Main form */}
                    <TransactionForm
                        ref={formRef}
                        categories={categories}
                        onSuccess={handleRefresh}
                        targetUserId={selectedUserId}
                    />
                    <button
                        onClick={handleRefresh}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm active:scale-95"
                    >
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Summary Cards Top Row */}
            <div className="grid md:grid-cols-3 gap-8">
                {/* Total Income */}
                <div className="group bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200 dark:hover:shadow-indigo-900/40 hover:-translate-y-1 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/20 rounded-bl-full -z-10 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-all"></div>
                    <div className="flex items-center justify-between mb-8">
                        <div className="p-4 bg-emerald-600/10 dark:bg-emerald-500/20 rounded-3xl group-hover:scale-110 transition-transform duration-500">
                            <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg text-xs font-bold border border-emerald-100 dark:border-emerald-800/50">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Stable</span>
                        </div>
                    </div>
                    <h3 className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Total Income</h3>
                    <p className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {formatCurrency(data?.total_income || 0)}
                    </p>
                </div>

                {/* Total Expenses */}
                <div className="group bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-red-900/10 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200 dark:hover:shadow-red-900/40 hover:-translate-y-1 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 dark:bg-red-900/20 rounded-bl-full -z-10 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-all"></div>
                    <div className="flex items-center justify-between mb-8">
                        <div className="p-4 bg-red-600/10 dark:bg-red-500/20 rounded-3xl group-hover:scale-110 transition-transform duration-500">
                            <TrendingDown className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-lg text-xs font-bold border border-red-100 dark:border-red-800/50">
                            <ArrowDownRight className="w-3 h-3" />
                            <span>Attention</span>
                        </div>
                    </div>
                    <h3 className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Total Expenses</h3>
                    <p className="text-4xl font-bold text-red-600 dark:text-red-500 tracking-tight">
                        {formatCurrency(data?.total_expenses || 0)}
                    </p>
                </div>

                {/* Net Balance */}
                <div className="group bg-indigo-600 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200 dark:shadow-black/40 transition-all duration-500 hover:shadow-indigo-300 dark:hover:shadow-black/60 hover:-translate-y-1 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full -z-10 group-hover:bg-white/20 transition-all"></div>
                    <div className="flex items-center justify-between mb-8">
                        <div className="p-4 bg-white/20 rounded-3xl group-hover:scale-110 transition-transform duration-500">
                            <Wallet className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h3 className="text-indigo-100 font-bold uppercase tracking-widest text-xs mb-2">Net Balance</h3>
                    <p className="text-4xl font-extrabold text-white tracking-tight">
                        {formatCurrency(data?.net_balance || 0)}
                    </p>
                </div>
            </div>

            {/* Middle Section: Recent Transactions */}
            <div className="w-full">
                <TransactionList
                    selectedUserId={selectedUserId}
                    onTransactionChange={handleRefresh}
                    userRole={userRole}
                    categories={categories}
                />
            </div>

            {/* Bottom Section: Category Breakdown */}
            <div className="w-full bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-indigo-900/10 transition-all duration-500 hover:shadow-lg dark:hover:shadow-indigo-900/20">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                            <PieChart className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Spending Breakdown</h2>
                    </div>
                </div>

                <div className="space-y-6">
                    {data?.category_breakdown && data.category_breakdown.length > 0 ? (
                        data.category_breakdown.map((item, index) => {
                            const totalAmount = data.total_expenses || 1;
                            const percentage = (item.total / totalAmount) * 100;

                            return (
                                <div key={index} className="group relative">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-wider text-xs">
                                            {item.category_name}
                                        </span>
                                        <span className="font-bold text-red-600 dark:text-red-500">{formatCurrency(item.total)}</span>
                                    </div>
                                    <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner border border-slate-50 dark:border-slate-700/50">
                                        <div
                                            className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-1000 ease-out group-hover:bg-indigo-500 dark:group-hover:bg-indigo-400 group-hover:brightness-110"
                                            style={{
                                                width: `${percentage}%`,
                                                transitionDelay: `${index * 100}ms`
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center py-10 opacity-50">
                            <p className="font-medium text-slate-400">No category breakdown data available.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;