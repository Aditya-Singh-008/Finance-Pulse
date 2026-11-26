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
      <div className="grid min-h-screen place-items-center bg-background text-muted" role="status" aria-label="Loading your account">
        <span className="size-7 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <div className="finance-app flex min-h-screen flex-col bg-background text-foreground lg:flex-row">
      <aside className="sticky top-0 z-30 flex w-full shrink-0 flex-col border-b border-border bg-surface/95 backdrop-blur-md lg:static lg:min-h-screen lg:w-[236px] lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4 lg:px-6 lg:py-7">
          <Link to="/dashboard" className="flex items-center gap-3" aria-label="Finance Pulse overview">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-white dark:text-slate-950">
              <Landmark aria-hidden="true" className="size-[17px]" />
            </span>
            <span className="text-[14px] font-semibold tracking-[-0.04em]">finance pulse</span>
          </Link>
          <span className="hidden rounded-full border border-border px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted lg:inline-flex">Personal</span>
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <button onClick={handleLogout} className="inline-flex min-h-10 items-center gap-2 px-2 text-[11px] font-medium text-muted transition-colors hover:text-foreground" aria-label="Sign out">
              <LogOut aria-hidden="true" className="size-4" /> Sign out
            </button>
          </div>
        </div>

        <p className="hidden px-6 pb-3 pt-8 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted lg:block">Your money</p>
        <nav aria-label="Workspace navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `group inline-flex min-h-10 shrink-0 items-center gap-3 border-b-2 px-3 text-[12px] font-medium transition-colors lg:w-full lg:rounded-md lg:border-b-0 ${isActive ? 'border-primary text-primary lg:bg-secondary lg:text-foreground' : 'border-transparent text-muted hover:text-foreground lg:hover:bg-background'}`}
            >
              <Icon aria-hidden="true" className="size-[16px]" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto hidden border-t border-border p-4 lg:block">
          <div className="mb-3 flex items-center gap-3 border border-border bg-background px-3 py-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-primary">
              <Landmark aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium">Your account</p>
              <p className="mt-0.5 text-[9px] text-muted">Private workspace</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <button onClick={handleLogout} className="inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-[11px] font-medium text-muted transition-colors hover:bg-background hover:text-foreground" aria-label="Sign out">
              <LogOut aria-hidden="true" className="size-4" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[68px] items-center justify-between border-b border-border px-5 sm:px-8 lg:px-10">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-moss">Personal finance</p>
            <h1 className="mt-1 font-sans text-[12px] font-medium tracking-normal">{currentTitle}</h1>
          </div>
          <p className="hidden text-[11px] text-muted sm:block">A clearer view of the everyday.</p>
        </header>

        <main className="w-full flex-1 px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10" key={location.pathname}>
          <div className="mx-auto w-full max-w-[1380px] animate-in fade-in duration-300">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-border px-5 py-4 text-center text-[10px] text-muted sm:text-left sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1380px] flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span>Finance Pulse · A little more clarity, every day.</span>
            <span>© {new Date().getFullYear()} Finance Pulse</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
