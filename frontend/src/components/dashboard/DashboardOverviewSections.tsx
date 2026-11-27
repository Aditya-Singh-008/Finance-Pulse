import { PieChart, type LucideIcon } from 'lucide-react';
import type { CategoryBreakdown as CategoryBreakdownItem } from '../../hooks/useDashboard';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrency = (amount: number) => currencyFormatter.format(amount);

interface MetricCardProps {
  amount: number;
  className?: string;
  icon: LucideIcon;
  label: string;
  tone: 'balance' | 'income' | 'expense';
}

export const MetricCard = ({ amount, className = '', icon: Icon, label, tone }: MetricCardProps) => {
  const toneClasses = {
    balance: 'border-t-2 border-t-[var(--fp-brand-primary)] text-[var(--fp-brand-primary)]',
    income: 'border-t-2 border-t-[var(--fp-income)] text-[var(--fp-income)]',
    expense: 'border-t-2 border-t-[var(--fp-expense)] text-[var(--fp-expense)]',
  }[tone];
  const currencyParts = currencyFormatter.formatToParts(amount);
  const valueColorClass = {
    balance: 'text-[var(--fp-brand-primary)]',
    income: 'text-[var(--fp-income)]',
    expense: 'text-[var(--fp-expense)]',
  }[tone];

  return (
    <article className={`min-w-0 rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] p-4 sm:p-5 ${toneClasses} ${className}`}>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex size-9 items-center justify-center rounded-[6px] bg-[var(--fp-bg-sunken)]">
          <Icon aria-hidden="true" className="size-4" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {tone === 'balance' ? 'Available' : tone === 'income' ? 'Inflow' : 'Outflow'}
        </span>
      </div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
        {label}
      </p>
      <p
        aria-label={formatCurrency(amount)}
        className={`fp-num truncate text-[clamp(1.55rem,4vw,2.1rem)] font-semibold leading-tight tracking-[-0.04em] ${valueColorClass}`}
      >
        <span aria-hidden="true">
          {currencyParts.map((part, index) => (
            <span
              key={`${part.type}-${index}`}
              className={part.type === 'currency' ? 'mr-0.5 text-[0.75em] font-normal opacity-80' : undefined}
            >
              {part.value}
            </span>
          ))}
        </span>
      </p>
    </article>
  );
};

interface CategoryBreakdownProps {
  categories: CategoryBreakdownItem[];
  totalExpenses: number;
}

export const CategoryBreakdown = ({ categories, totalExpenses }: CategoryBreakdownProps) => (
  <section
    aria-labelledby="category-breakdown-title"
    className="h-full rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] p-4 sm:p-5"
  >
    <header className="mb-5 flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-[6px] bg-[var(--fp-bg-sunken)] text-[var(--fp-brand-primary)]">
        <PieChart aria-hidden="true" className="size-4" />
      </div>
      <div>
        <h2 id="category-breakdown-title" className="font-serif text-xl tracking-[-0.02em] text-slate-900 dark:text-slate-100">
          Category Breakdown
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Share of total expenses</p>
      </div>
    </header>

    {categories.length ? (
      <ul className="flex flex-col gap-5">
        {categories.map((category, index) => {
          const share = totalExpenses > 0 ? (category.total / totalExpenses) * 100 : 0;
          const barWidth = Math.min(Math.max(share, 0), 100);
          const shareLabel = `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(share)}%`;

          return (
            <li key={`${category.category_name}-${index}`} className="flex flex-col gap-2">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                  {category.category_name}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="fp-num text-sm font-semibold text-[var(--fp-expense)]">
                    {formatCurrency(category.total)}
                  </span>
                  <span className="fp-num min-w-12 text-right text-xs text-slate-500 dark:text-slate-400">
                    {shareLabel}
                  </span>
                </div>
              </div>
              <div
                aria-label={`${category.category_name}: ${shareLabel} of expenses`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={barWidth}
                role="progressbar"
                className="h-1.5 overflow-hidden rounded-full bg-[var(--fp-bg-sunken)]"
              >
                <div
                  className="h-full rounded-full bg-[var(--fp-brand-primary)] transition-[width] duration-500 ease-out"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    ) : (
      <div className="flex min-h-36 flex-col items-center justify-center rounded-[6px] border border-dashed border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)] px-4 text-center">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No category data yet</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Category totals will appear here as expenses are recorded.</p>
      </div>
    )}
  </section>
);

export const DashboardOverviewSkeleton = () => (
  <div role="status" aria-label="Loading personal finance overview" aria-busy="true" className="flex flex-col gap-5">
    <div className="flex flex-col gap-4 border-b border-[var(--fp-border-default)] pb-5 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
        <div className="flex flex-col gap-2">
          <div aria-hidden="true" className="h-3 w-32 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
          <div aria-hidden="true" className="h-11 w-56 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
        </div>
        <div aria-hidden="true" className="h-11 w-48 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
      </div>
      <div className="flex gap-2">
        <div aria-hidden="true" className="h-11 w-24 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
        <div aria-hidden="true" className="h-11 w-40 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          aria-hidden="true"
          className={`flex h-36 animate-pulse flex-col justify-between rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] p-4 sm:p-5 ${item === 0 ? 'col-span-2 md:col-span-1' : ''}`}
        >
          <div className="h-9 w-9 rounded-[6px] bg-[var(--fp-bg-sunken)]" />
          <div className="flex flex-col gap-2">
            <div className="h-3 w-24 rounded-[6px] bg-[var(--fp-bg-sunken)]" />
            <div className="h-7 w-36 rounded-[6px] bg-[var(--fp-bg-sunken)]" />
          </div>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <section aria-label="Loading recent activity" className="rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] p-4 sm:p-5 lg:col-span-7">
        <div className="mb-5 flex items-center justify-between">
          <div className="h-7 w-40 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
          <div className="h-9 w-36 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
        </div>
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} aria-hidden="true" className="h-[68px] animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
          ))}
        </div>
      </section>

      <section aria-label="Loading category breakdown" className="rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] p-4 sm:p-5 lg:col-span-5">
        <div className="mb-6 h-7 w-44 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
        <div className="flex flex-col gap-6">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} aria-hidden="true" className="flex flex-col gap-2">
              <div className="flex justify-between gap-4">
                <div className="h-4 w-28 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
                <div className="h-4 w-24 animate-pulse rounded-[6px] bg-[var(--fp-bg-sunken)]" />
              </div>
              <div className="h-1.5 w-full animate-pulse rounded-full bg-[var(--fp-bg-sunken)]" />
            </div>
          ))}
        </div>
      </section>
    </div>
    <span className="sr-only">Loading your latest financial data.</span>
  </div>
);
