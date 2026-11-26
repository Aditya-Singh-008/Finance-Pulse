import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import DashboardOverview from '../dashboard/DashboardOverview';
const AnalystDashboard = React.lazy(() => import('../dashboard/AnalystDashboard'));
import AdminUserManagement from '../dashboard/AdminUserManagement';
import { BarChart3, Users, WalletCards } from 'lucide-react';

type TabType = 'personal' | 'analyst' | 'iam';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          setUserRole(profile?.role || 'viewer');
        }
      } catch (error) {
        console.error('Error fetching role for navigation:', error);
        setUserRole('viewer');
      } finally {
        setLoading(false);
      }
    };
    fetchUserRole();
  }, []);

  const isAuthorizedForAnalytics = userRole === 'admin' || userRole === 'analyst';

  if (loading) {
    return (
      <div role="status" aria-label="Loading workspace" className="flex flex-col gap-5">
        <div className="h-12 w-full animate-pulse border-b border-border bg-surface" />
        <div className="h-[360px] w-full animate-pulse bg-surface" />
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: typeof WalletCards; visible: boolean }[] = [
    { id: 'personal', label: 'Personal', icon: WalletCards, visible: true },
    { id: 'analyst', label: 'Analytics', icon: BarChart3, visible: isAuthorizedForAnalytics },
    { id: 'iam', label: 'Access', icon: Users, visible: userRole === 'admin' },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-moss">Workspace</p>
          <p className="mt-1 text-[11px] text-muted">{userRole ? `${userRole.charAt(0).toUpperCase()}${userRole.slice(1)} access` : 'Your personal finance'}</p>
        </div>
        <div role="tablist" aria-label="Workspace views" className="flex w-full gap-1 overflow-x-auto sm:w-auto">
          {tabs.filter((tab) => tab.visible).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`${id}-tab`}
              role="tab"
              aria-selected={activeTab === id}
              aria-controls="workspace-panel"
              onClick={() => setActiveTab(id)}
              className={`motion-tab inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-[11px] font-medium transition-colors sm:px-4 ${activeTab === id ? 'bg-primary text-white dark:text-slate-950' : 'text-muted hover:bg-surface hover:text-foreground'}`}
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div id="workspace-panel" role="tabpanel" aria-labelledby={`${activeTab}-tab`} className="min-w-0 animate-in fade-in duration-300">
        {activeTab === 'personal' && <DashboardOverview />}
        {activeTab === 'analyst' && (
          <React.Suspense
            fallback={(
              <div role="status" className="flex min-h-96 items-center justify-center text-[12px] text-muted">
                Loading analytics…
              </div>
            )}
          >
            <AnalystDashboard />
          </React.Suspense>
        )}
        {activeTab === 'iam' && <AdminUserManagement />}
      </div>
    </div>
  );
};

export default MainLayout;
