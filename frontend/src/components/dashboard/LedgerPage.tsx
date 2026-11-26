import React, { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, ListFilter, Search, X } from 'lucide-react';
import { useTransactions } from '../../hooks/useTransactions';
import type { Transaction, TransactionFilters } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';

const LedgerPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const limit = 20;
  const { categories } = useCategories();
  const [dateFilterMode, setDateFilterMode] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<TransactionFilters>({ type: 'all', category_id: 'all', startDate: '', endDate: '', search: '' });

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => {
        if (current.search === searchTerm) return current;
        setPage(1);
        return { ...current, search: searchTerm };
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleFilterChange = (updates: Partial<TransactionFilters>) => {
    setFilters((current) => ({ ...current, ...updates }));
    setPage(1);
  };

  const handleDateModeChange = (mode: string) => {
    setDateFilterMode(mode);
    const today = new Date();
    const toLocalISODate = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    if (mode === 'all' || mode === 'custom') {
      handleFilterChange({ startDate: '', endDate: '' });
    } else if (mode === '7days') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      handleFilterChange({ startDate: toLocalISODate(lastWeek), endDate: toLocalISODate(today) });
    } else if (mode === 'thisMonth') {
      handleFilterChange({ startDate: toLocalISODate(new Date(today.getFullYear(), today.getMonth(), 1)), endDate: toLocalISODate(today) });
    } else if (mode === 'lastMonth') {
      handleFilterChange({ startDate: toLocalISODate(new Date(today.getFullYear(), today.getMonth() - 1, 1)), endDate: toLocalISODate(new Date(today.getFullYear(), today.getMonth(), 0)) });
    }
  };

  const { transactions, loading, error, totalCount } = useTransactions(limit, null, filters, page);
  const totalPages = Math.ceil(totalCount / limit);
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const month = new Date(transaction.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    (groups[month] ??= []).push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>);
  const hasFilters = Boolean(filters.type !== 'all' || filters.category_id !== 'all' || filters.startDate || filters.endDate || filters.search);

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({ type: 'all', category_id: 'all', startDate: '', endDate: '', search: '' });
    setDateFilterMode('all');
    setPage(1);
  };

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-moss">Activity workspace</p>
          <h2 className="mt-2 text-[2.6rem] leading-[0.96] sm:text-[3.3rem]">Transactions</h2>
          <p className="mt-3 text-[12px] text-muted">Find, filter, and review your financial activity.</p>
        </div>
        <p className="text-[11px] text-muted" aria-live="polite">{loading ? 'Updating results…' : `${totalCount.toLocaleString('en-IN')} ${totalCount === 1 ? 'entry' : 'entries'}${hasFilters ? ' match your filters' : ''}`}</p>
      </header>

      <section aria-label="Transaction filters" className="border-b border-border pb-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.3fr)_minmax(140px,.75fr)_minmax(160px,.9fr)_minmax(150px,.8fr)]">
          <label className="relative block">
            <span className="sr-only">Search transactions</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input type="search" aria-label="Search transactions by description" placeholder="Search descriptions…" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="min-h-11 w-full border border-border bg-surface pl-10 pr-4 text-[11px] text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/10" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="sr-only">Transaction type</span>
            <select aria-label="Filter by transaction type" value={filters.type || 'all'} onChange={(event) => handleFilterChange({ type: event.target.value as TransactionFilters['type'] })} className="min-h-11 w-full border border-border bg-surface px-3 text-[11px] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
              <option value="all">Any type</option><option value="income">Income only</option><option value="expense">Expenses only</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="sr-only">Transaction category</span>
            <select aria-label="Filter by category" value={filters.category_id || 'all'} onChange={(event) => handleFilterChange({ category_id: event.target.value })} className="min-h-11 w-full border border-border bg-surface px-3 text-[11px] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
              <option value="all">Any category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="sr-only">Transaction date range</span>
            <select aria-label="Filter by date range" value={dateFilterMode} onChange={(event) => handleDateModeChange(event.target.value)} className="min-h-11 w-full border border-border bg-surface px-3 text-[11px] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
              <option value="all">Any date</option><option value="7days">Last 7 days</option><option value="thisMonth">This month</option><option value="lastMonth">Last month</option><option value="custom">Choose dates…</option>
            </select>
          </label>
        </div>

        {dateFilterMode === 'custom' && (
          <div className="mt-3 flex flex-col gap-3 border border-border bg-surface p-3 sm:flex-row sm:items-center">
            <div className="inline-flex items-center gap-2 text-[10px] font-medium text-muted"><CalendarDays aria-hidden="true" className="size-4" /> Custom range</div>
            <label className="flex flex-1 items-center gap-2 text-[10px] text-muted">From<input type="date" aria-label="Start date" value={filters.startDate || ''} onChange={(event) => handleFilterChange({ startDate: event.target.value })} className="min-h-9 min-w-0 flex-1 border border-border bg-background px-2 text-[11px] text-foreground" /></label>
            <label className="flex flex-1 items-center gap-2 text-[10px] text-muted">To<input type="date" aria-label="End date" value={filters.endDate || ''} onChange={(event) => handleFilterChange({ endDate: event.target.value })} className="min-h-9 min-w-0 flex-1 border border-border bg-background px-2 text-[11px] text-foreground" /></label>
          </div>
        )}

        {hasFilters && <button type="button" onClick={clearFilters} className="mt-3 inline-flex min-h-8 items-center gap-1.5 text-[10px] font-medium text-muted underline decoration-border underline-offset-4 transition-colors hover:text-foreground"><X aria-hidden="true" className="size-3.5" /> Clear filters</button>}
      </section>

      {error ? (
        <div role="alert" className="border border-negative/20 bg-negative/5 px-5 py-4 text-[11px] text-negative">{error}</div>
      ) : loading && transactions.length === 0 ? (
        <div role="status" aria-label="Loading transactions" className="flex flex-col gap-3 py-4"><div className="h-10 animate-pulse bg-surface" /><div className="h-10 animate-pulse bg-surface" /><div className="h-10 animate-pulse bg-surface" /></div>
      ) : transactions.length === 0 ? (
        <div className="border-y border-border py-16 text-center">
          <ListFilter aria-hidden="true" className="mx-auto size-7 text-muted/60" />
          <h3 className="mt-4 text-2xl">No matching transactions</h3>
          <p className="mt-2 text-[11px] text-muted">Try another search or adjust the date and category filters.</p>
          {hasFilters && <button type="button" onClick={clearFilters} className="mt-4 text-[11px] font-medium text-primary underline underline-offset-4">Clear all filters</button>}
        </div>
      ) : (
        <div className="space-y-7">
          {Object.entries(groupedTransactions).map(([month, monthTransactions]) => (
            <section key={month} aria-labelledby={`month-${month.replace(/\s/g, '-')}`}>
              <div className="mb-2 flex items-baseline justify-between border-b border-border pb-2">
                <h3 id={`month-${month.replace(/\s/g, '-')}`} className="text-[1.45rem]">{month}</h3>
                <span className="text-[9px] font-medium uppercase tracking-[0.13em] text-muted">{monthTransactions.length} {monthTransactions.length === 1 ? 'entry' : 'entries'}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                      <th scope="col" className="py-3 pr-4">Transaction</th><th scope="col" className="px-4 py-3">Category</th><th scope="col" className="px-4 py-3">Date</th><th scope="col" className="py-3 pl-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {monthTransactions.map((transaction) => (
                      <tr key={transaction.id} className="motion-row transition-colors hover:bg-surface">
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <span className={`motion-icon flex size-8 shrink-0 items-center justify-center rounded-full ${transaction.type === 'income' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
                              {transaction.type === 'income' ? <ArrowUpRight aria-hidden="true" className="size-4" /> : <ArrowDownRight aria-hidden="true" className="size-4" />}
                            </span>
                            <div className="min-w-0"><p className="truncate text-[11px] font-medium text-foreground">{transaction.description || (transaction.type === 'income' ? 'Received funds' : 'Shared payment')}</p><p className="mt-0.5 text-[9px] capitalize text-muted">{transaction.type}</p></div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5"><span className="text-[10px] text-muted">{transaction.category?.name || 'General'}</span></td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-[10px] text-muted">{formatDate(transaction.date)}</td>
                        <td className={`money-figure whitespace-nowrap py-3.5 pl-4 text-right text-[12px] font-medium ${transaction.type === 'income' ? 'text-positive' : 'text-negative'}`}>{transaction.type === 'income' ? '+' : '−'}{formatCurrency(transaction.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          {totalPages > 1 && (
            <nav aria-label="Transaction pages" className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="inline-flex min-h-9 items-center gap-1 border border-border px-3 text-[10px] font-medium text-muted transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft aria-hidden="true" className="size-3.5" /> Previous</button>
              <span className="text-[10px] text-muted" aria-live="polite">Page <strong className="font-semibold text-foreground">{page}</strong> of <strong className="font-semibold text-foreground">{totalPages}</strong></span>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages || transactions.length < limit} className="inline-flex min-h-9 items-center gap-1 border border-border px-3 text-[10px] font-medium text-muted transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight aria-hidden="true" className="size-3.5" /></button>
            </nav>
          )}
        </div>
      )}
    </div>
  );
};

export default LedgerPage;
