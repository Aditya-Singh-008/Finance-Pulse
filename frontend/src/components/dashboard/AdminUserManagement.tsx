import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase, CheckCircle2, Eye, RefreshCw, Search, Shield, ShieldAlert, UserCheck, UserMinus, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '../common/ConfirmationModal';

type UserRole = 'admin' | 'analyst' | 'viewer';
type UserStatus = 'active' | 'inactive';

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

type UserUpdate = Partial<Pick<UserProfile, 'role' | 'status'>>;
interface PendingChange { userId: string; name: string; updates: UserUpdate; title: string; message: string; confirmLabel: string; isDanger: boolean; }

const roleLabels: Record<UserRole, string> = { admin: 'Administrator', analyst: 'Analyst', viewer: 'Viewer' };

const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: functionError } = await supabase.functions.invoke('manage-users', { method: 'GET' });
      if (functionError) {
        let message = functionError.message;
        const context: unknown = 'context' in functionError ? functionError.context : null;
        if (context instanceof Response) {
          try {
            const body: unknown = await context.clone().json();
            if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') message = body.error;
          } catch {
            // Keep the original function error when the response body is unavailable.
          }
        }
        throw new Error(message || 'Access denied');
      }
      const list = Array.isArray(data) ? data : data?.data || [];
      setUsers(list);
      setError(null);
    } catch (requestError: unknown) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to load users.';
      setError(message);
      toast.error(`Unable to load users: ${message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdate = async (userId: string, updates: UserUpdate) => {
    try {
      setUpdatingId(userId);
      const { error: functionError } = await supabase.functions.invoke('manage-users', { method: 'PATCH', body: { userId, ...updates } });
      if (functionError) throw functionError;
      toast.success('User access updated.');
      setUsers((previous) => previous.map((user) => user.id === userId ? { ...user, ...updates } : user));
    } catch (requestError: unknown) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to update user.';
      toast.error(`Unable to update user: ${message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => user.full_name?.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query) || user.role.toLowerCase().includes(query) || (user.status || 'active').toLowerCase().includes(query));
  }, [search, users]);
  const activeCount = users.filter((user) => (user.status || 'active') === 'active').length;
  const inactiveCount = users.length - activeCount;
  const adminCount = users.filter((user) => user.role === 'admin').length;

  const getRoleIcon = (role: UserRole) => {
    if (role === 'admin') return <ShieldAlert aria-hidden="true" className="size-3.5 text-accent" />;
    if (role === 'analyst') return <Briefcase aria-hidden="true" className="size-3.5 text-primary" />;
    return <Eye aria-hidden="true" className="size-3.5 text-muted" />;
  };

  const requestRoleChange = (user: UserProfile, role: UserRole) => {
    if (role === user.role) return;
    setPendingChange({ userId: user.id, name: user.full_name || 'this user', updates: { role }, title: 'Change account role?', message: `Change ${user.full_name || 'this user'} from ${roleLabels[user.role]} to ${roleLabels[role]}? The role determines which workspace views are available.`, confirmLabel: 'Update role', isDanger: role === 'admin' });
  };

  const requestStatusChange = (user: UserProfile) => {
    const nextStatus: UserStatus = (user.status || 'active') === 'active' ? 'inactive' : 'active';
    setPendingChange({ userId: user.id, name: user.full_name || 'this user', updates: { status: nextStatus }, title: nextStatus === 'inactive' ? 'Deactivate account?' : 'Reactivate account?', message: nextStatus === 'inactive' ? `Deactivate ${user.full_name || 'this user'}? They will lose access to their financial workspace until reactivated.` : `Restore workspace access for ${user.full_name || 'this user'}?`, confirmLabel: nextStatus === 'inactive' ? 'Deactivate' : 'Reactivate', isDanger: nextStatus === 'inactive' });
  };

  const confirmPendingChange = () => {
    if (!pendingChange) return;
    const { userId, updates } = pendingChange;
    setPendingChange(null);
    void handleUpdate(userId, updates);
  };

  if (error) {
    const restricted = error.toLowerCase().includes('inactive') || error.toLowerCase().includes('forbidden');
    return (
      <section role="alert" className="mx-auto flex max-w-xl flex-col items-center border border-border bg-surface px-6 py-16 text-center">
        <ShieldAlert aria-hidden="true" className={`size-9 ${restricted ? 'text-warning' : 'text-negative'}`} />
        <p className="mt-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">Account administration</p>
        <h2 className="mt-2 text-3xl">{restricted ? 'Admin access unavailable' : 'Couldn’t load user access'}</h2>
        <p className="mt-3 max-w-sm text-[11px] leading-6 text-muted">{restricted ? 'Your administrator access is inactive. Contact another administrator if you think this should be changed.' : error}</p>
        {!restricted && <button type="button" onClick={() => void fetchUsers()} className="motion-button mt-6 inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-[10px] font-medium text-white dark:text-slate-950"><RefreshCw aria-hidden="true" className="size-3.5" /> Try again</button>}
      </section>
    );
  }

  return (
    <section aria-labelledby="access-register-title" className="space-y-6">
      <header className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-accent"><Shield aria-hidden="true" className="size-3.5" /> Account administration</p>
          <h2 id="access-register-title" className="mt-2 text-[2.6rem] leading-[0.96] sm:text-[3.3rem]">Access register</h2>
          <p className="mt-3 max-w-xl text-[11px] text-muted">Review roles and account status. Changes to access are confirmed before they are applied.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 flex-1 sm:min-w-[250px]">
            <span className="sr-only">Search users by name, email, role, or status</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input type="search" aria-label="Search users by name, email, role, or status" placeholder="Find a user…" value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-10 w-full border border-border bg-surface pl-10 pr-3 text-[10px] text-foreground outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/10" />
          </label>
          <button type="button" onClick={() => void fetchUsers()} aria-label="Refresh user list" className="inline-flex min-h-10 items-center justify-center gap-2 border border-border bg-surface px-3 text-[10px] font-medium text-muted transition-colors hover:text-foreground">
            <RefreshCw aria-hidden="true" className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </header>

      <div className="grid border-y border-border sm:grid-cols-3" aria-label="User access summary">
        <p className="border-b border-border py-3 text-[10px] text-muted sm:border-b-0 sm:border-r sm:pr-4"><strong className="money-figure mr-2 text-[1.3rem] font-medium text-foreground">{users.length}</strong> Total accounts</p>
        <p className="border-b border-border py-3 text-[10px] text-muted sm:border-b-0 sm:border-r sm:px-4"><strong className="money-figure mr-2 text-[1.3rem] font-medium text-positive">{activeCount}</strong> Active</p>
        <p className="py-3 text-[10px] text-muted sm:pl-4"><strong className="money-figure mr-2 text-[1.3rem] font-medium text-accent">{adminCount}</strong> Administrators <span className="ml-1 text-muted/70">· {inactiveCount} inactive</span></p>
      </div>

      {loading && users.length === 0 ? (
        <div role="status" aria-label="Loading user access" className="flex flex-col gap-3 py-3"><div className="h-12 animate-pulse bg-surface" /><div className="h-12 animate-pulse bg-surface" /><div className="h-12 animate-pulse bg-surface" /></div>
      ) : filteredUsers.length === 0 ? (
        <div className="border-b border-border py-12 text-center"><p className="font-display text-xl">No matching accounts</p><p className="mt-1 text-[10px] text-muted">Adjust your search to see other users.</p></div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead><tr className="border-b border-border text-[8px] font-semibold uppercase tracking-[0.15em] text-muted"><th scope="col" className="py-3 pr-4">Identity</th><th scope="col" className="px-4 py-3">Role</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Member since</th><th scope="col" className="py-3 pl-4 text-right">Management</th></tr></thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => {
                  const status = user.status || 'active';
                  const isCurrentUser = user.id === currentUserId;
                  return <tr key={user.id} className="motion-row transition-colors hover:bg-surface">
                    <td className="py-4 pr-4"><div className="flex items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-primary">{user.full_name?.[0]?.toUpperCase() || '?'}</span><div className="min-w-0"><p className="truncate text-[10px] font-medium">{user.full_name || 'Unnamed user'}</p><p className="mt-0.5 max-w-[220px] truncate text-[9px] text-muted">{user.email || user.id.substring(0, 12)}</p></div></div></td>
                    <td className="px-4 py-4"><span className="inline-flex items-center gap-2 text-[9px] font-medium text-foreground">{getRoleIcon(user.role)}{roleLabels[user.role]}</span></td>
                    <td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 text-[9px] font-medium ${status === 'active' ? 'text-positive' : 'text-accent'}`}>{status === 'active' ? <CheckCircle2 aria-hidden="true" className="size-3.5" /> : <XCircle aria-hidden="true" className="size-3.5" />}{status === 'active' ? 'Active' : 'Inactive'}</span></td>
                    <td className="whitespace-nowrap px-4 py-4 text-[9px] text-muted">{user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="py-4 pl-4"><div className="flex items-center justify-end gap-2">
                      <label className="sr-only" htmlFor={`role-${user.id}`}>Change {user.full_name || 'user'} role</label>
                      <select id={`role-${user.id}`} disabled={updatingId === user.id || isCurrentUser} value={user.role} onChange={(event) => requestRoleChange(user, event.target.value as UserRole)} className="min-h-8 max-w-[150px] border border-border bg-surface px-2 text-[9px] text-foreground outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"><option value="viewer">Viewer</option><option value="analyst">Analyst</option><option value="admin">Administrator</option></select>
                      <button type="button" onClick={() => requestStatusChange(user)} disabled={updatingId === user.id || isCurrentUser} aria-label={isCurrentUser ? 'Your own account access cannot be changed here' : status === 'active' ? `Deactivate ${user.full_name || 'user'}` : `Reactivate ${user.full_name || 'user'}`} title={isCurrentUser ? 'Your own account access cannot be changed here' : status === 'active' ? 'Deactivate account' : 'Reactivate account'} className="flex size-8 items-center justify-center border border-border text-muted transition-colors hover:border-accent hover:bg-accent/10 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40">{status === 'active' ? <UserMinus aria-hidden="true" className="size-3.5" /> : <UserCheck aria-hidden="true" className="size-3.5" />}</button>
                    </div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border md:hidden">
            {filteredUsers.map((user) => {
              const status = user.status || 'active';
              const isCurrentUser = user.id === currentUserId;
              return <li key={user.id} className="py-4">
                <div className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-primary">{user.full_name?.[0]?.toUpperCase() || '?'}</span><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium">{user.full_name || 'Unnamed user'}</p><p className="mt-0.5 truncate text-[9px] text-muted">{user.email || user.id.substring(0, 12)}</p></div><span className={`inline-flex items-center gap-1 text-[9px] ${status === 'active' ? 'text-positive' : 'text-accent'}`}>{status === 'active' ? <CheckCircle2 aria-hidden="true" className="size-3.5" /> : <XCircle aria-hidden="true" className="size-3.5" />}{status}</span></div>
                <div className="mt-3 flex items-center justify-between gap-3 pl-12"><label className="flex flex-1 items-center gap-2 text-[9px] text-muted">Role<select aria-label={`Change ${user.full_name || 'user'} role`} disabled={updatingId === user.id || isCurrentUser} value={user.role} onChange={(event) => requestRoleChange(user, event.target.value as UserRole)} className="min-h-9 min-w-0 flex-1 border border-border bg-surface px-2 text-[10px] text-foreground disabled:opacity-50"><option value="viewer">Viewer</option><option value="analyst">Analyst</option><option value="admin">Administrator</option></select></label><button type="button" onClick={() => requestStatusChange(user)} disabled={updatingId === user.id || isCurrentUser} aria-label={isCurrentUser ? 'Your own account access cannot be changed here' : status === 'active' ? `Deactivate ${user.full_name || 'user'}` : `Reactivate ${user.full_name || 'user'}`} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 border border-border px-2.5 text-[9px] text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-40">{status === 'active' ? <UserMinus aria-hidden="true" className="size-3.5" /> : <UserCheck aria-hidden="true" className="size-3.5" />}{status === 'active' ? 'Deactivate' : 'Reactivate'}</button></div>
                {isCurrentUser && <p className="mt-2 pl-12 text-[9px] text-muted">Your own access cannot be changed here.</p>}
              </li>;
            })}
          </ul>
        </>
      )}

      <ConfirmationModal isOpen={Boolean(pendingChange)} title={pendingChange?.title || 'Confirm access change'} message={pendingChange?.message || ''} confirmLabel={pendingChange?.confirmLabel || 'Confirm'} isDanger={pendingChange?.isDanger || false} onConfirm={confirmPendingChange} onCancel={() => setPendingChange(null)} />
    </section>
  );
};

export default AdminUserManagement;
