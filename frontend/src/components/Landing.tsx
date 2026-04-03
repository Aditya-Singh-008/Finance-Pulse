import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Shield, BarChart3, ArrowRight, Wallet } from 'lucide-react';
import ThemeToggle from './layout/ThemeToggle';

const Landing: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-950 min-h-screen transition-colors duration-500">
      {/* Navbar for Landing */}
      <nav className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-900 h-16 flex items-center transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 dark:bg-indigo-500 p-1.5 rounded-lg shadow-inner">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900 dark:text-white tracking-tight">FinancePulse</span>
          </div>
          <div className="flex items-center gap-6">
            <ThemeToggle />
            <Link
              to="/auth?mode=signin"
              className="text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center px-4 py-2 rounded-full border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-8 animate-in slide-in-from-top duration-700">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              New: Real-time Dashboard Summary
            </div>
            <h1 className="text-6xl md:text-7xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6 tracking-tight">
              Master Your Money with <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 animate-gradient">
                Intelligent Insights
              </span>
            </h1>
            <p className="max-w-2xl mx-auto text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed font-light">
              Track your spending, set budgets, and visualize your financial health with our intuitive data processing engine. Start your journey to financial freedom today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in slide-in-from-bottom duration-700">
              <Link
                to="/auth?mode=signup"
                className="group relative inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-white bg-indigo-600 dark:bg-indigo-500 rounded-2xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all duration-300 shadow-xl shadow-slate-200 dark:shadow-indigo-950/50"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/auth?mode=signin"
                className="inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300"
              >
                Log In
              </Link>
            </div>
          </div>

          {/* Background Decorative Elements */}
          <div className="absolute top-0 -z-10 left-1/2 -translate-x-1/2 blur-3xl opacity-30 pointer-events-none overflow-hidden">
            <div className="w-[800px] h-[500px] bg-gradient-to-tr from-indigo-200 via-violet-300 to-indigo-400 rounded-[30%_70%_70%_30%/30%_30%_70%_70%]"></div>
          </div>
        </section>

        {/* Feature Highlights section */}
        <section className="py-24 bg-slate-50 dark:bg-slate-900 transition-colors duration-500 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-indigo-950/20 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Secure & Private</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Your data is protected with enterprise-grade encryption and Supabase Row-Level Security.</p>
              </div>
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-indigo-950/20 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl bg-violet-600/10 dark:bg-violet-500/20 flex items-center justify-center mb-6">
                  <BarChart3 className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Real-time Analytics</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Instant insights into your total income and expenses with our powerful data hooks.</p>
              </div>
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-indigo-950/20 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 flex items-center justify-center mb-6">
                  <Wallet className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Budget Planning</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Category breakdowns help you understand where your money goes every month.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Landing;
