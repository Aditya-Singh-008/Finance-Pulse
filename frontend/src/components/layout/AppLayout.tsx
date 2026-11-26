import React from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Landmark, LayoutDashboard, LogOut, ScrollText } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import ThemeToggle from './ThemeToggle';

const navigation = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ScrollText },
];

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = React.useState(true);
  const currentTitle = location.pathname.startsWith('/transactions') ? 'Transactions' : 'Overview';

  React.useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth?mode=signin');
      } else {
        setLoading(false);
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/auth?mode=signin');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper dark:bg-slate-950" role="status" aria-label="Loading your account">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-rule border-t-forest dark:border-slate-700 dark:border-t-[#adbd9e]" />
      </div>
    );
  }

  return (
    <div className="finance-app flex min-h-screen flex-col bg-paper text-ink dark:bg-slate-950 dark:text-slate-100 lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-rule bg-[#f9f7f1] dark:border-slate-800 dark:bg-[#1b211b] lg:sticky lg:top-0 lg:h-screen lg:w-[248px] lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-5 lg:px-6 lg:py-7">
          <Link to="/dashboard" className="flex items-center gap-3" aria-label="Finance Pulse overview">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-white">
              <Landmark aria-hidden="true" className="h-[18px] w-[18px]" />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.04em] text-ink dark:text-slate-100">finance pulse</span>
          </Link>
          <span className="hidden rounded-full border border-rule px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-700 dark:text-slate-400 lg:inline-flex">Personal</span>
        </div>

        <p className="hidden px-6 pb-3 pt-7 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 lg:block">Your money</p>
        <nav aria-label="Workspace navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `group inline-flex min-h-10 shrink-0 items-center gap-3 rounded-md px-3 text-[13px] font-medium transition-colors lg:w-full ${isActive ? 'bg-[#e9ece2] text-forest dark:bg-[#2b372a] dark:text-[#d3dcc8]' : 'text-slate-600 hover:bg-slate-100 hover:text-ink dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'}`}
            >
              <Icon aria-hidden="true" className="h-[17px] w-[17px]" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto hidden border-t border-rule p-4 dark:border-slate-800 lg:block">
          <div className="mb-3 flex items-center gap-3 rounded-md bg-paper px-3 py-3 dark:bg-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e7e9df] text-forest dark:bg-[#354234] dark:text-[#cbd5bd]">
              <Landmark aria-hidden="true" className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-ink dark:text-slate-100">Your account</p>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Private workspace</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink focus-visible:outline-offset-2 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Sign out">
              <LogOut aria-hidden="true" className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-rule px-5 py-3 dark:border-slate-800 lg:hidden">
          <ThemeToggle />
          <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-slate-500 transition-colors hover:text-ink dark:text-slate-300 dark:hover:text-white" aria-label="Sign out">
            <LogOut aria-hidden="true" className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[76px] items-center justify-between border-b border-rule px-5 sm:px-8 lg:px-10 dark:border-slate-800">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-moss">Personal finance</p>
            <h1 className="mt-1 font-sans text-[14px] font-medium tracking-normal text-ink dark:text-slate-100">{currentTitle}</h1>
          </div>
          <p className="hidden text-[12px] text-slate-500 dark:text-slate-400 sm:block">A clearer view of the everyday.</p>
        </header>

        <main className="w-full flex-1 px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10" key={location.pathname}>
          <div className="mx-auto w-full max-w-[1320px] animate-in fade-in duration-300">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-rule px-5 py-4 text-center text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:text-left sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1320px] flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span>Finance Pulse · A little more clarity, every day.</span>
            <span>© {new Date().getFullYear()} Finance Pulse</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
