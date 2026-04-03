/**
 * TransactionList.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * A clean, modern table showing recent activity.
 *
 * Architecture:
 * - Uses useTransactions hook for data state.
 * - Highlights rows on hover for a premium interactive feel.
 * - Displays a simple empty state if no transactions are found.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import type { Transaction, TransactionFilters } from '../../hooks/useTransactions';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Clock, 
  AlertCircle,
  Loader2,
  Trash2,
  Pencil
} from 'lucide-react';
import TransactionForm from './TransactionForm';
import type { Category } from './TransactionForm';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import ConfirmationModal from '../common/ConfirmationModal';

interface TransactionListProps {
  selectedUserId?: string | null;
  onTransactionChange?: () => void;
  userRole?: string | null;
  categories?: Category[];
}

const TransactionList: React.FC<TransactionListProps> = ({ 
    selectedUserId = null,
    onTransactionChange,
    userRole = null,
    categories = []
}) => {
    // Local search term for the input — drives the UI immediately
    const [searchTerm, setSearchTerm] = useState('');

    const [filters, setFilters] = useState<TransactionFilters>({
        type: 'all',
        category_id: 'all',
        startDate: '',
        endDate: '',
        search: ''
    });

    // Debounce: sync searchTerm → filters.search after 400ms of inactivity
    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters(f => {
                if (f.search === searchTerm) return f; // no-op if unchanged
                return { ...f, search: searchTerm };
            });
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const isFilterActive = filters.type !== 'all' || filters.category_id !== 'all' || filters.startDate || filters.endDate || filters.search;
    const fetchLimit = isFilterActive ? 20 : 5;

    const { transactions, loading, error, refetch } = useTransactions(fetchLimit, selectedUserId, filters);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);

    const handleDelete = async () => {
        if (!idToDelete) return;

        const transactionId = idToDelete;
        setIdToDelete(null); // Close modal
        setIsDeleting(transactionId);
        
        try {
            const { error: deleteError } = await supabase
                .from('transactions')
                .delete()
                .eq('id', transactionId);

            if (deleteError) throw deleteError;

            // Trigger refetch for the list itself
            await refetch();
            
            toast.success('Transaction deleted successfully');
            
            // Notify parent to refresh dashboard metrics
            if (onTransactionChange) {
                onTransactionChange();
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete transaction');
            console.error('Delete Error:', err);
        } finally {
            setIsDeleting(null);
        }
    };

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

    if (error) {
        return (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center py-20 text-center min-h-[400px]">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-6">
                    <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Error Loading Activity</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs">{error}</p>
                <button
                    onClick={refetch}
                    className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all active:scale-95"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-indigo-900/10 transition-all duration-500 hover:shadow-lg dark:hover:shadow-indigo-900/20 overflow-hidden">
            <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                        <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Financial Activity</h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 font-medium uppercase tracking-widest">
                        {isFilterActive ? `Showing up to ${fetchLimit} matches` : 'Your last 5 transactions'}
                    </p>
                </div>
            </div>
        </div>

            {/* Advanced Filters Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 p-6 bg-slate-50 dark:bg-slate-950/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/50">
                {/* Search (debounced) */}
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
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-slate-100 font-medium"
                    />
                </div>

                {/* Type Filter */}
                <select 
                    value={filters.type}
                    onChange={(e) => setFilters(f => ({ ...f, type: e.target.value as any }))}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-slate-100 font-bold"
                >
                    <option value="all">Any Type</option>
                    <option value="income">Income Only</option>
                    <option value="expense">Expense Only</option>
                </select>

                {/* Category Filter */}
                <select 
                    value={filters.category_id}
                    onChange={(e) => setFilters(f => ({ ...f, category_id: e.target.value }))}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-slate-100 font-bold"
                >
                    <option value="all">Any Category</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>

                {/* Date Filter Toggle / Summary */}
                <div className="flex gap-2">
                    <input 
                        type="date" 
                        value={filters.startDate}
                        onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
                        className="w-1/2 px-3 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 dark:text-slate-300 font-bold"
                    />
                    <input 
                        type="date" 
                        value={filters.endDate}
                        onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
                        className="w-1/2 px-3 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 dark:text-slate-300 font-bold"
                    />
                </div>
            </div>

            {transactions.length === 0 ? (
                <div className="flex flex-col items-center py-20 opacity-50 bg-slate-50/50 dark:bg-slate-950/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                    <Search className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
                    <p className="font-medium text-slate-400 dark:text-slate-600">No recent transactions found.</p>
                </div>
            ) : (
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <table className="w-full text-left border-separate border-spacing-y-3">
                        <thead>
                            <tr className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                                <th className="px-4 pb-2">Description</th>
                                <th className="px-4 pb-2">Category</th>
                                <th className="px-4 pb-2">Date</th>
                                <th className="px-4 pb-2 text-right">Amount</th>
                                <th className="px-4 pb-2 w-16"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((tx: Transaction) => (
                                <tr key={tx.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all">
                                    <td className="px-4 py-5 bg-white dark:bg-slate-900 border-y border-l border-slate-100 dark:border-slate-800 rounded-l-2xl group-hover:border-slate-200 dark:group-hover:border-slate-700">
                                        <div className="flex items-center gap-4">
                                            <div className={[
                                                "p-2.5 rounded-xl transition-all group-hover:scale-110 duration-300",
                                                tx.type === 'income' ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                            ].join(' ')}>
                                                {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {tx.description || (tx.type === 'income' ? 'Received Funds' : 'Shared Payment')}
                                                </div>
                                                <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                                                    {tx.type}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-5 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800 group-hover:border-slate-200 dark:group-hover:border-slate-700">
                                        <span className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold text-[11px] rounded-lg uppercase tracking-wider group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-all border border-slate-100 dark:border-slate-800">
                                            {(tx.category as any)?.name || 'General'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-5 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800 group-hover:border-slate-200 dark:group-hover:border-slate-700">
                                        <div className="font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                            {formatDate(tx.date)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-5 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800 group-hover:border-slate-200 dark:group-hover:border-slate-700 text-right">
                                        <div className={[
                                            "text-lg font-bold tracking-tight",
                                            tx.type === 'income' ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-500"
                                        ].join(' ')}>
                                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-5 bg-white dark:bg-slate-900 border-y border-r border-slate-100 dark:border-slate-800 rounded-r-2xl group-hover:border-slate-200 dark:group-hover:border-slate-700 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {isDeleting === tx.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                                            ) : (
                                                <>
                                                    {userRole === 'admin' && (
                                                        <button
                                                            onClick={() => setEditingTx(tx)}
                                                            className="p-2.5 text-slate-300 dark:text-slate-700 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all duration-200 active:scale-90"
                                                            title="Edit transaction"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setIdToDelete(tx.id)}
                                                        disabled={isDeleting === tx.id}
                                                        className="p-2.5 text-slate-300 dark:text-slate-700 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 active:scale-90 disabled:opacity-50"
                                                        title="Delete transaction"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!idToDelete}
                title="Delete Transaction"
                message="Are you sure you want to delete this transaction? This action cannot be undone and will update your dashboard metrics."
                confirmLabel="Delete"
                isDanger={true}
                onConfirm={handleDelete}
                onCancel={() => setIdToDelete(null)}
            />

            {editingTx && (
                <TransactionForm
                    transactionToEdit={editingTx}
                    categories={categories}
                    onSuccess={() => {
                        setEditingTx(null);
                        refetch();
                        if (onTransactionChange) onTransactionChange();
                    }}
                    onCancel={() => setEditingTx(null)}
                />
            )}
        </div>
    );
};

export default TransactionList;
