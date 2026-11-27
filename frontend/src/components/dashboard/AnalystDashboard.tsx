import React from 'react';
import { RefreshCw } from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PieSectorShapeProps } from 'recharts';
import { usePlatformAnalytics } from '../../hooks/usePlatformAnalytics';
import ExportCsvButton from './ExportCsvButton';

const CATEGORY_COLORS = [
  'var(--fp-expense)',
  'var(--fp-accent-clay, #b87555)',
  'var(--fp-accent-ochre, #b78a3e)',
  'var(--fp-brand-secondary, #68736a)',
  'var(--fp-income)',
];

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const formatCurrency = (value: number) => currencyFormatter.format(Number(value) || 0);
const formatCompact = (value: number) => compactFormatter.format(Number(value) || 0);

function formatDate(value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', options);
}

type TrendWindow = 7 | 14 | 30;

function LoadingSkeleton() {
  return (
    <div role="status" aria-label="Loading platform analytics" className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-9 w-64 animate-pulse rounded-md bg-[var(--fp-bg-sunken)]" />
          <div className="h-4 w-48 animate-pulse rounded bg-[var(--fp-bg-sunken)]" />
        </div>
        <div className="h-10 w-48 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
      </div>
      <div className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className={`flex min-h-24 flex-col justify-center gap-3 p-4 ${index % 2 === 1 ? 'border-l border-[var(--fp-border-default)] lg:border-l' : ''} ${index >= 2 ? 'border-t border-[var(--fp-border-default)] lg:border-t-0' : ''} ${index === 2 ? 'lg:border-l' : ''}`}>
            <div className="h-3 w-28 animate-pulse rounded bg-[var(--fp-bg-sunken)]" />
            <div className="h-6 w-36 animate-pulse rounded bg-[var(--fp-bg-sunken)]" />
          </div>
        ))}
      </div>
      <div className="rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] p-4 sm:p-5">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="h-6 w-44 animate-pulse rounded bg-[var(--fp-bg-sunken)]" />
          <div className="h-9 w-52 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
        </div>
        <div className="h-[300px] animate-pulse rounded-[6px] bg-[var(--fp-bg-canvas)]" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="min-h-[340px] animate-pulse rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] lg:col-span-7" />
        <div className="min-h-[340px] animate-pulse rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] lg:col-span-5" />
      </div>
      <span className="sr-only">Retrieving aggregate platform activity.</span>
    </div>
  );
}

function MetricStrip({
  users,
  volume,
  transactions,
}: {
  users: number;
  volume: number;
  transactions: number;
}) {
  const metrics = [
    { label: 'Platform users', value: formatCompact(users) },
    { label: 'Total volume', value: formatCurrency(volume) },
    { label: 'Recorded activity', value: formatCompact(transactions) },
    { label: 'Coverage', value: '30D aggregate' },
  ];

  return (
    <section aria-label="Platform metrics" className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <div
          key={metric.label}
          className={`flex min-h-24 min-w-0 flex-col justify-center gap-2 px-4 py-4 sm:px-5 ${index % 2 === 1 ? 'border-l border-[var(--fp-border-default)]' : ''} ${index >= 2 ? 'border-t border-[var(--fp-border-default)] lg:border-t-0' : ''} ${index === 2 ? 'lg:border-l' : ''}`}
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{metric.label}</p>
          <p className="fp-num truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-xl">{metric.value}</p>
        </div>
      ))}
    </section>
  );
}

