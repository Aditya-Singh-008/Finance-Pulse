import { useEffect, useState, type ChangeEvent } from 'react';
import { AlertCircle, ArrowRight, Loader2, Users } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface AdminUserSwitcherProps {
  onUserSelected: (userId: string | null) => void;
}

const AdminUserSwitcher = ({ onUserSelected }: AdminUserSwitcherProps) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name', { ascending: true });

        if (profileError) throw profileError;
        setUsers(data || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load profiles list';
        console.error('Failed to load user profiles:', err);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedId(value);
    onUserSelected(value || null);
  };

  if (error) {
    return (
      <div role="status" className="inline-flex min-h-11 items-center gap-2 rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] px-3 text-xs font-semibold text-[var(--fp-expense)]">
        <AlertCircle aria-hidden="true" className="size-4" />
        <span>Profiles unavailable</span>
      </div>
    );
  }

  return (
    <div role="group" aria-label="View a user’s finances" className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-[6px] border border-[var(--fp-border-default)] bg-[var(--fp-bg-surface)] px-3">
      <Users aria-hidden="true" className="size-4 shrink-0 text-[var(--fp-brand-primary)]" />
      <span id="admin-user-viewing-label" className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        Viewing:
      </span>
      {loading ? (
        <span role="status" className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
          <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          Loading users
        </span>
      ) : (
        <div className="flex min-w-0 items-center gap-1">
          <select
            aria-labelledby="admin-user-viewing-label"
            value={selectedId}
            onChange={handleChange}
            className="min-w-0 max-w-[190px] appearance-none truncate bg-transparent py-2 text-xs font-semibold text-slate-900 outline-none focus-visible:underline dark:text-slate-100"
          >
            <option value="">My account</option>
            {users.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.full_name || 'Unnamed user'}{profile.email ? ` · ${profile.email}` : ''}
              </option>
            ))}
          </select>
          <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-slate-400" />
        </div>
      )}
    </div>
  );
};

export default AdminUserSwitcher;
