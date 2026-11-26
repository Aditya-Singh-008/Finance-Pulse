import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, CalendarDays, ChevronDown, Clock3, Loader2, Pencil, Search, Trash2 } from 'lucide-react';
import { useTransactions } from '../../hooks/useTransactions';
import type { Transaction, TransactionFilters } from '../../hooks/useTransactions';
import type { Category } from './TransactionForm';
import TransactionForm from './TransactionForm';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import ConfirmationModal from '../common/ConfirmationModal';

interface TransactionListProps {
  selectedUserId?: string | null;
  onTransactionChange?: () => void;
  userRole?: string | null;
  categories?: Category[];
}

const TransactionList: React.FC<TransactionListProps> = ({ selectedUserId = null, onTransactionChange, userRole = null, categories = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilterMode, setDateFilterMode] = useState('all');
  const [filters, setFilters] = useState<TransactionFilters>({ type: 'all', category_id: 'all', startDate: '', endDate: '', search: '' });
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => current.search === searchTerm ? current : { ...current, search: searchTerm });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleDateModeChange = (mode: string) => {
    setDateFilterMode(mode);
    const today = new Date();
    const toLocalISODate = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const updateDates = (startDate: string, endDate: string) => setFilters((current) => ({ ...current, startDate, endDate }));

    if (mode === 'all' || mode === 'custom') updateDates('', '');
    if (mode === '7days') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      updateDates(toLocalISODate(lastWeek), toLocalISODate(today));
    }
    if (mode === 'thisMonth') updateDates(toLocalISODate(new Date(today.getFullYear(), today.getMonth(), 1)), toLocalISODate(today));
    if (mode === 'lastMonth') updateDates(toLocalISODate(new Date(today.getFullYear(), today.getMonth() - 1, 1)), toLocalISODate(new Date(today.getFullYear(), today.getMonth(), 0)));
  };

  const hasFilters = Boolean(filters.type !== 'all' || filters.category_id !== 'all' || filters.startDate || filters.endDate || filters.search);
  const fetchLimit = hasFilters ? 20 : 5;
  const { transactions, loading, error, refetch } = useTransactions(fetchLimit, selectedUserId, filters);

  const handleDelete = async () => {
    if (!idToDelete) return;
    const transactionId = idToDelete;
    setIdToDelete(null);
    setIsDeleting(transactionId);

    try {
      const { error: deleteError } = await supabase.from('transactions').delete().eq('id', transactionId);
      if (deleteError) throw deleteError;
      await refetch();
      toast.success('Transaction deleted successfully');
      onTransactionChange?.();
    } catch (deleteError: unknown) {
      const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete transaction';
      toast.error(message);
      console.error('Delete Error:', deleteError);
    } finally {
      setIsDeleting(null);
    }
  };

  if (error) {
    return (
      <section role="alert" className="border-t border-border py-8">
        <h3 className="text-2xl">Activity could not be loaded</h3>
        <p className="mt-2 text-[11px] text-muted">{error}</p>
        <button type="button" onClick={refetch} className="mt-4 min-h-9 border border-border px-3 text-[10px] font-medium text-primary hover:bg-surface">Try again</button>
      </section>
    );
  }

  return (
    <section aria-labelledby="financial-activity-title" className="min-w-0 border-t border-border pt-5">
      <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-primary"><Clock3 aria-hidden="true" className="size-4" /></span>
          <div>
            <h3 id="financial-activity-title" className="text-[1.65rem] leading-none">Financial activity</h3>
            <p className="mt-1.5 text-[9px] text-muted">{hasFilters ? `Showing up to ${fetchLimit} matches` : 'Your most recent entries'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[170px] flex-1 sm:flex-none">
            <span className="sr-only">Search transactions</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            {loading && searchTerm !== filters.search && <Loader2 aria-hidden="true" className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-primary" />}
            <input type="search" aria-label="Search transactions by description" placeholder="Search activity" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="min-h-9 w-full border border-border bg-surface pl-9 pr-8 text-[10px] text-foreground outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/10" />
          </label>
          <details className="group relative">
            <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 border border-border bg-surface px-3 text-[10px] font-medium text-muted transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
              Filters <ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 top-full z-20 mt-2 grid w-[min(290px,calc(100vw-2rem))] gap-2 border border-border bg-elevated p-3 shadow-lg sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-[9px] font-medium text-muted">Type
                <select aria-label="Filter by transaction type" value={filters.type || 'all'} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value as TransactionFilters['type'] }))} className="min-h-9 border border-border bg-background px-2 text-[10px] text-foreground">
                  <option value="all">Any type</option><option value="income">Income</option><option value="expense">Expense</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[9px] font-medium text-muted">Category
                <select aria-label="Filter by category" value={filters.category_id || 'all'} onChange={(event) => setFilters((current) => ({ ...current, category_id: event.target.value }))} className="min-h-9 border border-border bg-background px-2 text-[10px] text-foreground">
                  <option value="all">Any category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[9px] font-medium text-muted sm:col-span-2">Date range
                <select aria-label="Filter by date range" value={dateFilterMode} onChange={(event) => handleDateModeChange(event.target.value)} className="min-h-9 border border-border bg-background px-2 text-[10px] text-foreground">
                  <option value="all">Any date</option><option value="7days">Last 7 days</option><option value="thisMonth">This month</option><option value="lastMonth">Last month</option><option value="custom">Choose dates…</option>
                </select>
              </label>
              {dateFilterMode === 'custom' && (
                <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-[9px] text-muted">From<input type="date" aria-label="Start date" value={filters.startDate || ''} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} className="min-h-9 min-w-0 border border-border bg-background px-2 text-[10px] text-foreground" /></label>
                  <label className="flex flex-col gap-1 text-[9px] text-muted">To<input type="date" aria-label="End date" value={filters.endDate || ''} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} className="min-h-9 min-w-0 border border-border bg-background px-2 text-[10px] text-foreground" /></label>
                </div>
              )}
            </div>
          </details>
        </div>
      </div>

      {loading && transactions.length === 0 ? (
        <div role="status" aria-label="Loading financial activity" className="flex flex-col gap-3 py-5"><div className="h-10 animate-pulse bg-surface" /><div className="h-10 animate-pulse bg-surface" /></div>
      ) : transactions.length === 0 ? (
        <div className="border-b border-border py-9 text-center">
          <p className="font-display text-xl">No matching entries</p>
          <p className="mt-1 text-[10px] text-muted">Try a different filter, or add your first transaction.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead><tr className="border-b border-border text-[8px] font-semibold uppercase tracking-[0.14em] text-muted"><th scope="col" className="py-2.5 pr-3">Description</th><th scope="col" className="px-3 py-2.5">Category</th><th scope="col" className="px-3 py-2.5">Date</th><th scope="col" className="py-2.5 pl-3 text-right">Amount</th><th scope="col" className="w-16 py-2.5 pl-2"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-border">
              {transactions.map((transaction: Transaction) => (
                <tr key={transaction.id} className="motion-row group transition-colors hover:bg-surface">
                  <td className="py-3 pr-3"><div className="flex items-center gap-2.5"><span className={`motion-icon flex size-7 shrink-0 items-center justify-center rounded-full ${transaction.type === 'income' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>{transaction.type === 'income' ? <ArrowUpRight aria-hidden="true" className="size-3.5" /> : <ArrowDownRight aria-hidden="true" className="size-3.5" />}</span><div className="min-w-0"><p className="max-w-[190px] truncate text-[10px] font-medium">{transaction.description || (transaction.type === 'income' ? 'Received funds' : 'Shared payment')}</p><p className="mt-0.5 text-[8px] capitalize text-muted">{transaction.type}</p></div></div></td>
                  <td className="px-3 py-3 text-[9px] text-muted">{transaction.category?.name || 'General'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-[9px] text-muted">{new Date(transaction.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                  <td className={`money-figure whitespace-nowrap py-3 pl-3 text-right text-[10px] font-medium ${transaction.type === 'income' ? 'text-positive' : 'text-negative'}`}>{transaction.type === 'income' ? '+' : '−'}{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(transaction.amount)}</td>
                  <td className="py-3 pl-2"><div className="flex items-center justify-end gap-0.5">
                    {isDeleting === transaction.id ? <Loader2 aria-label="Deleting transaction" className="size-3.5 animate-spin text-negative" /> : <>
                      {userRole === 'admin' && <button type="button" onClick={() => setEditingTransaction(transaction)} className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-secondary hover:text-primary" aria-label={`Edit ${transaction.description || 'transaction'}`} title="Edit transaction"><Pencil aria-hidden="true" className="size-3.5" /></button>}
                      <button type="button" onClick={() => setIdToDelete(transaction.id)} disabled={isDeleting === transaction.id} className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-negative/10 hover:text-negative disabled:opacity-50" aria-label={`Delete ${transaction.description || 'transaction'}`} title="Delete transaction"><Trash2 aria-hidden="true" className="size-3.5" /></button>
                    </>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmationModal isOpen={Boolean(idToDelete)} title="Delete transaction" message="This transaction will be permanently removed and your overview will update." confirmLabel="Delete" isDanger onConfirm={handleDelete} onCancel={() => setIdToDelete(null)} />

      {editingTransaction && <TransactionForm transactionToEdit={editingTransaction} categories={categories} onSuccess={() => { setEditingTransaction(null); refetch(); onTransactionChange?.(); }} onCancel={() => setEditingTransaction(null)} />}

      {!hasFilters && transactions.length > 0 && (
        <div className="mt-3 flex justify-end border-t border-border pt-3">
          <Link to="/transactions" className="inline-flex min-h-8 items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-primary transition-colors hover:text-accent">View all transactions <CalendarDays aria-hidden="true" className="size-3.5" /></Link>
        </div>
      )}
    </section>
  );
};

export default TransactionList;