function TrendTable({ trends }: { trends: { date: string; income: number; expense: number }[] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-[6px] border border-[var(--fp-border-default)]">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead className="bg-[var(--fp-bg-canvas)] text-xs font-semibold text-slate-500 dark:text-slate-400">
          <tr>
            <th scope="col" className="px-3 py-2.5">Date</th>
            <th scope="col" className="px-3 py-2.5 text-right">Income</th>
            <th scope="col" className="px-3 py-2.5 text-right">Expenses</th>
            <th scope="col" className="px-3 py-2.5 text-right">Net</th>
          </tr>
        </thead>
        <tbody>
          {trends.map((trend) => {
            const net = (Number(trend.income) || 0) - (Number(trend.expense) || 0);
            return (
              <tr key={trend.date} className="border-t border-[var(--fp-border-default)]">
                <th scope="row" className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-700 dark:text-slate-200">{formatDate(trend.date, { day: 'numeric', month: 'short', year: 'numeric' })}</th>
                <td className="fp-num whitespace-nowrap px-3 py-2.5 text-right text-[var(--fp-income)]">{formatCurrency(trend.income)}</td>
                <td className="fp-num whitespace-nowrap px-3 py-2.5 text-right text-[var(--fp-expense)]">{formatCurrency(trend.expense)}</td>
                <td className={`fp-num whitespace-nowrap px-3 py-2.5 text-right font-semibold ${net >= 0 ? 'text-[var(--fp-income)]' : 'text-[var(--fp-expense)]'}`}>{formatCurrency(net)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TrendSection({
  trends,
  prefersReducedMotion,
  tableView,
}: {
  trends: { date: string; income: number; expense: number }[];
  prefersReducedMotion: boolean;
  tableView: boolean;
}) {
  const [activeWindow, setActiveWindow] = React.useState<TrendWindow>(30);
  const [showIncome, setShowIncome] = React.useState(true);
  const [showExpenses, setShowExpenses] = React.useState(true);
  const visibleTrends = trends.slice(-activeWindow);
  const hasTrends = visibleTrends.length > 0;

  return (
    <section aria-labelledby="cashflow-title" className="rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 id="cashflow-title" className="font-display text-2xl text-slate-900 dark:text-slate-100">Cashflow trajectory</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Daily platform income and expenses</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Toggle chart series" className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={showIncome}
              onClick={() => setShowIncome((visible) => !visible)}
              className="inline-flex min-h-9 items-center gap-2 rounded-[6px] border border-[var(--fp-border-default)] px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-[var(--fp-bg-canvas)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fp-income)] dark:text-slate-200"
            >
              <span aria-hidden="true" className="size-2 rounded-full bg-[var(--fp-income)]" />
              Income
            </button>
            <button
              type="button"
              aria-pressed={showExpenses}
              onClick={() => setShowExpenses((visible) => !visible)}
              className="inline-flex min-h-9 items-center gap-2 rounded-[6px] border border-[var(--fp-border-default)] px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-[var(--fp-bg-canvas)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fp-expense)] dark:text-slate-200"
            >
              <span aria-hidden="true" className="size-2 rounded-full bg-[var(--fp-expense)]" />
              Expenses
            </button>
          </div>
          <div role="group" aria-label="Trend window" className="inline-flex rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)] p-0.5">
            {([7, 14, 30] as const).map((days) => (
              <button
                key={days}
                type="button"
                aria-pressed={activeWindow === days}
                onClick={() => setActiveWindow(days)}
                className={`min-h-9 min-w-10 rounded-[4px] px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fp-income)] ${activeWindow === days ? 'bg-[var(--fp-bg-surface)] text-slate-900 shadow-sm dark:text-slate-100' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'}`}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {hasTrends ? (
        <div className="h-[300px] w-full" aria-label={`Income and expense trends for the last ${activeWindow} days`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visibleTrends} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--fp-chart-grid, var(--chart-grid))" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--fp-chart-axis, var(--muted))', fontSize: 11 }}
                tickFormatter={(value: string) => formatDate(value)}
                minTickGap={28}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={62}
                tick={{ fill: 'var(--fp-chart-axis, var(--muted))', fontSize: 10 }}
                tickFormatter={(value: number) => `₹${formatCompact(value)}`}
              />
              <Tooltip
                cursor={{ stroke: 'var(--fp-chart-axis, var(--muted))', strokeDasharray: '4 4' }}
                wrapperStyle={{ transition: 'opacity 120ms ease' }}
                contentStyle={{ background: 'var(--fp-bg-surface)', border: '1px solid var(--fp-border-default)', borderRadius: '6px', padding: '10px 12px', boxShadow: '0 8px 24px rgba(20, 28, 20, 0.12)' }}
                labelStyle={{ color: 'var(--fp-chart-axis, var(--muted))', fontSize: 11, marginBottom: 5 }}
                labelFormatter={(value) => formatDate(String(value), { day: 'numeric', month: 'short', year: 'numeric' })}
                formatter={(value, name) => [formatCurrency(Number(value)), name === 'expense' ? 'Expenses' : 'Income']}
              />
              <Line
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="var(--fp-income)"
                strokeWidth={2.5}
                strokeOpacity={showIncome ? 1 : 0.2}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={!prefersReducedMotion}
              />
              <Line
                type="monotone"
                dataKey="expense"
                name="Expenses"
                stroke="var(--fp-expense)"
                strokeWidth={2.5}
                strokeOpacity={showExpenses ? 1 : 0.2}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={!prefersReducedMotion}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[300px] flex-col items-center justify-center rounded-[6px] border border-dashed border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)] px-5 text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No trend data for this period</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Daily activity will appear here when available.</p>
        </div>
      )}
      {tableView && hasTrends && <TrendTable trends={visibleTrends} />}
    </section>
  );
}

function renderCategoryShape(props: PieSectorShapeProps, activeIndex: number) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, isActive, index } = props;
  const expandedRadius = outerRadius + (isActive || activeIndex === index ? 6 : 0);
  return <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={expandedRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />;
}

function CategorySection({
  categories,
  prefersReducedMotion,
}: {
  categories: { name: string; value: number }[];
  prefersReducedMotion: boolean;
}) {
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const total = categories.reduce((sum, category) => sum + (Number(category.value) || 0), 0);
  const hasCategories = categories.length > 0 && total > 0;

  return (
    <section aria-labelledby="category-title" className="min-w-0 rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] p-4 sm:p-5 lg:col-span-7">
      <div className="mb-2">
        <h2 id="category-title" className="font-display text-2xl text-slate-900 dark:text-slate-100">Spending by category</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Distribution of recorded platform expenses</p>
      </div>
      {hasCategories ? (
        <>
          <div className="relative h-[250px] w-full" aria-label="Expense distribution by category">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={66}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="none"
                  shape={(shapeProps) => renderCategoryShape(shapeProps, activeIndex)}
                  isAnimationActive={!prefersReducedMotion}
                  onMouseEnter={(_: unknown, index: number) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(-1)}
                  onClick={(_: unknown, index: number) => setActiveIndex((current) => current === index ? -1 : index)}
                >
                  {categories.map((category, index) => (
                    <Cell
                      key={category.name}
                      fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      opacity={activeIndex < 0 || activeIndex === index ? 1 : 0.34}
                    />
                  ))}
                </Pie>
                <Tooltip
                  wrapperStyle={{ transition: 'opacity 120ms ease' }}
                  contentStyle={{ background: 'var(--fp-bg-surface)', border: '1px solid var(--fp-border-default)', borderRadius: '6px', padding: '10px 12px' }}
                  formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Total spend</span>
              <span className="fp-num mt-1 max-w-[44%] truncate text-center text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(total)}</span>
            </div>
          </div>
          <ul aria-label="Expense categories" className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {categories.map((category, index) => {
              const percent = total > 0 ? (Number(category.value || 0) / total) * 100 : 0;
              const selected = activeIndex === index;
              return (
                <li key={category.name}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(-1)}
                    onFocus={() => setActiveIndex(index)}
                    onBlur={() => setActiveIndex(-1)}
                    onClick={() => setActiveIndex((current) => current === index ? -1 : index)}
                    className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-[6px] px-2.5 text-left transition-colors hover:bg-[var(--fp-bg-canvas)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fp-income)] ${selected ? 'bg-[var(--fp-bg-canvas)]' : ''}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} />
                      <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{category.name}</span>
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2">
                      <span className="fp-num text-xs text-slate-500 dark:text-slate-400">{percent.toFixed(1)}%</span>
                      <span className="fp-num text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(Number(category.value) || 0)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[6px] border border-dashed border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)] px-5 text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No category data available</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Category totals will appear here when expenses are recorded.</p>
        </div>
      )}
    </section>
  );
}

function CashflowSummary({ income, expenses }: { income: number; expenses: number }) {
  const netFlow = income - expenses;
  const totalFlow = income + expenses;
  const incomeShare = totalFlow > 0 ? (income / totalFlow) * 100 : 0;
  const expenseShare = totalFlow > 0 ? (expenses / totalFlow) * 100 : 0;
  const netMargin = income > 0 ? (netFlow / income) * 100 : 0;
  const rows = [
    { label: 'Income', value: income, tone: 'text-[var(--fp-income)]' },
    { label: 'Expenses', value: expenses, tone: 'text-[var(--fp-expense)]' },
    { label: 'Net flow', value: netFlow, tone: netFlow >= 0 ? 'text-[var(--fp-income)]' : 'text-[var(--fp-expense)]' },
  ];

  return (
    <section aria-labelledby="cashflow-summary-title" className="min-w-0 rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] p-4 sm:p-5 lg:col-span-5">
      <div className="mb-6">
        <h2 id="cashflow-summary-title" className="font-display text-2xl text-slate-900 dark:text-slate-100">Income / expense ratio</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Platform-wide net position</p>
      </div>
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Share of total flow</span>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{incomeShare.toFixed(0)} / {expenseShare.toFixed(0)}</span>
        </div>
        <div
          role="img"
          aria-label={`${incomeShare.toFixed(0)} percent income and ${expenseShare.toFixed(0)} percent expenses`}
          className="flex h-3 overflow-hidden rounded-full bg-[var(--fp-bg-canvas)]"
        >
          <div className="h-full bg-[var(--fp-income)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${incomeShare}%` }} />
          <div className="h-full bg-[var(--fp-expense)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${expenseShare}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Income</span>
          <span>Expenses</span>
        </div>
      </div>
      <div className="mb-5 flex items-end justify-between gap-4 rounded-[6px] bg-[var(--fp-bg-canvas)] px-3 py-3">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Net margin</p>
          <p className={`fp-num mt-1 text-2xl font-semibold ${netMargin >= 0 ? 'text-[var(--fp-income)]' : 'text-[var(--fp-expense)]'}`}>{netMargin.toFixed(1)}%</p>
        </div>
        <p className="fp-num text-right text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(netFlow)}<span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">net</span></p>
      </div>
      <dl>
        {rows.map((row, index) => (
          <div key={row.label} className={`flex items-center justify-between gap-4 py-3 ${index > 0 ? 'border-t border-[var(--fp-border-default)]' : ''}`}>
            <dt className="text-sm text-slate-600 dark:text-slate-300">{row.label}</dt>
            <dd className={`fp-num text-sm font-semibold ${row.tone}`}>{formatCurrency(row.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const AnalystDashboard: React.FC = () => {
  const { data, loading, error, refetch } = usePlatformAnalytics();
  const [tableView, setTableView] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  React.useEffect(() => {
    setMounted(true);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <section role="alert" className="flex flex-col gap-3 rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl text-slate-900 dark:text-slate-100">Analytics unavailable</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={loading}
          className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)] px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-[var(--fp-bg-sunken)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fp-income)] disabled:cursor-wait disabled:opacity-60 dark:text-slate-200"
        >
          Retry
        </button>
      </section>
    );
  }

  const analytics = data ?? {
    total_platform_users: 0,
    total_transaction_volume: 0,
    platform_total_income: 0,
    platform_total_expenses: 0,
    total_transaction_count: 0,
    category_breakdown: [],
    daily_trends: [],
  };
  const trends = analytics.daily_trends ?? [];
  const categories = analytics.category_breakdown ?? [];

  return (
    <div className="flex flex-col gap-5 pb-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-display text-3xl leading-tight text-slate-900 dark:text-slate-100 sm:text-4xl">Platform Analytics</h1>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">30D aggregate · {formatCompact(analytics.total_transaction_count)} txns</span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Aggregate activity across Finance Pulse accounts</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={tableView}
            onClick={() => setTableView((visible) => !visible)}
            className="inline-flex min-h-9 items-center justify-center rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-[var(--fp-bg-canvas)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fp-income)] dark:text-slate-200"
          >
            {tableView ? 'Chart View' : 'Table View'}
          </button>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={loading}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-[var(--fp-bg-canvas)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fp-income)] disabled:cursor-wait disabled:opacity-60 dark:text-slate-200"
          >
            <RefreshCw aria-hidden="true" className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <ExportCsvButton />
        </div>
      </header>

      <MetricStrip
        users={analytics.total_platform_users}
        volume={analytics.total_transaction_volume}
        transactions={analytics.total_transaction_count}
      />
      <TrendSection trends={mounted ? trends : []} prefersReducedMotion={prefersReducedMotion} tableView={tableView} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <CategorySection categories={categories} prefersReducedMotion={prefersReducedMotion} />
        <CashflowSummary income={analytics.platform_total_income} expenses={analytics.platform_total_expenses} />
      </div>
    </div>
  );
};

export default AnalystDashboard;
