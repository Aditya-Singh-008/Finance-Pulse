import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Loader2,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import ConfirmationModal from '../common/ConfirmationModal';
import { useCategories } from '../../hooks/useCategories';
import { useTransactions } from '../../hooks/useTransactions';
import type { Transaction, TransactionFilters } from '../../hooks/useTransactions';
import TransactionForm from './TransactionForm';
import type { TransactionFormHandle } from './TransactionForm';
import LedgerDatePicker from './LedgerDatePicker';

type DateFilterMode = 'all' | '7days' | 'thisMonth' | 'lastMonth' | 'custom';

const PAGE_SIZE = 20;
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const toLocalISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dateFromISO = (date: string) => new Date(`${date.slice(0, 10)}T00:00:00`);

const formatDate = (date: string) =>
  dateFromISO(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const getMonthYear = (date: string) =>
  dateFromISO(date).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

const getDateRange = (mode: Exclude<DateFilterMode, 'all' | 'custom'>) => {
  const today = new Date();
  if (mode === '7days') {
    const start = new Date(today);
    start.setDate(start.getDate() - 7);
    return { startDate: toLocalISODate(start), endDate: toLocalISODate(today) };
  }
  if (mode === 'thisMonth') {
    return {
      startDate: toLocalISODate(new Date(today.getFullYear(), today.getMonth(), 1)),
      endDate: toLocalISODate(today),
    };
  }
  return {
    startDate: toLocalISODate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
    endDate: toLocalISODate(new Date(today.getFullYear(), today.getMonth(), 0)),
  };
};

const getActiveDateLabel = (startDate: string, endDate: string) => {
  if (startDate && endDate) return `${formatDate(startDate)} – ${formatDate(endDate)}`;
  if (startDate) return `From ${formatDate(startDate)}`;
  return `Through ${formatDate(endDate)}`;
};

const groupByMonth = (transactions: Transaction[]) => {
  const groups = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    const month = getMonthYear(transaction.date);
    const monthTransactions = groups.get(month) ?? [];
    monthTransactions.push(transaction);
    groups.set(month, monthTransactions);
  }
  return Array.from(groups.entries());
};

const FilterChip = ({ label, onRemove, ariaLabel, numeric = false }: { label: string; onRemove: () => void; ariaLabel: string; numeric?: boolean }) => (
  <button
    type="button"
    onClick={onRemove}
    aria-label={ariaLabel}
    className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-[var(--fp-bg-sunken)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fp-brand-primary)] dark:text-slate-200"
  >
    <span className={`truncate ${numeric ? 'fp-num' : ''}`}>{label}</span>
    <X aria-hidden="true" className="size-3.5 shrink-0" />
  </button>
);

const DesktopSkeleton = () => (
  <div aria-hidden="true" className="hidden overflow-hidden rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] md:block">
    <div className="h-12 bg-[var(--fp-bg-sunken)]" />
    <div className="divide-y divide-[var(--fp-border-default)]">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="grid h-12 grid-cols-[minmax(8rem,1fr)_minmax(7rem,1fr)_9rem_9rem_6rem] items-center gap-4 px-4">
          <span className="h-3 w-2/3 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
          <span className="h-3 w-1/2 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
          <span className="h-3 w-16 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
          <span className="ml-auto h-3 w-20 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
          <span className="ml-auto h-8 w-14 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
        </div>
      ))}
    </div>
  </div>
);

const MobileSkeleton = () => (
  <div aria-hidden="true" className="flex flex-col gap-2 md:hidden">
    {Array.from({ length: 6 }, (_, index) => (
      <div key={index} className="flex h-[82px] flex-col justify-center gap-3 rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] px-3">
        <div className="flex items-center justify-between gap-4">
          <span className="h-3 w-2/3 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
          <span className="h-3 w-20 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
        </div>
        <div className="flex items-center gap-3">
          <span className="h-3 w-16 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
          <span className="h-5 w-20 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
        </div>
      </div>
    ))}
  </div>
);

const LedgerSkeleton = () => (
  <div role="status" aria-label="Loading transactions" className="space-y-2">
    <span className="sr-only">Loading transactions</span>
    <DesktopSkeleton />
    <MobileSkeleton />
  </div>
);

