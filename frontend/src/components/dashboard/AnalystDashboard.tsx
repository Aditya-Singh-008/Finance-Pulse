/**
 * AnalystDashboard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Updated with Categorical Breakdown Visualization using Recharts.
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
  PieChart as PieIcon
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Sector
} from 'recharts';
import { usePlatformAnalytics } from '../../hooks/usePlatformAnalytics';
import ExportCsvButton from './ExportCsvButton';

const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9'];

const AnalystDashboard: React.FC = () => {
  const { data, loading, error } = usePlatformAnalytics();
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[600px] flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-700">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full"></div>
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin relative" />
        </div>
        <p className="text-slate-400 font-medium tracking-wide">Calibrating Analytics Protocol...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 max-w-md text-center backdrop-blur-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Sync Error</h3>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
          >
            Reconnect
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
    category_breakdown: []
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const formatNumber = (val: number) =>
    new Intl.NumberFormat('en-US', { notation: 'compact' }).format(val);

  // Platform Health Calculation
  const totalFlow = analytics.platform_total_income + analytics.platform_total_expenses;
  const incomePercent = totalFlow > 0 ? (analytics.platform_total_income / totalFlow) * 100 : 0;
  const expensePercent = totalFlow > 0 ? (analytics.platform_total_expenses / totalFlow) * 100 : 0;

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  // Calculate total for percentage display with safety check
  const breakdown = analytics.category_breakdown || [];
  const totalBreakdownValue = breakdown.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

  // Custom Active Shape using Recharts Sector component for predictable scaling
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
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/80">Platform Command Center</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Institutional <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">Analytics</span>
          </h1>
          <p className="text-slate-400 font-medium mt-1">Real-time aggregate data across all localized wallets</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 px-6 py-3 rounded-2xl backdrop-blur-xl shrink-0">
            <Zap className="w-5 h-5 text-indigo-400 animate-pulse" />
            <span className="text-sm font-bold text-indigo-100 whitespace-nowrap">Live Infrastructure Feed</span>
          </div>
          <ExportCsvButton />
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="group relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm dark:shadow-none transition-all duration-500 hover:border-indigo-500/40 hover:bg-slate-50 dark:hover:bg-slate-900/50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 dark:bg-indigo-600/10 blur-[60px] transform group-hover:bg-indigo-600/10 dark:group-hover:bg-indigo-600/20 transition-all duration-700"></div>
          <div className="bg-indigo-500/10 dark:bg-indigo-500/20 p-4 rounded-2xl w-fit mb-6 ring-1 ring-indigo-500/20 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="space-y-1">
            <h4 className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">Platform Users</h4>
            <div className="text-3xl font-black text-slate-900 dark:text-white">{formatNumber(analytics.total_platform_users)}</div>
          </div>
        </div>

        {/* Transaction Volume */}
        <div className="group relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm dark:shadow-none transition-all duration-500 hover:border-violet-500/40 hover:bg-slate-50 dark:hover:bg-slate-900/50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 dark:bg-violet-600/10 blur-[60px] transform group-hover:bg-violet-600/10 dark:group-hover:bg-violet-600/20 transition-all duration-700"></div>
          <div className="bg-violet-500/10 dark:bg-violet-500/20 p-4 rounded-2xl w-fit mb-6 ring-1 ring-violet-500/20 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
            <Activity className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="space-y-1">
            <h4 className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">Total Volume</h4>
            <div className="text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(analytics.total_transaction_volume)}</div>
          </div>
        </div>

        {/* Total Transactions */}
        <div className="group relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm dark:shadow-none transition-all duration-500 hover:border-emerald-500/40 hover:bg-slate-50 dark:hover:bg-slate-900/50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 dark:bg-emerald-600/10 blur-[60px] transform group-hover:bg-emerald-600/10 dark:group-hover:bg-emerald-600/20 transition-all duration-700"></div>
          <div className="bg-emerald-500/10 dark:bg-emerald-500/20 p-4 rounded-2xl w-fit mb-6 ring-1 ring-emerald-500/20 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
            <BarChart className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h4 className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">Global Activity</h4>
            <div className="text-3xl font-black text-slate-900 dark:text-white">{formatNumber(analytics.total_transaction_count)}</div>
          </div>
        </div>

        {/* Regions/Node Mock */}
        <div className="group relative overflow-hidden bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 transition-all duration-500 hover:border-purple-500/40 hover:bg-slate-900/50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-[60px] transform group-hover:bg-purple-600/20 transition-all duration-700"></div>
          <div className="bg-purple-500/10 p-4 rounded-2xl w-fit mb-6 ring-1 ring-purple-500/20 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
            <Globe className="w-6 h-6 text-purple-400" />
          </div>
          <div className="space-y-1">
            <h4 className="text-slate-400 font-bold text-xs uppercase tracking-widest">Active Regions</h4>
            <div className="text-3xl font-black text-white">Global Cluster</div>
          </div>
        </div>
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown (Donut Chart) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 flex flex-col items-center shadow-sm dark:shadow-none">
          <div className="w-full flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Categorical Breakdown</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Volume distribution by sector</p>
            </div>
            <PieIcon className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
          </div>

          <div className="w-full h-[400px] relative">
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
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Platform Health Logic View */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 flex flex-col justify-center shadow-sm dark:shadow-none">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-transparent to-red-500"></div>

          <div className="mb-12">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Platform Health</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Comparison between total platform revenue induction and operational outflows.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-12">
            <div>
              <div className="text-emerald-600 dark:text-emerald-400 font-black text-3xl mb-1">{formatCurrency(analytics.platform_total_income)}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Platform Income</div>
            </div>
            <div>
              <div className="text-red-600 dark:text-red-400 font-black text-3xl mb-1">{formatCurrency(analytics.platform_total_expenses)}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Platform Expenses</div>
            </div>
          </div>

          {/* Visual Bar Gauge */}
          <div className="space-y-6">
            <div className="relative h-6 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden flex ring-4 ring-slate-100 dark:ring-slate-800/50 transition-colors">
              <div
                style={{ width: `${incomePercent}%` }}
                className="h-full bg-emerald-500 transition-all duration-1000 ease-out relative"
              >
                <div className="absolute inset-0 bg-white/20 blur-[10px]"></div>
              </div>
              <div
                style={{ width: `${expensePercent}%` }}
                className="h-full bg-red-500 transition-all duration-1000 ease-out relative"
              >
                <div className="absolute inset-0 bg-white/10 blur-[10px]"></div>
              </div>
            </div>

            <div className="flex justify-between items-start pt-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm font-black text-slate-900 dark:text-white">Income Contribution</span>
                </div>
                <p className="text-xs text-slate-500 font-medium ml-4">{incomePercent.toFixed(1)}%</p>
              </div>
              <div className="space-y-1 text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-sm font-black text-slate-900 dark:text-white">Expense Outflow</span>
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                </div>
                <p className="text-xs text-slate-500 font-medium mr-4">{expensePercent.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalystDashboard;
