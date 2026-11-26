import React from 'react';
import { Activity, AlertCircle, ArrowDownRight, ArrowUpRight, BarChart3, Download, RefreshCcw, ShieldCheck, Users } from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { usePlatformAnalytics } from '../../hooks/usePlatformAnalytics';
import ExportCsvButton from './ExportCsvButton';

const CHART_COLORS = ['#536b4a', '#b87555', '#9a7e63', '#82917a', '#8d6451', '#65716a'];

const AnalystDashboard: React.FC = () => {
  const { data, loading, error, refetch } = usePlatformAnalytics();
  const [mounted, setMounted] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);

  React.useEffect(() => setMounted(true), []);

  if (loading) {
    return <div role="status" aria-label="Loading platform analytics" className="flex flex-col gap-5"><div className="h-16 animate-pulse bg-surface" /><div className="h-[340px] animate-pulse bg-surface" /><div className="grid gap-5 md:grid-cols-2"><div className="h-64 animate-pulse bg-surface" /><div className="h-64 animate-pulse bg-surface" /></div></div>;
  }

  if (error) {
    const inactive = error.toLowerCase().includes('inactive') || error.toLowerCase().includes('forbidden');
    return (
      <section role="alert" className="mx-auto flex max-w-xl flex-col items-center border border-border bg-surface px-6 py-16 text-center">
        <AlertCircle aria-hidden="true" className={`size-9 ${inactive ? 'text-warning' : 'text-negative'}`} />
        <p className="mt-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">{inactive ? 'Account status' : 'Shared analytics'}</p>
        <h2 className="mt-2 text-3xl">{inactive ? 'Analyst access unavailable' : 'Analytics could not be loaded'}</h2>
        <p className="mt-3 max-w-sm text-[11px] leading-6 text-muted">{inactive ? 'Your analyst access is inactive. Contact an administrator if you think this should be changed.' : error}</p>
        {!inactive && <button type="button" onClick={() => refetch()} className="motion-button mt-6 inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-[10px] font-medium text-white dark:text-slate-950"><RefreshCcw aria-hidden="true" className="size-3.5" /> Try again</button>}
      </section>
    );
  }

  const analytics = data || { total_platform_users: 0, total_transaction_volume: 0, platform_total_income: 0, platform_total_expenses: 0, total_transaction_count: 0, category_breakdown: [], daily_trends: [] };
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  const formatNumber = (value: number) => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  const categories = analytics.category_breakdown || [];
  const totalCategorySpend = categories.reduce((total, category) => total + (Number(category.value) || 0), 0);
  const totalActivity = analytics.platform_total_income + analytics.platform_total_expenses;
  const incomeShare = totalActivity > 0 ? analytics.platform_total_income / totalActivity : 0;
  const expenseShare = totalActivity > 0 ? analytics.platform_total_expenses / totalActivity : 0;

  return (
    <div className="space-y-8 pb-8">
      <header className="flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-moss"><ShieldCheck aria-hidden="true" className="size-3.5" /> Shared analytics</p>
          <h2 className="mt-2 text-[2.6rem] leading-[0.96] sm:text-[3.3rem]">Platform activity</h2>
          <p className="mt-3 max-w-xl text-[11px] text-muted">An aggregate view of recorded activity across Finance Pulse accounts.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => refetch()} className="inline-flex min-h-10 items-center gap-2 border border-border bg-surface px-3 text-[10px] font-medium text-muted transition-colors hover:text-foreground"><RefreshCcw aria-hidden="true" className="size-3.5" /> Refresh</button>
          <ExportCsvButton />
        </div>
      </header>

      <section aria-label="Platform summary" className="grid border-y border-border sm:grid-cols-3">
        <div className="flex items-center gap-4 border-b border-border py-4 sm:border-b-0 sm:border-r sm:pr-5">
          <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-primary"><Users aria-hidden="true" className="size-4" /></span>
          <div><p className="text-[9px] font-medium uppercase tracking-[0.13em] text-muted">Platform users</p><p className="money-figure mt-1 text-[1.65rem]">{formatNumber(analytics.total_platform_users)}</p></div>
        </div>
        <div className="flex items-center gap-4 border-b border-border py-4 sm:border-b-0 sm:border-r sm:px-5">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent/10 text-accent"><Activity aria-hidden="true" className="size-4" /></span>
          <div><p className="text-[9px] font-medium uppercase tracking-[0.13em] text-muted">Transaction volume</p><p className="money-figure mt-1 text-[1.65rem]">{formatCurrency(analytics.total_transaction_volume)}</p></div>
        </div>
        <div className="flex items-center gap-4 py-4 sm:pl-5">
          <span className="flex size-9 items-center justify-center rounded-full bg-surface text-muted"><BarChart3 aria-hidden="true" className="size-4" /></span>
          <div><p className="text-[9px] font-medium uppercase tracking-[0.13em] text-muted">Recorded transactions</p><p className="money-figure mt-1 text-[1.65rem]">{formatNumber(analytics.total_transaction_count)}</p></div>
        </div>
      </section>

      <section aria-labelledby="platform-trend-title" className="border border-border bg-surface p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-moss">Movement over time</p>
            <h3 id="platform-trend-title" className="mt-1 text-[1.8rem]">Income and spending</h3>
            <p className="mt-1 text-[10px] text-muted">Daily totals in the reporting window returned by the analytics service.</p>
          </div>
          <div className="flex flex-wrap gap-4 text-[9px] font-medium text-muted">
            <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-primary" /> Income</span>
            <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-accent" /> Expenses</span>
          </div>
        </div>

        <div className="mt-5 h-[280px] w-full sm:h-[340px]" role="img" aria-label="Daily platform-wide income and expense trend">
          {mounted && analytics.daily_trends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.daily_trends} margin={{ top: 12, right: 14, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 5" vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={28} tick={{ fill: 'var(--muted)', fontSize: 9 }} tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} />
                <YAxis axisLine={false} tickLine={false} width={52} tick={{ fill: 'var(--muted)', fontSize: 9 }} tickFormatter={(value) => `₹${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--rule)', borderRadius: '4px', padding: '10px', boxShadow: '0 12px 32px rgba(25,31,24,.1)' }} itemStyle={{ color: 'var(--ink)', fontSize: '11px', fontWeight: 500 }} labelStyle={{ color: 'var(--muted)', marginBottom: '4px', fontSize: '9px' }} formatter={(value) => formatCurrency(Number(value))} labelFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} />
                <Line type="monotone" dataKey="income" name="Income" stroke="var(--chart-income)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="expense" name="Expenses" stroke="var(--chart-expense)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full place-items-center border border-dashed border-border text-center">
              <div><Activity aria-hidden="true" className="mx-auto size-6 text-muted/60" /><p className="mt-3 text-[11px] text-muted">No daily trend data is available for this reporting window.</p></div>
            </div>
          )}
        </div>
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_1fr]">
        <section aria-labelledby="category-chart-title" className="border-t border-border pt-5">
          <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
            <div><p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-moss">Distribution</p><h3 id="category-chart-title" className="mt-1 text-[1.65rem]">Spending by category</h3></div>
            <span className="text-[9px] text-muted">{categories.length} categories</span>
          </div>
          {categories.length > 0 ? (
            <div className="grid items-center gap-4 py-3 sm:grid-cols-[minmax(160px,.9fr)_minmax(180px,1.1fr)]">
              <div className="h-[220px] min-w-0" role="img" aria-label="Platform expenses by category">
                {mounted && <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={56} outerRadius={84} paddingAngle={2} stroke="none" onMouseEnter={(_, index) => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(-1)}>
                  {categories.map((category, index) => <Cell key={`${category.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} opacity={activeIndex === -1 || activeIndex === index ? 1 : 0.36} />)}
                </Pie><Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0];
                  const share = totalCategorySpend > 0 ? (Number(item.value) / totalCategorySpend) * 100 : 0;
                  return <div className="border border-border bg-elevated px-3 py-2 shadow-lg"><p className="text-[9px] text-muted">{item.name}</p><p className="money-figure mt-1 text-[11px] font-medium">{formatCurrency(Number(item.value))} <span className="text-muted">· {share.toFixed(1)}%</span></p></div>;
                }} /></PieChart></ResponsiveContainer>}
              </div>
              <ul className="divide-y divide-border">
                {categories.map((category, index) => {
                  const value = Number(category.value) || 0;
                  const share = totalCategorySpend > 0 ? (value / totalCategorySpend) * 100 : 0;
                  return <li key={`${category.name}-${index}`} className="flex items-center justify-between gap-3 py-2.5"><span className="flex min-w-0 items-center gap-2 text-[10px] text-muted"><span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} /><span className="truncate">{category.name}</span></span><span className="money-figure shrink-0 text-right text-[10px] font-medium text-foreground">{formatCurrency(value)}<span className="ml-2 text-[9px] font-normal text-muted">{share.toFixed(0)}%</span></span></li>;
                })}
              </ul>
            </div>
          ) : <p className="py-10 text-[11px] text-muted">No category totals are available yet.</p>}
        </section>

        <section aria-labelledby="flow-comparison-title" className="border-t border-border pt-5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-moss">Aggregate totals</p>
          <h3 id="flow-comparison-title" className="mt-1 text-[1.65rem]">Money in · money out</h3>
          <p className="mt-1 text-[10px] text-muted">Relative share of total recorded income and expenses.</p>
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4 border-b border-border pb-3"><div><p className="inline-flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.12em] text-muted"><ArrowDownRight aria-hidden="true" className="size-3.5 text-positive" /> Income</p><p className="money-figure mt-1 text-[1.6rem] text-positive">{formatCurrency(analytics.platform_total_income)}</p></div><span className="text-[10px] text-muted">{(incomeShare * 100).toFixed(0)}%</span></div>
            <div className="flex items-end justify-between gap-4 border-b border-border pb-3"><div><p className="inline-flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.12em] text-muted"><ArrowUpRight aria-hidden="true" className="size-3.5 text-negative" /> Expenses</p><p className="money-figure mt-1 text-[1.6rem] text-negative">{formatCurrency(analytics.platform_total_expenses)}</p></div><span className="text-[10px] text-muted">{(expenseShare * 100).toFixed(0)}%</span></div>
          </div>
          <div className="mt-5 flex h-2 overflow-hidden bg-secondary" role="img" aria-label={`Income makes up ${(incomeShare * 100).toFixed(0)} percent and expenses ${(expenseShare * 100).toFixed(0)} percent of recorded flow`}><div className="h-full bg-primary transition-[width] duration-700" style={{ width: `${incomeShare * 100}%` }} /><div className="h-full bg-accent transition-[width] duration-700" style={{ width: `${expenseShare * 100}%` }} /></div>
          <p className="mt-3 inline-flex items-center gap-2 text-[9px] text-muted"><Download aria-hidden="true" className="size-3.5" /> Export uses the platform report available to your role.</p>
        </section>
      </div>
    </div>
  );
};

export default AnalystDashboard;
