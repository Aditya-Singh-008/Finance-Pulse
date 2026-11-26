/**
 * AnalystDashboard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Updated with Financial Trends (Time-Series) and Categorical Breakdown.
 * Fulfills the "Monthly or weekly trends" requirement.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import {
  Users,
  Activity,
  BarChart,
  Globe,
  ShieldCheck,
  Zap,
  Loader2,
  AlertCircle,
  ShieldOff,
  PieChart as PieIcon,
  TrendingUp,
  RefreshCcw
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Sector,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { usePlatformAnalytics } from '../../hooks/usePlatformAnalytics';
import ExportCsvButton from './ExportCsvButton';

interface AnalystDashboardProps {}

const COLORS = ['#596f4e', '#b87555', '#8a9879', '#c39a72', '#61746b', '#9a7a65'];

const AnalystDashboard: React.FC<AnalystDashboardProps> = () => {
  const { data, loading, error, refetch } = usePlatformAnalytics();
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
        <div className="relative">
          <Loader2 className="w-8 h-8 text-forest animate-spin relative" aria-hidden="true" />
        </div>
        <p className="text-slate-400 font-medium tracking-wide">Loading platform analytics…</p>
      </div>
    );
  }

  if (error) {
    const isInactive = error.toLowerCase().includes('inactive');

    if (isInactive) {
      return (
        <div className="min-h-[400px] flex items-center justify-center animate-in zoom-in duration-500 px-4">
          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 rounded-3xl p-8 max-w-md text-center relative overflow-hidden shadow-sm">
            <div className="bg-amber-500/10 p-5 rounded-2xl w-fit mx-auto mb-6">
               <ShieldOff className="w-10 h-10 text-amber-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Analyst access <span className="text-amber-500">unavailable</span></h3>
            <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed">
              Your analyst access is inactive. Contact an administrator if you think this should be changed.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg border border-slate-700 text-slate-400 font-bold uppercase tracking-[0.2em] text-[8px]">
               <AlertCircle className="w-3 h-3 text-amber-500" />
               Account status
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-3xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Analytics unavailable</h3>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-forest text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const analytics = data || {
    total_platform_users: 0,
    total_transaction_volume: 0,
    platform_total_income: 0,
    platform_total_expenses: 0,
    total_transaction_count: 0,
    category_breakdown: [],
    daily_trends: []
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const formatNumber = (val: number) =>
    new Intl.NumberFormat('en-US', { notation: 'compact' }).format(val);

  // Compare platform-wide income and expenses.
  const totalFlow = analytics.platform_total_income + analytics.platform_total_expenses;
  const incomePercent = totalFlow > 0 ? (analytics.platform_total_income / totalFlow) * 100 : 0;
  const expensePercent = totalFlow > 0 ? (analytics.platform_total_expenses / totalFlow) * 100 : 0;

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  const breakdown = analytics.category_breakdown || [];
  const totalBreakdownValue = breakdown.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 12}
          startAngle={startAngle}
          endAngle={endAngle}
          fill="none"
          stroke={fill}
          strokeWidth={2}
        />
      </g>
    );
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/80">Shared analytics</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Platform <span className="text-forest dark:text-[#bbcaab]">analytics</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium mt-1">An aggregate view of activity across Finance Pulse accounts</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="motion-button flex items-center gap-2 px-5 py-3 bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-xs font-medium">Refresh overview</span>
          </button>
          <div className="flex items-center gap-3 bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 px-6 py-3 rounded-2xl backdrop-blur-xl shrink-0">
            <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 " />
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-100 whitespace-nowrap">Data overview</span>
          </div>
          <ExportCsvButton />
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="motion-stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="motion-card group relative overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm dark:shadow-none transition-all duration-500 hover:border-indigo-500/40">
          <div className="bg-indigo-500/10 dark:bg-indigo-500/20 p-4 rounded-2xl w-fit mb-6 ring-1 ring-indigo-500/20 group-hover:scale-110 group-hover:rotate-6 transition-transform">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h4 className="text-slate-600 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Platform Users</h4>
          <div className="text-3xl font-black text-slate-900 dark:text-white">{formatNumber(analytics.total_platform_users)}</div>
        </div>
        
        <div className="motion-card group relative overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm dark:shadow-none transition-all duration-500 hover:border-violet-500/40">
          <div className="bg-violet-500/10 dark:bg-violet-500/20 p-4 rounded-2xl w-fit mb-6 ring-1 ring-violet-500/20 group-hover:scale-110 group-hover:rotate-6 transition-transform">
            <Activity className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          </div>
          <h4 className="text-slate-600 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Total Volume</h4>
          <div className="text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(analytics.total_transaction_volume)}</div>
        </div>
        
        <div className="motion-card group relative overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm dark:shadow-none transition-all duration-500 hover:border-emerald-500/40">
          <div className="bg-emerald-500/10 dark:bg-emerald-500/20 p-4 rounded-2xl w-fit mb-6 ring-1 ring-emerald-500/20 group-hover:scale-110 group-hover:rotate-6 transition-transform">
            <BarChart className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h4 className="text-slate-600 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Recorded activity</h4>
          <div className="text-3xl font-black text-slate-900 dark:text-white">{formatNumber(analytics.total_transaction_count)}</div>
        </div>

        <div className="motion-card group relative overflow-hidden bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 transition-all duration-500 hover:border-purple-500/40">
          <div className="bg-purple-500/10 p-4 rounded-2xl w-fit mb-6 ring-1 ring-purple-500/20 group-hover:scale-110 group-hover:rotate-6 transition-transform">
            <Globe className="w-6 h-6 text-purple-400" />
          </div>
          <h4 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Coverage</h4>
          <div className="text-3xl font-black text-white">All accounts</div>
        </div>
      </div>

      {/* Financial Trends Section */}
      <div className="motion-card bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 shadow-sm dark:shadow-none relative">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Income and spending</h3>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Total income compared with total expenses over the past 30 days.</p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Inflow</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Outflow</span>
            </div>
          </div>
        </div>

        <div className="w-full h-[350px]" role="img" aria-label="Daily income and expense trends for the past 30 days">
          {mounted && analytics.daily_trends && analytics.daily_trends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.daily_trends} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--muted)', fontSize: 10, fontWeight: 600 }}
                  tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  minTickGap={30}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--muted)', fontSize: 10, fontWeight: 600 }}
                  tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: '14px', padding: '12px', boxShadow: '0 12px 32px rgba(25, 31, 24, 0.12)' }}
                  itemStyle={{ color: 'var(--ink)', fontSize: '12px', fontWeight: 600 }}
                  labelStyle={{ color: 'var(--muted)', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#647b58"
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#647b58', strokeWidth: 2, stroke: 'var(--paper)' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="expense" 
                  stroke="#b87555"
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#b87555', strokeWidth: 2, stroke: 'var(--paper)' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-40 border-2 border-dashed border-slate-700/30 rounded-[2rem]">
               <Activity className="w-12 h-12 mb-4 text-slate-500" />
               <p className="text-slate-500 font-bold tracking-tight">Add more transaction history to see trends.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="motion-card bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 flex flex-col items-center shadow-sm dark:shadow-none">
          <div className="w-full flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Spending by category</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Share of total expenses by category</p>
            </div>
            <PieIcon className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
          </div>

          <div className="w-full h-[400px] relative" role="img" aria-label="Expense totals by category">
            {mounted && (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    activeShape={renderActiveShape}
                    data={breakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                  >
                    {breakdown.map((_entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        opacity={activeIndex === -1 || activeIndex === index ? 1 : 0.3}
                        style={{ transition: 'all 0.3s ease', outline: 'none' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        const percentage = totalBreakdownValue > 0 ? ((Number(data.value) / totalBreakdownValue) * 100).toFixed(1) : 0;
                        return (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xl backdrop-blur-md">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">{data.name}</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {formatCurrency(Number(data.value))} <span className="text-indigo-500 dark:text-indigo-400 ml-1">({percentage}%)</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: 'var(--muted)', paddingTop: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 flex flex-col justify-center shadow-sm dark:shadow-none">
          <div className="mb-12 text-center">
             <TrendingUp className="w-10 h-10 text-indigo-500 mx-auto mb-4" />
             <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Income and expenses</h3>
             <p className="text-slate-600 dark:text-slate-400 font-medium max-w-sm mx-auto">A side-by-side view of total income and spending.</p>
          </div>

          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex-1 text-center bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/30">
               <div className="text-emerald-600 dark:text-emerald-400 font-black text-2xl">{formatCurrency(analytics.platform_total_income)}</div>
               <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Total income</div>
            </div>
            <div className="flex-1 text-center bg-red-50 dark:bg-red-950/20 p-6 rounded-[2rem] border border-red-100 dark:border-red-900/30">
               <div className="text-red-600 dark:text-red-400 font-black text-2xl">{formatCurrency(analytics.platform_total_expenses)}</div>
               <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Total expenses</div>
            </div>
          </div>

          <div className="w-full h-8 bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden flex ring-8 ring-slate-100 dark:ring-slate-800/10">
            <div style={{ width: `${incomePercent}%` }} className="h-full bg-forest transition-all duration-700"></div>
            <div style={{ width: `${expensePercent}%` }} className="h-full bg-slate-300 dark:bg-slate-700 transition-all duration-1000"></div>
          </div>
          <div className="flex items-center justify-between mt-4">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{incomePercent.toFixed(0)}% income</span>
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{expensePercent.toFixed(0)}% expenses</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalystDashboard;
