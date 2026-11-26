import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import DashboardOverview from '../dashboard/DashboardOverview';
const AnalystDashboard = React.lazy(() => import('../dashboard/AnalystDashboard'));
import AdminUserManagement from '../dashboard/AdminUserManagement';
import { BarChart3, ShieldCheck, Users, WalletCards } from 'lucide-react';

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
      <div role="status" aria-label="Loading workspace" className="space-y-4 animate-pulse">
        <div className="h-12 w-full border border-rule bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
        <div className="h-[520px] w-full bg-slate-50 dark:bg-slate-900" />
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: typeof WalletCards; visible: boolean }[] = [
    { id: 'personal', label: 'Personal', icon: WalletCards, visible: true },
    { id: 'analyst', label: 'Analytics', icon: BarChart3, visible: isAuthorizedForAnalytics },
    { id: 'iam', label: 'Access', icon: Users, visible: userRole === 'admin' },
  ];

  return (
    <div className="space-y-8">
      <div role="tablist" aria-label="Workspace views" className="flex w-full flex-wrap items-center gap-1 border-b border-rule dark:border-slate-800">
        {tabs.filter((tab) => tab.visible).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`${id}-tab`}
            role="tab"
            aria-selected={activeTab === id}
            aria-controls="workspace-panel"
            onClick={() => setActiveTab(id)}
            className={`relative inline-flex min-h-11 items-center gap-2.5 px-4 text-[13px] font-medium transition-colors focus-visible:z-10 sm:px-5 ${activeTab === id ? 'text-forest dark:text-[#c7d2bb]' : 'text-slate-500 hover:text-ink dark:text-slate-300 dark:hover:text-white'}`}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            {label}
            {activeTab === id && <span aria-hidden="true" className="absolute inset-x-3 -bottom-px h-0.5 bg-forest dark:bg-[#adbd9e]" />}
          </button>
        ))}
        <div className="ml-auto hidden items-center gap-2 pb-2 pl-4 text-[10px] font-medium text-slate-500 dark:text-slate-400 md:flex">
          <ShieldCheck aria-hidden="true" className="h-4 w-4 text-moss" />
          {userRole ? `${userRole.charAt(0).toUpperCase()}${userRole.slice(1)} access` : 'Workspace'}
        </div>
      </div>

      <div id="workspace-panel" role="tabpanel" aria-labelledby={`${activeTab}-tab`} className="min-w-0 animate-in fade-in duration-300">
        {activeTab === 'personal' && <DashboardOverview />}
        {activeTab === 'analyst' && (
          <React.Suspense
            fallback={(
              <div role="status" className="flex min-h-96 items-center justify-center text-sm font-medium text-slate-500 dark:text-slate-300">
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
