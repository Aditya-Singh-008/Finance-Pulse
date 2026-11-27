/**
 * AdminUserManagement.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides administrative oversight of all platform users.
 * Supports promoting/demoting roles and toggling account status.
 * Fulfills "Managing user status such as active or inactive" requirement.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  Check,
  CircleAlert,
  CircleCheck,
  CircleX,
  Eye,
  LockKeyhole,
  LoaderCircle,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserMinus,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import ConfirmationModal from '../common/ConfirmationModal';

type UserRole = 'admin' | 'analyst' | 'viewer';
type UserStatus = 'active' | 'inactive';
type RoleFilter = 'all' | UserRole;

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

type PendingAction =
  | { type: 'role'; userId: string; fullName: string; from: UserRole; to: UserRole }
  | { type: 'status'; userId: string; fullName: string; from: UserStatus; to: UserStatus };

const SELF_POLICY_COPY = 'You cannot modify your own role or deactivate your own account.';

const roleLabel: Record<UserRole, string> = {
  admin: 'Admin',
  analyst: 'Analyst',
  viewer: 'Viewer',
};

const roleTone: Record<UserRole, string> = {
  admin: 'text-[var(--fp-expense)] bg-[color-mix(in_srgb,var(--fp-expense)_10%,transparent)]',
  analyst: 'text-[var(--fp-warning)] bg-[color-mix(in_srgb,var(--fp-warning)_12%,transparent)]',
  viewer: 'text-[var(--fp-info)] bg-[color-mix(in_srgb,var(--fp-info)_12%,transparent)]',
};

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

const getJoinedDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const getRoleIcon = (role: UserRole) => {
  if (role === 'admin') return <ShieldAlert aria-hidden="true" className="size-3.5" />;
  if (role === 'analyst') return <BriefcaseBusiness aria-hidden="true" className="size-3.5" />;
  return <Eye aria-hidden="true" className="size-3.5" />;
};

const RoleBadge = ({ role }: { role: UserRole }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-semibold ${roleTone[role]}`}>
    {getRoleIcon(role)}
    {roleLabel[role]}
  </span>
);

const MemberIdentity = ({ user }: { user: UserProfile }) => {
  const name = user.full_name || 'Anonymous User';

  return (
    <div className="flex min-w-0 items-center gap-3">
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt=""
          className="size-11 shrink-0 rounded-[6px] border border-[var(--fp-border-default)] object-cover"
        />
      ) : (
        <div aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-[6px] bg-[var(--fp-bg-sunken)] text-sm font-semibold text-[var(--fp-brand-primary)]">
          {getInitials(name)}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{name}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email || 'Email unavailable'}</p>
      </div>
    </div>
  );
};

const AccessState = ({
  user,
  currentUserId,
  updatingId,
  helpId,
}: {
  user: UserProfile;
  currentUserId: string | null;
  updatingId: string | null;
  helpId: string;
}) => {
  const isSelf = user.id === currentUserId;
  const isUpdating = updatingId === user.id;

  if (isUpdating) {
    return (
      <span role="status" aria-live="polite" className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-[var(--fp-brand-primary)]" />
        Updating access…
      </span>
    );
  }

  if (isSelf) {
    return (
      <span className="inline-flex min-h-11 items-center gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        <span title={SELF_POLICY_COPY} aria-describedby={helpId}>
          <LockKeyhole aria-hidden="true" className="size-4 shrink-0 text-[var(--fp-info)]" />
        </span>
        <span id={helpId}>{SELF_POLICY_COPY}</span>
      </span>
    );
  }

  return <span className="text-xs text-slate-400 dark:text-slate-500">Admin-managed</span>;
};

const DirectorySkeleton = () => (
  <>
    <div aria-label="Loading user directory" role="status" className="hidden md:block">
      <table className="w-full">
        <tbody>
          {Array.from({ length: 5 }, (_, index) => (
            <tr key={index} className="animate-pulse border-b border-[var(--fp-border-default)] last:border-0">
              <td colSpan={5} className="py-4">
                <div className="h-[52px] rounded-[6px] bg-[var(--fp-bg-sunken)]" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div aria-label="Loading user directory" role="status" className="flex flex-col gap-3 md:hidden">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="animate-pulse rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] p-4">
          <div className="mb-4 h-11 rounded-[6px] bg-[var(--fp-bg-sunken)]" />
          <div className="h-16 rounded-[6px] bg-[var(--fp-bg-sunken)]" />
        </div>
      ))}
    </div>
  </>
);

const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [identityReady, setIdentityReady] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('manage-users', {
        method: 'GET',
      });

      if (error) {
        let message = error.message;
        const responseContext = (error as Error & { context?: { json?: () => Promise<{ error?: string }> } }).context;
        if (typeof responseContext?.json === 'function') {
          try {
            const errorData = await responseContext.json();
            message = errorData.error || message;
          } catch {
            // Keep the function error message if the response body is unavailable.
          }
        }
        throw new Error(message || 'Access denied');
      }

      const list = Array.isArray(data) ? data : data?.data || [];
      setUsers(list);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Access denied';
      setError(message);
      toast.error(`Unable to load users: ${message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data }) => setCurrentUserId(data.user?.id || null))
      .catch(() => setCurrentUserId(null))
      .finally(() => setIdentityReady(true));
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdate = async (userId: string, updates: Partial<Pick<UserProfile, 'role' | 'status'>>) => {
    if (userId === currentUserId) return;

    try {
      setUpdatingId(userId);
      const { error } = await supabase.functions.invoke('manage-users', {
        method: 'PATCH',
        body: { userId, ...updates },
      });

      if (error) throw error;

      toast.success('User access updated.');
      setUsers((previousUsers) => previousUsers.map((user) => (user.id === userId ? { ...user, ...updates } : user)));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Unable to update user: ${message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const requestRoleChange = (user: UserProfile, nextRole: UserRole) => {
    if (user.id === currentUserId || user.role === nextRole) return;
    setPendingAction({
      type: 'role',
      userId: user.id,
      fullName: user.full_name || 'this member',
      from: user.role,
      to: nextRole,
    });
  };

  const requestStatusChange = (user: UserProfile) => {
    if (user.id === currentUserId) return;
    const currentStatus = user.status || 'active';
    setPendingAction({
      type: 'status',
      userId: user.id,
      fullName: user.full_name || 'this member',
      from: currentStatus,
      to: currentStatus === 'active' ? 'inactive' : 'active',
    });
  };

  const confirmPendingAction = async () => {
    const action = pendingAction;
    setPendingAction(null);
    if (!action) return;

    if (action.type === 'role') {
      await handleUpdate(action.userId, { role: action.to });
    } else {
      await handleUpdate(action.userId, { status: action.to });
    }
  };

  const summary = useMemo(() => ({
    total: users.length,
    admin: users.filter((user) => user.role === 'admin').length,
    analyst: users.filter((user) => user.role === 'analyst').length,
    viewer: users.filter((user) => user.role === 'viewer').length,
    active: users.filter((user) => (user.status || 'active') === 'active').length,
    inactive: users.filter((user) => user.status === 'inactive').length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !query || `${user.full_name || ''} ${user.email || ''}`.toLowerCase().includes(query);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const roleFilters: { value: RoleFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: summary.total },
    { value: 'admin', label: 'Admin', count: summary.admin },
    { value: 'analyst', label: 'Analyst', count: summary.analyst },
    { value: 'viewer', label: 'Viewer', count: summary.viewer },
  ];

  const pendingDetails = pendingAction?.type === 'role'
    ? {
        title: 'Confirm role change',
        message: `Change ${pendingAction.fullName} from ${roleLabel[pendingAction.from]} to ${roleLabel[pendingAction.to]}? This updates the member’s workspace permissions.`,
        warning: pendingAction.to === 'admin' ? 'Admin access grants full administrative control over user roles and account status.' : undefined,
        confirmLabel: `Change to ${roleLabel[pendingAction.to]}`,
        isDanger: pendingAction.to === 'admin',
      }
    : pendingAction?.type === 'status'
      ? {
          title: pendingAction.to === 'inactive' ? 'Deactivate account' : 'Reactivate account',
          message: pendingAction.to === 'inactive'
            ? `Deactivate ${pendingAction.fullName}? They will lose access to the workspace until an administrator reactivates their account.`
            : `Reactivate ${pendingAction.fullName}? They will be able to sign in and access the workspace again.`,
          warning: undefined,
          confirmLabel: pendingAction.to === 'inactive' ? 'Deactivate account' : 'Reactivate account',
          isDanger: pendingAction.to === 'inactive',
        }
      : null;

  const resetFilters = () => {
    setSearch('');
    setRoleFilter('all');
  };

  return (
    <section className="mt-6 overflow-hidden rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)]">
      <div className="flex flex-col gap-5 border-b border-[var(--fp-border-default)] p-4 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--fp-brand-primary)]">
            <Shield aria-hidden="true" className="size-4" />
            <span>Permissions &amp; governance</span>
          </div>
          <h1 className="font-serif text-3xl tracking-[-0.03em] text-slate-900 dark:text-slate-100 sm:text-4xl">Access &amp; Governance Directory</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">Review member roles, account status, and administrative access in one place.</p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-[470px]">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search by name or email</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              aria-label="Search by name or email"
              placeholder="Search by name or email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-h-11 w-full rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)] py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus-visible:border-[var(--fp-brand-primary)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--fp-brand-primary)_20%,transparent)] dark:text-slate-100"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch('')}
                className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-[6px] text-slate-500 hover:bg-[var(--fp-bg-sunken)] hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fp-brand-primary)] dark:hover:text-slate-100"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            )}
          </label>
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            aria-label="Refresh user list"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)] px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-[var(--fp-brand-primary)] hover:text-[var(--fp-brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fp-brand-primary)] disabled:cursor-wait disabled:opacity-60 dark:text-slate-200"
          >
            <RefreshCw aria-hidden="true" className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mx-4 mt-4 flex flex-col gap-3 rounded-[6px] border border-[color-mix(in_srgb,var(--fp-expense)_30%,transparent)] bg-[color-mix(in_srgb,var(--fp-expense)_8%,var(--fp-bg-surface))] p-3 sm:mx-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm text-[var(--fp-expense)]">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p><span className="font-semibold">Couldn’t load the directory.</span> {error}</p>
          </div>
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] px-3 text-sm font-semibold text-slate-700 hover:border-[var(--fp-expense)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fp-brand-primary)] disabled:opacity-60 sm:self-auto dark:text-slate-200"
          >
            <RefreshCw aria-hidden="true" className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-px border-b border-[var(--fp-border-default)] bg-[var(--fp-border-default)] sm:grid-cols-3 lg:grid-cols-6">
        <SummaryMetric label="Total users" value={summary.total} />
        <SummaryMetric label="Admins" value={summary.admin} tone="expense" />
        <SummaryMetric label="Analysts" value={summary.analyst} tone="warning" />
        <SummaryMetric label="Viewers" value={summary.viewer} tone="info" />
        <SummaryMetric label="Active" value={summary.active} tone="income" />
        <SummaryMetric label="Inactive" value={summary.inactive} tone="expense" />
      </div>

      <div className="flex flex-col gap-3 border-b border-[var(--fp-border-default)] px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2" aria-label="Filter by role">
          {roleFilters.map((filter) => {
            const selected = roleFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setRoleFilter(filter.value)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-[6px] border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fp-brand-primary)] ${selected ? 'border-[var(--fp-brand-primary)] bg-[color-mix(in_srgb,var(--fp-brand-primary)_10%,var(--fp-bg-surface))] text-[var(--fp-brand-primary)]' : 'border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] text-slate-600 hover:border-[var(--fp-brand-primary)] hover:text-[var(--fp-brand-primary)] dark:text-slate-300'}`}
              >
                {filter.label}
                <span className="fp-num text-xs tabular-nums opacity-75">{filter.count}</span>
              </button>
            );
          })}
        </div>
        <p role="status" aria-live="polite" className="text-xs text-slate-500 dark:text-slate-400">
          Showing <span className="fp-num font-semibold text-slate-700 dark:text-slate-200">{filteredUsers.length}</span> of <span className="fp-num">{summary.total}</span> members
        </p>
      </div>

      {loading && users.length === 0 ? (
        <div className="p-4 sm:p-6"><DirectorySkeleton /></div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
          <div className="mb-4 flex size-11 items-center justify-center rounded-[6px] bg-[var(--fp-bg-sunken)] text-[var(--fp-brand-primary)]">
            <Search aria-hidden="true" className="size-5" />
          </div>
          <h2 className="font-serif text-xl text-slate-900 dark:text-slate-100">No members match these filters</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">Try another name or email, or reset the role filter to view the full directory.</p>
          <button type="button" onClick={resetFilters} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] px-3 text-sm font-semibold text-[var(--fp-brand-primary)] hover:bg-[var(--fp-bg-sunken)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fp-brand-primary)]">
            <X aria-hidden="true" className="size-4" />
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)]">
                  <th scope="col" className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Member</th>
                  <th scope="col" className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Role</th>
                  <th scope="col" className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Status</th>
                  <th scope="col" className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Joined</th>
                  <th scope="col" className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Access control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--fp-border-default)]">
                {filteredUsers.map((user) => {
                  const isSelf = user.id === currentUserId;
                  const isActive = (user.status || 'active') === 'active';
                  const selfPolicyId = `desktop-self-policy-${user.id}`;
                  const updatingStatusId = `desktop-updating-${user.id}`;
                  const descriptionId = isSelf ? selfPolicyId : updatingId === user.id ? updatingStatusId : undefined;

                  return (
                    <tr key={user.id} className="transition-colors hover:bg-[var(--fp-bg-canvas)]">
                      <td className="px-5 py-4"><MemberIdentity user={user} /></td>
                      <td className="px-5 py-4">
                        <div className="flex min-w-[190px] flex-col items-start gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <RoleBadge role={user.role} />
                            {isSelf && <YouBadge />}
                          </div>
                          <select
                            aria-label={`Change ${user.full_name || 'user'} role`}
                            aria-describedby={descriptionId}
                            title={isSelf ? SELF_POLICY_COPY : undefined}
                            disabled={updatingId === user.id || user.id === currentUserId || !identityReady}
                            value={user.role}
                            onChange={(event) => requestRoleChange(user, event.target.value as UserRole)}
                            className="min-h-11 w-full max-w-[190px] rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] px-3 text-sm text-slate-700 outline-none focus-visible:border-[var(--fp-brand-primary)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--fp-brand-primary)_20%,transparent)] disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-200"
                          >
                            <option value="admin">Admin</option>
                            <option value="analyst">Analyst</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex min-w-[160px] items-center gap-3">
                          <StatusBadge status={isActive ? 'active' : 'inactive'} />
                          <button
                            type="button"
                            aria-label={isSelf ? 'Your account status cannot be changed here' : `${isActive ? 'Deactivate' : 'Reactivate'} ${user.full_name || 'user'}`}
                            aria-describedby={descriptionId}
                            title={isSelf ? SELF_POLICY_COPY : `${isActive ? 'Deactivate' : 'Reactivate'} account`}
                            disabled={updatingId === user.id || user.id === currentUserId || !identityReady}
                            onClick={() => requestStatusChange(user)}
                            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-[6px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fp-brand-primary)] disabled:cursor-not-allowed disabled:opacity-50 ${isActive ? 'border-[color-mix(in_srgb,var(--fp-expense)_30%,transparent)] bg-[color-mix(in_srgb,var(--fp-expense)_8%,var(--fp-bg-surface))] text-[var(--fp-expense)] hover:bg-[color-mix(in_srgb,var(--fp-expense)_15%,var(--fp-bg-surface))]' : 'border-[color-mix(in_srgb,var(--fp-income)_30%,transparent)] bg-[color-mix(in_srgb,var(--fp-income)_8%,var(--fp-bg-surface))] text-[var(--fp-income)] hover:bg-[color-mix(in_srgb,var(--fp-income)_15%,var(--fp-bg-surface))]'}`}
                          >
                            {isActive ? <UserMinus aria-hidden="true" className="size-4" /> : <UserCheck aria-hidden="true" className="size-4" />}
                          </button>
                        </div>
                      </td>
                      <td className="fp-num px-5 py-4 text-sm tabular-nums text-slate-500 dark:text-slate-400">{getJoinedDate(user.created_at)}</td>
                      <td className="px-5 py-4">
                        {updatingId === user.id && <span id={updatingStatusId} className="sr-only">Updating this member’s access.</span>}
                        <AccessState user={user} currentUserId={currentUserId} updatingId={updatingId} helpId={selfPolicyId} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 p-4 md:hidden">
            {filteredUsers.map((user) => {
              const isSelf = user.id === currentUserId;
              const isActive = (user.status || 'active') === 'active';
              const selfPolicyId = `mobile-self-policy-${user.id}`;
              const updatingStatusId = `mobile-updating-${user.id}`;
              const descriptionId = isSelf ? selfPolicyId : updatingId === user.id ? updatingStatusId : undefined;

              return (
                <article key={user.id} className="rounded-[10px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <MemberIdentity user={user} />
                    {isSelf && <YouBadge />}
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 border-t border-[var(--fp-border-default)] pt-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Role</span>
                      <RoleBadge role={user.role} />
                      <select
                        aria-label={`Change ${user.full_name || 'user'} role`}
                        aria-describedby={descriptionId}
                        title={isSelf ? SELF_POLICY_COPY : undefined}
                        disabled={updatingId === user.id || user.id === currentUserId || !identityReady}
                        value={user.role}
                        onChange={(event) => requestRoleChange(user, event.target.value as UserRole)}
                        className="min-h-11 w-full rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-canvas)] px-3 text-sm text-slate-700 outline-none focus-visible:border-[var(--fp-brand-primary)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--fp-brand-primary)_20%,transparent)] disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-200"
                      >
                        <option value="admin">Admin</option>
                        <option value="analyst">Analyst</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Status</span>
                      <div className="flex min-h-11 items-center gap-3">
                        <StatusBadge status={isActive ? 'active' : 'inactive'} />
                        <button
                          type="button"
                          aria-label={isSelf ? 'Your account status cannot be changed here' : `${isActive ? 'Deactivate' : 'Reactivate'} ${user.full_name || 'user'}`}
                          aria-describedby={descriptionId}
                          title={isSelf ? SELF_POLICY_COPY : `${isActive ? 'Deactivate' : 'Reactivate'} account`}
                          disabled={updatingId === user.id || user.id === currentUserId || !identityReady}
                          onClick={() => requestStatusChange(user)}
                          className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-[6px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fp-brand-primary)] disabled:cursor-not-allowed disabled:opacity-50 ${isActive ? 'border-[color-mix(in_srgb,var(--fp-expense)_30%,transparent)] bg-[color-mix(in_srgb,var(--fp-expense)_8%,var(--fp-bg-surface))] text-[var(--fp-expense)] hover:bg-[color-mix(in_srgb,var(--fp-expense)_15%,var(--fp-bg-surface))]' : 'border-[color-mix(in_srgb,var(--fp-income)_30%,transparent)] bg-[color-mix(in_srgb,var(--fp-income)_8%,var(--fp-bg-surface))] text-[var(--fp-income)] hover:bg-[color-mix(in_srgb,var(--fp-income)_15%,var(--fp-bg-surface))]'}`}
                        >
                          {isActive ? <UserMinus aria-hidden="true" className="size-4" /> : <UserCheck aria-hidden="true" className="size-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Joined</span>
                      <span className="fp-num text-sm tabular-nums text-slate-600 dark:text-slate-300">{getJoinedDate(user.created_at)}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Access control</span>
                      {updatingId === user.id && <span id={updatingStatusId} className="sr-only">Updating this member’s access.</span>}
                      <AccessState user={user} currentUserId={currentUserId} updatingId={updatingId} helpId={selfPolicyId} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <ConfirmationModal
        isOpen={Boolean(pendingAction)}
        title={pendingDetails?.title ?? ''}
        message={pendingDetails?.message ?? ''}
        warning={pendingDetails?.warning}
        confirmLabel={pendingDetails?.confirmLabel ?? 'Confirm'}
        cancelLabel="Cancel"
        isDanger={pendingDetails?.isDanger ?? false}
        onConfirm={() => { void confirmPendingAction(); }}
        onCancel={() => setPendingAction(null)}
      />
    </section>
  );
};

const SummaryMetric = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'expense' | 'warning' | 'info' | 'income';
}) => {
  const toneClasses = {
    expense: 'text-[var(--fp-expense)]',
    warning: 'text-[var(--fp-warning)]',
    info: 'text-[var(--fp-info)]',
    income: 'text-[var(--fp-income)]',
  };
  const toneClass = tone ? toneClasses[tone] : 'text-slate-900 dark:text-slate-100';
  return (
    <div className="min-w-0 bg-[var(--fp-bg-surface)] px-4 py-3 sm:px-5">
      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`fp-num mt-1 text-xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
};

const StatusBadge = ({ status }: { status: UserStatus }) => {
  const active = status === 'active';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-semibold ${active ? 'bg-[color-mix(in_srgb,var(--fp-income)_10%,transparent)] text-[var(--fp-income)]' : 'bg-[color-mix(in_srgb,var(--fp-expense)_10%,transparent)] text-[var(--fp-expense)]'}`}>
      {active ? <CircleCheck aria-hidden="true" className="size-3.5" /> : <CircleX aria-hidden="true" className="size-3.5" />}
      {active ? 'Active' : 'Inactive'}
    </span>
  );
};

const YouBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-[6px] bg-[color-mix(in_srgb,var(--fp-info)_12%,transparent)] px-2 py-1 text-[11px] font-semibold text-[var(--fp-info)]">
    <Check aria-hidden="true" className="size-3" />
    You
  </span>
);

export default AdminUserManagement;