const LedgerPage = () => {
  const [page, setPage] = useState(1);
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<TransactionFilters>({
    type: 'all',
    category_id: 'all',
    startDate: '',
    endDate: '',
    search: '',
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<string | null>(null);
  const createFormRef = useRef<TransactionFormHandle>(null);
  const dateSelectRef = useRef<HTMLSelectElement>(null);
  const { categories } = useCategories();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((currentFilters) => {
        if (currentFilters.search === searchTerm) return currentFilters;
        setPage(1);
        return { ...currentFilters, search: searchTerm };
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false;
    const fetchRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (!cancelled) setUserRole(profile?.role || 'viewer');
    };
    void fetchRole();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFilterChange = (updates: Partial<TransactionFilters>) => {
    setFilters((currentFilters) => ({ ...currentFilters, ...updates }));
    setPage(1);
  };

  const handleDateModeChange = (mode: DateFilterMode) => {
    setDateFilterMode(mode);
    if (mode === 'custom') {
      setIsDatePickerOpen(true);
      return;
    }
    setIsDatePickerOpen(false);
    if (mode === 'all') {
      handleFilterChange({ startDate: '', endDate: '' });
      return;
    }
    handleFilterChange(getDateRange(mode));
  };

  const { transactions, loading, error, totalCount, refetch } = useTransactions(20, null, filters, page);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const groupedTransactions = useMemo(() => groupByMonth(transactions), [transactions]);
  const hasActiveFilters = Boolean(
    filters.search ||
    (filters.type && filters.type !== 'all') ||
    (filters.category_id && filters.category_id !== 'all') ||
    filters.startDate ||
    filters.endDate,
  );

  const clearDateFilter = () => {
    setDateFilterMode('all');
    setIsDatePickerOpen(false);
    handleFilterChange({ startDate: '', endDate: '' });
  };

  const clearAllFilters = () => {
    setDateFilterMode('all');
    setSearchTerm('');
    setIsDatePickerOpen(false);
    handleFilterChange({ type: 'all', category_id: 'all', startDate: '', endDate: '', search: '' });
  };

  const handleDelete = async () => {
    if (!transactionToDelete) return;
    const transactionId = transactionToDelete;
    setTransactionToDelete(null);
    setDeletingTransaction(transactionId);
    try {
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);
      if (deleteError) throw deleteError;
      toast.success('Transaction deleted successfully');
      if (transactions.length === 1 && page > 1) {
        setPage((currentPage) => Math.max(1, currentPage - 1));
      } else {
        await refetch();
      }
    } catch (deleteError: unknown) {
      const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete transaction';
      toast.error(message);
    } finally {
      setDeletingTransaction(null);
    }
  };

  const transactionName = (transaction: Transaction) =>
    transaction.description || (transaction.type === 'income' ? 'Received Funds' : 'Shared Payment');

  const renderActions = (transaction: Transaction, mobile = false) => (
    <div className={`flex items-center justify-end gap-1 ${mobile ? '' : 'fp-ledger-actions opacity-0 transition-opacity duration-[160ms] group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100'}`}>
      {deletingTransaction === transaction.id ? (
        <span role="status" aria-label="Deleting transaction" className="flex size-9 items-center justify-center">
          <Loader2 aria-hidden="true" className="size-4 animate-spin text-[var(--fp-expense)]" />
        </span>
      ) : (
        <>
          {userRole === 'admin' && (
            <button
              type="button"
              onClick={() => setEditingTransaction(transaction)}
              aria-label={`Edit ${transactionName(transaction)}`}
              title="Edit transaction"
              className="flex size-9 min-w-9 items-center justify-center rounded-[6px] text-slate-500 transition-colors hover:bg-[var(--fp-bg-surface)] hover:text-[var(--fp-brand-primary)] focus-visible:outline-2 focus-visible:outline-[var(--fp-brand-primary)] dark:text-slate-300"
            >
              <Pencil aria-hidden="true" className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setTransactionToDelete(transaction.id)}
            aria-label={`Delete ${transactionName(transaction)}`}
            title="Delete transaction"
            className="flex size-9 min-w-9 items-center justify-center rounded-[6px] text-slate-500 transition-colors hover:bg-[var(--fp-bg-surface)] hover:text-[var(--fp-expense)] focus-visible:outline-2 focus-visible:outline-[var(--fp-expense)] dark:text-slate-300"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </>
      )}
    </div>
  );

  const renderDesktopTable = (month: string, monthTransactions: Transaction[]) => (
    <section key={month} aria-label={month} className="hidden overflow-hidden rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] md:block">
      <div className="flex items-center gap-2 border-b border-[var(--fp-border-default)] bg-[var(--fp-bg-sunken)] px-4 py-3">
        <CalendarDays aria-hidden="true" className="size-4 text-[var(--fp-brand-primary)]" />
        <h2 className="fp-num text-sm font-semibold text-slate-800 dark:text-slate-100">{month}</h2>
        <span className="fp-num ml-auto text-xs text-slate-500 dark:text-slate-400">{monthTransactions.length} {monthTransactions.length === 1 ? 'record' : 'records'}</span>
      </div>
      <table className="w-full table-fixed text-left">
        <thead className="h-12 bg-[var(--fp-bg-sunken)] text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">
          <tr>
            <th scope="col" className="w-[6.5rem] px-4">Date</th>
            <th scope="col" className="px-4">Description</th>
            <th scope="col" className="w-[13rem] px-4">Category</th>
            <th scope="col" className="w-[11rem] px-4 text-right">Amount</th>
            <th scope="col" className="w-[6.5rem] px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--fp-border-default)]">
          {monthTransactions.map((transaction) => {
            const isIncome = transaction.type === 'income';
            return (
              <tr key={transaction.id} className="group h-12 transition-colors duration-150 hover:bg-[var(--fp-bg-sunken)] focus-within:bg-[var(--fp-bg-sunken)]">
                <td className="fp-num px-4 text-xs text-slate-600 dark:text-slate-300">
                  <time dateTime={transaction.date}>{formatDate(transaction.date)}</time>
                </td>
                <td className="px-4">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100" title={transactionName(transaction)}>{transactionName(transaction)}</p>
                  <p className="text-[10px] capitalize text-slate-500 dark:text-slate-400">{transaction.type}</p>
                </td>
                <td className="px-4">
                  <span className="inline-flex max-w-full truncate rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)] px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200">
                    {transaction.category?.name || 'General'}
                  </span>
                </td>
                <td className={`fp-num whitespace-nowrap px-4 text-right text-sm font-semibold ${isIncome ? 'text-[var(--fp-income)]' : 'text-[var(--fp-expense)]'}`}>
                  {isIncome ? '+' : '-'}{currencyFormatter.format(transaction.amount)}
                </td>
                <td className="px-3">{renderActions(transaction)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );

  const renderMobileGroup = (month: string, monthTransactions: Transaction[]) => (
    <section key={month} aria-label={month} className="md:hidden">
      <header className="mb-2 flex items-center justify-between rounded-[6px] bg-[var(--fp-bg-sunken)] px-3 py-2">
        <h2 className="fp-num text-xs font-semibold text-slate-700 dark:text-slate-200">{month}</h2>
        <span className="fp-num text-[10px] text-slate-500 dark:text-slate-400">{monthTransactions.length} {monthTransactions.length === 1 ? 'record' : 'records'}</span>
      </header>
      <ul className="flex flex-col gap-2">
        {monthTransactions.map((transaction) => {
          const isIncome = transaction.type === 'income';
          const DirectionIcon = isIncome ? ArrowUpRight : ArrowDownRight;
          return (
            <li key={transaction.id} className="rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] px-3 py-2.5 transition-colors duration-150">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <DirectionIcon aria-hidden="true" className={`size-4 shrink-0 ${isIncome ? 'text-[var(--fp-income)]' : 'text-[var(--fp-expense)]'}`} />
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{transactionName(transaction)}</p>
                </div>
                <span className={`fp-num shrink-0 text-xs font-semibold ${isIncome ? 'text-[var(--fp-income)]' : 'text-[var(--fp-expense)]'}`}>
                  {isIncome ? '+' : '-'}{currencyFormatter.format(transaction.amount)}
                </span>
              </div>
              <div className="mt-1.5 flex min-w-0 items-center gap-2">
                <time className="fp-num shrink-0 text-[11px] text-slate-500 dark:text-slate-400" dateTime={transaction.date}>{formatDate(transaction.date)}</time>
                <span className="max-w-[7rem] truncate rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)] px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">{transaction.category?.name || 'General'}</span>
                <div className="ml-auto">{renderActions(transaction, true)}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );

  const isFilteredEmpty = hasActiveFilters;

  return (
    <div className="w-full space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-4xl tracking-[-0.035em] text-slate-900 dark:text-slate-100">Transactions</h1>
            <span aria-label={`${totalCount} matching transactions`} className="fp-num inline-flex min-h-7 items-center rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] px-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {totalCount.toLocaleString('en-IN')} matches
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A searchable, filterable record of every transaction.</p>
        </div>
        <div className="shrink-0">
          <TransactionForm
            ref={createFormRef}
            categories={categories}
            onSuccess={() => { void refetch(); }}
          />
        </div>
      </header>

      <section aria-label="Transaction filters" className="sticky top-0 z-20 rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)]/95 p-3 shadow-sm backdrop-blur sm:p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(15rem,1.5fr)_minmax(9rem,0.8fr)_minmax(11rem,1fr)_minmax(10rem,0.9fr)]">
          <label className="relative block min-w-0">
            <span className="sr-only">Search transactions by description</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              aria-label="Search transactions by description"
              placeholder="Search transactions…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="min-h-11 w-full rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] pl-9 pr-10 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--fp-brand-primary)] focus:ring-2 focus:ring-[var(--fp-brand-primary)]/20 dark:text-slate-100"
            />
            {searchTerm ? (
              <button type="button" onClick={() => { setSearchTerm(''); handleFilterChange({ search: '' }); }} aria-label="Clear search" className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-[6px] text-slate-500 hover:bg-[var(--fp-bg-sunken)] dark:text-slate-300">
                <X aria-hidden="true" className="size-4" />
              </button>
            ) : null}
          </label>

          <label className="block min-w-0">
            <span className="sr-only">Filter by transaction type</span>
            <select
              aria-label="Filter by transaction type"
              value={filters.type ?? 'all'}
              onChange={(event) => handleFilterChange({ type: event.target.value as TransactionFilters['type'] })}
              className="min-h-11 w-full rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] px-3 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-[var(--fp-brand-primary)] focus:ring-2 focus:ring-[var(--fp-brand-primary)]/20 dark:text-slate-200"
            >
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </label>

          <label className="block min-w-0">
            <span className="sr-only">Filter by category</span>
            <select
              aria-label="Filter by category"
              value={filters.category_id ?? 'all'}
              onChange={(event) => handleFilterChange({ category_id: event.target.value })}
              className="min-h-11 w-full rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] px-3 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-[var(--fp-brand-primary)] focus:ring-2 focus:ring-[var(--fp-brand-primary)]/20 dark:text-slate-200"
            >
              <option value="all">All categories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>

          <div className="relative min-w-0">
            <label className="block">
              <span className="sr-only">Filter by date range</span>
              <div className="relative">
                <select
                  ref={dateSelectRef}
                  aria-label="Filter by date range"
                  value={dateFilterMode}
                  onChange={(event) => handleDateModeChange(event.target.value as DateFilterMode)}
                  className="min-h-11 w-full rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] px-3 pr-10 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-[var(--fp-brand-primary)] focus:ring-2 focus:ring-[var(--fp-brand-primary)]/20 dark:text-slate-200"
                >
                  <option value="all">Any date</option>
                  <option value="7days">Last 7 days</option>
                  <option value="thisMonth">This month</option>
                  <option value="lastMonth">Last month</option>
                  <option value="custom">Custom dates…</option>
                </select>
                {dateFilterMode === 'custom' && !isDatePickerOpen && (
                  <button type="button" onClick={() => setIsDatePickerOpen(true)} aria-label="Edit custom date range" className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-[6px] text-slate-500 hover:bg-[var(--fp-bg-sunken)] dark:text-slate-300">
                    <CalendarDays aria-hidden="true" className="size-4" />
                  </button>
                )}
              </div>
            </label>
            {isDatePickerOpen && (
              <LedgerDatePicker
                startDate={filters.startDate ?? ''}
                endDate={filters.endDate ?? ''}
                onApply={(startDate, endDate) => {
                  handleFilterChange({ startDate, endDate });
                  setDateFilterMode(startDate || endDate ? 'custom' : 'all');
                  setIsDatePickerOpen(false);
                  dateSelectRef.current?.focus();
                }}
                onClose={() => {
                  setIsDatePickerOpen(false);
                  if (!filters.startDate && !filters.endDate) setDateFilterMode('all');
                  dateSelectRef.current?.focus();
                }}
              />
            )}
          </div>
        </div>
      </section>

      {hasActiveFilters && (
        <section aria-label="Active filters" className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Filtered by</span>
          {filters.search && <FilterChip label={`Search: ${filters.search}`} ariaLabel="Remove search filter" onRemove={() => { setSearchTerm(''); handleFilterChange({ search: '' }); }} />}
          {filters.type && filters.type !== 'all' && <FilterChip label={`Type: ${filters.type}`} ariaLabel="Remove type filter" onRemove={() => handleFilterChange({ type: 'all' })} />}
          {filters.category_id && filters.category_id !== 'all' && <FilterChip label={`Category: ${categories.find((category) => category.id === filters.category_id)?.name || 'Selected category'}`} ariaLabel="Remove category filter" onRemove={() => handleFilterChange({ category_id: 'all' })} />}
          {(filters.startDate || filters.endDate) && <FilterChip label={`Date: ${getActiveDateLabel(filters.startDate ?? '', filters.endDate ?? '')}`} ariaLabel="Remove date range filter" onRemove={clearDateFilter} numeric />}
          <button type="button" onClick={clearAllFilters} className="min-h-8 rounded-[6px] px-2 text-xs font-semibold text-[var(--fp-brand-primary)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fp-brand-primary)] dark:text-[#b7c7ad]">Clear all</button>
        </section>
      )}

      {loading ? <LedgerSkeleton /> : error ? (
        <section role="alert" className="flex min-h-52 flex-col items-center justify-center rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] px-6 text-center">
          <AlertCircle aria-hidden="true" className="mb-3 size-6 text-[var(--fp-expense)]" />
          <h2 className="font-serif text-2xl text-slate-900 dark:text-slate-100">Couldn’t load transactions</h2>
          <p className="mt-2 max-w-lg text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <button type="button" onClick={() => void refetch()} className="mt-4 min-h-11 rounded-[6px] px-4 text-sm font-semibold text-[var(--fp-brand-primary)] hover:bg-[var(--fp-bg-sunken)] dark:text-[#b7c7ad]">Try again</button>
        </section>
      ) : transactions.length === 0 ? (
        <section className="flex min-h-64 flex-col items-center justify-center rounded-[10px] border border-dashed border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] px-6 py-10 text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-[10px] bg-[var(--fp-bg-sunken)] text-[var(--fp-brand-primary)]">
            {isFilteredEmpty ? <Search aria-hidden="true" className="size-5" /> : <CirclePlus aria-hidden="true" className="size-5" />}
          </span>
          <h2 className="font-serif text-2xl tracking-[-0.02em] text-slate-900 dark:text-slate-100">
            {isFilteredEmpty ? 'No matching transactions' : 'No transactions yet'}
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            {isFilteredEmpty ? 'Try adjusting your search or filters to find the record you need.' : 'Add your first transaction to start building a clearer picture of your money.'}
          </p>
          {isFilteredEmpty ? (
            <button type="button" onClick={clearAllFilters} className="mt-4 min-h-11 rounded-[6px] px-4 text-sm font-semibold text-[var(--fp-brand-primary)] hover:bg-[var(--fp-bg-sunken)] dark:text-[#b7c7ad]">Clear all filters</button>
          ) : (
            <button type="button" onClick={() => createFormRef.current?.openModal()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[6px] bg-[var(--fp-brand-primary)] px-4 text-sm font-semibold text-white transition-[filter] hover:brightness-95 dark:text-slate-950">
              <CirclePlus aria-hidden="true" className="size-4" /> New Transaction
            </button>
          )}
        </section>
      ) : (
        <div className="space-y-5">
          {groupedTransactions.map(([month, monthTransactions]) => (
            <div key={month} className="space-y-3">
              {renderDesktopTable(month, monthTransactions)}
              {renderMobileGroup(month, monthTransactions)}
            </div>
          ))}
        </div>
      )}

      {totalCount > 0 && (
        <footer aria-label="Transaction pagination" className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] px-3 py-3 sm:px-4">
          <button
            type="button"
            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            disabled={page <= 1 || loading}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)] px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-[var(--fp-bg-sunken)] disabled:cursor-not-allowed disabled:opacity-45 dark:text-slate-200 sm:px-3"
          >
            <ChevronLeft aria-hidden="true" className="size-4" /> <span>Previous</span>
          </button>
          <p className="fp-num text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
            Page <strong className="font-semibold text-slate-900 dark:text-slate-100">{page}</strong> of <strong className="font-semibold text-slate-900 dark:text-slate-100">{totalPages}</strong>
          </p>
          <button
            type="button"
            onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
            disabled={page >= totalPages || loading}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)] px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-[var(--fp-bg-sunken)] disabled:cursor-not-allowed disabled:opacity-45 dark:text-slate-200 sm:px-3"
          >
            <span>Next</span> <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </footer>
      )}

      {editingTransaction && (
        <TransactionForm
          key={editingTransaction.id}
          transactionToEdit={editingTransaction}
          categories={categories}
          onSuccess={() => {
            setEditingTransaction(null);
            void refetch();
          }}
          onCancel={() => setEditingTransaction(null)}
        />
      )}

      <ConfirmationModal
        isOpen={Boolean(transactionToDelete)}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone and will update your dashboard metrics."
        confirmLabel="Delete"
        isDanger
        onConfirm={() => void handleDelete()}
        onCancel={() => setTransactionToDelete(null)}
      />
    </div>
  );
};

export default LedgerPage;
