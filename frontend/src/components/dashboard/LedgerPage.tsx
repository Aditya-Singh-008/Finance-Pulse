import React, { useState, useEffect } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import type { Transaction, TransactionFilters } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { Link } from 'react-router-dom';
import { 
    ArrowLeft,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Loader2
} from 'lucide-react';

const LedgerPage: React.FC = () => {
    const [page, setPage] = useState(1);
    const limit = 20;

    const { categories } = useCategories();

    const [dateFilterMode, setDateFilterMode] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<TransactionFilters>({
        type: 'all',
        category_id: 'all',
        startDate: '',
        endDate: '',
        search: ''
    });

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters(f => {
                if (f.search === searchTerm) return f;
                // reset page to 1 when search fires, to avoid empty pages
                setPage(1);
                return { ...f, search: searchTerm };
            });
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // reset page to 1 when a filter matches
    const handleFilterChange = (updates: Partial<TransactionFilters>) => {
        setFilters(f => ({ ...f, ...updates }));
        setPage(1);
    };

    const handleDateModeChange = (mode: string) => {
        setDateFilterMode(mode);
        const today = new Date();
        
        // Correct timezone offset for date generation (avoiding UTC bugs)
        const toLocalISODate = (d: Date) => {
            return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        };

        if (mode === 'all') {
            handleFilterChange({ startDate: '', endDate: '' });
        } else if (mode === '7days') {
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            handleFilterChange({ 
                startDate: toLocalISODate(lastWeek), 
                endDate: toLocalISODate(today) 
            });
        } else if (mode === 'thisMonth') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            handleFilterChange({ 
                startDate: toLocalISODate(firstDay), 
                endDate: toLocalISODate(today) 
            });
        } else if (mode === 'lastMonth') {
            const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
            handleFilterChange({ 
                startDate: toLocalISODate(firstDay), 
                endDate: toLocalISODate(lastDay) 
            });
        } else if (mode === 'custom') {
            handleFilterChange({ startDate: '', endDate: '' });
        }
    };

    const { transactions, loading, error, totalCount } = useTransactions(limit, null, filters, page);

    const totalPages = Math.ceil(totalCount / limit);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Group transactions by "Month Year" (e.g. "April 2026")
    const groupedTransactions = transactions.reduce((acc, tx) => {
        const monthYear = new Date(tx.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (!acc[monthYear]) acc[monthYear] = [];
        acc[monthYear].push(tx);
        return acc;
    }, {} as Record<string, Transaction[]>);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 w-full max-w-full">
            <div className="flex items-center gap-4 mb-2">
                <Link to="/dashboard" className="p-2 bg-slate-100 dark:bg-slate-900 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </Link>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Full Ledger</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">A complete chronological history of your financial data</p>
                </div>
            </div>

            {/* Advanced Filters Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                {/* Search */}
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    {loading && searchTerm !== filters.search && (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 animate-spin" />
                    )}
                    <input 
                        type="text" 
                        placeholder="Search description..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-slate-100 font-medium"
                    />
                </div>

                {/* Type Filter */}
                <select 
                    value={filters.type}
                    onChange={(e) => handleFilterChange({ type: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-slate-100 font-bold"
                >
                    <option value="all">Any Type</option>
                    <option value="income">Income Only</option>
                    <option value="expense">Expense Only</option>
                </select>

                {/* Category Filter */}
                <select 
                    value={filters.category_id}
                    onChange={(e) => handleFilterChange({ category_id: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-slate-100 font-bold"
                >
                    <option value="all">Any Category</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>

                {/* Date Filter */}
                <div className="flex flex-col gap-2 relative">
                    <select 
                        value={dateFilterMode}
                        onChange={(e) => handleDateModeChange(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-slate-100 font-bold"
                    >
                        <option value="all">Any Date</option>
                        <option value="7days">Last 7 Days</option>
                        <option value="thisMonth">This Month</option>
                        <option value="lastMonth">Last Month</option>
                        <option value="custom">Custom Calendar...</option>
                    </select>

                    {dateFilterMode === 'custom' && (
                        <div className="flex gap-2 absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-20 animate-in fade-in slide-in-from-top-2">
                            <div className="relative w-1/2">
                                <input 
                                    type="text" 
                                    placeholder="YYYY-MM-DD"
                                    value={filters.startDate}
                                    onChange={(e) => handleFilterChange({ startDate: e.target.value })}
                                    className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-700 dark:text-slate-300 font-bold"
                                />
                                <input 
                                    type="date" 
                                    value={filters.startDate}
                                    onChange={(e) => handleFilterChange({ startDate: e.target.value })}
                                    className="absolute right-0 top-0 w-8 h-full opacity-0 cursor-pointer z-10"
                                />
                                <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                            <div className="relative w-1/2">
                                <input 
                                    type="text" 
                                    placeholder="YYYY-MM-DD"
                                    value={filters.endDate}
                                    onChange={(e) => handleFilterChange({ endDate: e.target.value })}
                                    className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-700 dark:text-slate-300 font-bold"
                                />
                                <input 
                                    type="date" 
                                    value={filters.endDate}
                                    onChange={(e) => handleFilterChange({ endDate: e.target.value })}
                                    className="absolute right-0 top-0 w-8 h-full opacity-0 cursor-pointer z-10"
                                />
                                <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {loading && transactions.length === 0 ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400 rounded-full"></div>
                </div>
            ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-3xl text-center border border-red-200 dark:border-red-900/50">
                    <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                </div>
            ) : transactions.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] border border-slate-100 dark:border-slate-800 text-center">
                    <Search className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">No transactions found in this ledger.</p>
                </div>
            ) : (
                <div className="space-y-10">
                    {Object.entries(groupedTransactions).map(([month, txs]) => (
                        <div key={month} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="bg-slate-50 border-b border-slate-100 dark:border-slate-800 dark:bg-slate-950/50 px-8 py-5 flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-indigo-500" />
                                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">{month}</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                            <th className="px-8 py-4">Transaction</th>
                                            <th className="px-8 py-4">Category</th>
                                            <th className="px-8 py-4">Date</th>
                                            <th className="px-8 py-4 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {txs.map((tx: Transaction) => (
                                            <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className={[
                                                            "p-2.5 rounded-xl transition-all duration-300",
                                                            tx.type === 'income' ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                                        ].join(' ')}>
                                                            {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900 dark:text-slate-100">
                                                                {tx.description || (tx.type === 'income' ? 'Received Funds' : 'Shared Payment')}
                                                            </div>
                                                            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-500 mt-0.5">
                                                                {tx.type}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold text-[11px] rounded-lg uppercase tracking-wider border border-slate-200 dark:border-slate-800 transition-all">
                                                        {(tx.category as any)?.name || 'General'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap text-sm">
                                                        {formatDate(tx.date)}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className={[
                                                        "text-lg font-bold tracking-tight",
                                                        tx.type === 'income' ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-500"
                                                    ].join(' ')}>
                                                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mt-8">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-xs"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Previous
                            </button>
                            <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                                Page <strong className="text-slate-900 dark:text-white">{page}</strong> of <strong className="text-slate-900 dark:text-white">{totalPages}</strong>
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || transactions.length < limit}
                                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-xs"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LedgerPage;
