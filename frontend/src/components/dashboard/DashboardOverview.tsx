import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Lock, RefreshCcw, ShieldAlert, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useCategories } from '../../hooks/useCategories';
import { useDashboard } from '../../hooks/useDashboard';
import { useTransactions } from '../../hooks/useTransactions';
import AdminUserSwitcher from './AdminUserSwitcher';
import {
  CategoryBreakdown,
  DashboardOverviewSkeleton,
  MetricCard,
} from './DashboardOverviewSections';
import TransactionForm from './TransactionForm';
import type { TransactionFormHandle } from './TransactionForm';
import TransactionList from './TransactionList';

const DashboardOverview = () => {
  const {
    data,
    loading,
    error,
    refetch: refetchDashboard,
    selectedUserId,
    setSelectedUserId,
  } = useDashboard();
  const formRef = useRef<TransactionFormHandle>(null);
  const { categories } = useCategories();
  const { refetch: refetchTransactions } = useTransactions(5, selectedUserId);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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

  const handleRefresh = useCallback(() => {
    refetchDashboard();
    refetchTransactions();
  }, [refetchDashboard, refetchTransactions]);

  if (loading) return <DashboardOverviewSkeleton />;

  if (error) {
    const isInactive = error.toLowerCase().includes('inactive');

    return (
      <section
        role="alert"
        className="mx-auto flex max-w-xl flex-col items-center rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] px-6 py-12 text-center"
      >
        <div className="mb-5 flex size-12 items-center justify-center rounded-[6px] bg-[var(--fp-bg-sunken)] text-[var(--fp-expense)]">
          {isInactive ? <Lock aria-hidden="true" className="size-6" /> : <AlertCircle aria-hidden="true" className="size-6" />}
        </div>
        <h2 className="font-serif text-3xl tracking-[-0.02em] text-slate-900 dark:text-slate-100">
          {isInactive ? 'Account access unavailable' : 'We couldn’t load your finances'}
        </h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
          {isInactive
            ? 'This account is inactive, so financial data is unavailable. Contact your administrator if you think this should be changed.'
            : 'Your financial overview is temporarily unavailable. Try refreshing the data.'}
        </p>
        {isInactive ? (
          <div className="mt-6 inline-flex items-center gap-2 rounded-[6px] border border-[var(--fp-border-default)] px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <ShieldAlert aria-hidden="true" className="size-4 text-[var(--fp-expense)]" />
            Account status
          </div>
        ) : (
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-[6px] bg-[var(--fp-brand-primary)] px-4 text-sm font-semibold text-white transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fp-brand-primary)] dark:text-slate-950"
          >
            <RefreshCcw aria-hidden="true" className="size-4" />
            Try again
          </button>
        )}
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 border-b border-[var(--fp-border-default)] pb-5 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Personal overview
            </p>
            <h1 className="font-serif text-4xl tracking-[-0.02em] text-slate-900 dark:text-slate-100 sm:text-5xl">
              Hello, {data?.user_name || 'there'}
            </h1>
          </div>
          {userRole === 'admin' && (
            <AdminUserSwitcher onUserSelected={setSelectedUserId} />
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex min-h-11 items-center gap-2 rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] px-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-[var(--fp-bg-sunken)] disabled:cursor-wait disabled:opacity-60 dark:text-slate-200"
          >
            <RefreshCcw aria-hidden="true" className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <TransactionForm
            ref={formRef}
            categories={categories}
            onSuccess={handleRefresh}
            targetUserId={selectedUserId}
          />
        </div>
      </header>

      <section aria-label="Financial summary" className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <MetricCard
          className="col-span-2 md:col-span-1"
          label="Net Balance"
          amount={data?.net_balance ?? 0}
          icon={Wallet}
          tone="balance"
        />
        <MetricCard
          label="Total Income"
          amount={data?.total_income ?? 0}
          icon={TrendingUp}
          tone="income"
        />
        <MetricCard
          label="Total Expenses"
          amount={data?.total_expenses ?? 0}
          icon={TrendingDown}
          tone="expense"
        />
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <TransactionList
            selectedUserId={selectedUserId}
            onTransactionChange={handleRefresh}
            userRole={userRole}
            categories={categories}
          />
        </div>
        <div className="min-w-0 lg:col-span-5">
          <CategoryBreakdown
            categories={data?.category_breakdown ?? []}
            totalExpenses={data?.total_expenses ?? 0}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
