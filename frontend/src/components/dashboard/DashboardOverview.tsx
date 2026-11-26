import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowDownRight, ArrowUpRight, LockKeyhole, RefreshCcw, ShieldAlert } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useDashboard } from '../../hooks/useDashboard';
import { useCategories } from '../../hooks/useCategories';
import { useTransactions } from '../../hooks/useTransactions';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import AdminUserSwitcher from './AdminUserSwitcher';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
}).format(amount);

const DashboardOverview: React.FC = () => {
  const { data, loading, error, refetch: refetchDashboard, selectedUserId, setSelectedUserId } = useDashboard();
  const { categories } = useCategories();
  const { refetch: refetchTransactions } = useTransactions(5, selectedUserId);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setUserRole(profile?.role || 'viewer');
      }
    };
    fetchRole();
  }, []);

  const handleRefresh = useCallback(() => {
    refetchDashboard();
    refetchTransactions();
  }, [refetchDashboard, refetchTransactions]);

  if (loading) {
    return (
      <div role="status" aria-label="Loading your finances" className="flex flex-col gap-7">
        <div className="h-20 animate-pulse bg-surface" />
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="h-56 animate-pulse bg-secondary" />
          <div className="h-56 animate-pulse bg-surface" />
        </div>
        <div className="h-72 animate-pulse bg-surface" />
      </div>
    );
  }

  if (error && error.toLowerCase().includes('inactive')) {
    return (
      <section className="mx-auto flex max-w-xl flex-col items-center border border-border bg-surface px-6 py-16 text-center">
        <span className="mb-5 flex size-12 items-center justify-center rounded-full bg-warning/10 text-warning"><LockKeyhole aria-hidden="true" className="size-5" /></span>
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-warning">Account status</p>
        <h2 className="mt-2 text-3xl">Access is unavailable</h2>
        <p className="mt-3 max-w-sm text-[12px] leading-6 text-muted">This account is inactive, so financial data is unavailable. Contact your administrator if you think this should be changed.</p>
      </section>
    );
  }

  if (error) {
    return (
      <section role="alert" className="mx-auto flex max-w-xl flex-col items-center border border-negative/20 bg-surface px-6 py-16 text-center">
        <AlertCircle aria-hidden="true" className="size-9 text-negative" />
        <h2 className="mt-4 text-3xl">We couldn&apos;t load your finances</h2>
        <p className="mt-3 text-[12px] leading-6 text-muted">Please try again. Your recorded activity has not been changed.</p>
        <button onClick={handleRefresh} className="motion-button mt-6 inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-[11px] font-medium text-white dark:text-slate-950">
          <RefreshCcw aria-hidden="true" className="size-4" /> Try again
        </button>
      </section>
    );
  }

  const hasActivity = Boolean(data && (data.total_income !== 0 || data.total_expenses !== 0 || (data.category_breakdown?.length ?? 0) > 0));

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-moss">Personal overview</p>
          <h2 className="mt-2 text-[2.5rem] leading-[0.98] sm:text-[3.2rem]">{data?.user_name ? `Good to see you, ${data.user_name}.` : 'Your money, in view.'}</h2>
          <p className="mt-3 text-[12px] text-muted">A clear look at your recorded income and spending.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {userRole === 'admin' && <AdminUserSwitcher onUserSelected={setSelectedUserId} />}
          <TransactionForm categories={categories} onSuccess={handleRefresh} targetUserId={selectedUserId} />
          <button onClick={handleRefresh} disabled={loading} className="inline-flex min-h-10 items-center gap-2 border border-border bg-surface px-3 text-[10px] font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50" aria-label="Refresh overview">
            <RefreshCcw aria-hidden="true" className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </header>

      <section aria-label="Financial position" className="grid gap-px border border-border bg-border lg:grid-cols-[1.18fr_0.82fr]">
        <div className="relative flex min-h-[220px] flex-col justify-between overflow-hidden bg-primary p-6 text-white dark:text-slate-950 sm:p-8">
          <div aria-hidden="true" className="absolute -right-16 -top-24 size-72 rounded-full border border-white/10 dark:border-slate-950/10" />
          <div className="relative flex items-center justify-between gap-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/70 dark:text-slate-950/65">Net balance</p>
            <span className="inline-flex items-center gap-1.5 text-[9px] text-white/70 dark:text-slate-950/65"><span className={`size-1.5 rounded-full ${hasActivity ? 'bg-[#b9cfaa]' : 'bg-white/45 dark:bg-slate-950/30'}`} /> {hasActivity ? 'From your recorded activity' : 'Ready when you are'}</span>
          </div>
          <div className="relative mt-8">
            <p className="money-figure break-words text-[2.65rem] leading-none sm:text-[3.5rem]">{formatCurrency(data?.net_balance || 0)}</p>
            <p className="mt-3 max-w-sm text-[10px] leading-5 text-white/70 dark:text-slate-950/65">{hasActivity ? 'Income minus expenses, based on the activity in your account.' : 'Add your first transaction to start building a clearer picture.'}</p>
          </div>
        </div>

        <div className="flex flex-col justify-center bg-surface px-6 py-5 sm:px-8">
          <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">Money in · money out</p>
          <div className="grid gap-0 sm:grid-cols-2 sm:gap-6">
            <div className="border-b border-border py-4 sm:border-b-0 sm:border-r sm:pr-5">
              <div className="flex items-center gap-2 text-[10px] font-medium text-muted"><ArrowDownRight aria-hidden="true" className="size-3.5 text-positive" /> Income</div>
              <p className="money-figure mt-2 break-words text-[1.6rem] text-positive">{formatCurrency(data?.total_income || 0)}</p>
            </div>
            <div className="py-4 sm:pl-1">
              <div className="flex items-center gap-2 text-[10px] font-medium text-muted"><ArrowUpRight aria-hidden="true" className="size-3.5 text-negative" /> Expenses</div>
              <p className="money-figure mt-2 break-words text-[1.6rem] text-negative">{formatCurrency(data?.total_expenses || 0)}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.6fr)]">
        <TransactionList selectedUserId={selectedUserId} onTransactionChange={handleRefresh} userRole={userRole} categories={categories} />

        <section aria-labelledby="spending-breakdown-title" className="border-t border-border pt-5">
          <div className="flex items-baseline justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-moss">Where it goes</p>
              <h3 id="spending-breakdown-title" className="mt-1 text-[1.65rem]">Spending breakdown</h3>
            </div>
            <span className="text-[9px] text-muted">By category</span>
          </div>
          {data?.category_breakdown && data.category_breakdown.length > 0 ? (
            <ul className="divide-y divide-border">
              {data.category_breakdown.map((item, index) => {
                const percentage = data.total_expenses > 0 ? Math.min((item.total / data.total_expenses) * 100, 100) : 0;
                return (
                  <li key={`${item.category_name}-${index}`} className="py-4">
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <span className="truncate text-[11px] font-medium">{item.category_name}</span>
                      <span className="money-figure shrink-0 text-[11px] text-negative">{formatCurrency(item.total)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden bg-secondary" role="progressbar" aria-label={`${item.category_name} share of spending`} aria-valuenow={Math.round(percentage)} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full bg-primary transition-[width] duration-700" style={{ width: `${percentage}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-8 text-[11px] leading-5 text-muted">Your category totals will appear here as you record expenses.</div>
          )}
          {!hasActivity && <p className="mt-3 inline-flex items-center gap-2 text-[9px] text-muted"><ShieldAlert aria-hidden="true" className="size-3.5" /> Nothing is shown until you add activity.</p>}
        </section>
      </div>
    </div>
  );
};

export default DashboardOverview;
