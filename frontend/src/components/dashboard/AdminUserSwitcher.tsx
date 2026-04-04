/**
 * AdminUserSwitcher.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * A specialized selection UI for Admin users to switch dashboard views. 
 * Allows an admin to oversee any user's financial highlights by passing 
 * their ID to the aggregate Edge Function.
 *
 * Requirements:
 * - Fetches 'profiles' table (id, full_name, email).
 * - Notifies parent component when selection changes.
 * - Modern Tailwind styling matching the 'Finance Pulse' premium theme.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Users, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface AdminUserSwitcherProps {
  onUserSelected: (userId: string | null) => void;
}

const AdminUserSwitcher: React.FC<AdminUserSwitcherProps> = ({ onUserSelected }) => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string>("");

    // 1. Fetch available user profiles on mount
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                // Note: The admin's RLS policies must allow reading other profiles.
                const { data, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .order('full_name', { ascending: true });

                if (profileError) throw profileError;
                setUsers(data || []);
            } catch (err: any) {
                console.error("Failed to load user profiles:", err);
                setError(err.message || "Failed to load profiles list");
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    // 2. Handle selection changes
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedId(val);
        // If empty string, we default back to the current user's own data
        onUserSelected(val === "" ? null : val);
    };

    if (error) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>Profiles Unavailable</span>
            </div>
        );
    }

    return (
        <div className="relative flex items-center group">
            {/* Lead Icon Decor */}
            <div className="absolute left-4 z-10 px-0.5 bg-slate-50 dark:bg-slate-900 rounded-md transition-colors group-focus-within:bg-indigo-50 dark:group-focus-within:bg-indigo-900/30">
                <Users className="w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400" />
            </div>

            {/* User Select input wrapper */}
            {loading ? (
                <div className="pl-12 pr-6 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-2">
                    <Loader2 className="w-3 h-3 text-slate-600 dark:text-slate-500 animate-spin" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-500 uppercase tracking-widest">Loading Users...</span>
                </div>
            ) : (
                <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900/20 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 transition-all shadow-sm dark:shadow-black/20">
                   <select 
                        value={selectedId}
                        onChange={handleChange}
                        className="pl-12 pr-10 py-3 bg-transparent text-sm font-bold text-slate-900 dark:text-slate-100 outline-none appearance-none cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
                   >
                        <option value="" className="dark:bg-slate-900">Personal Protocol (Default)</option>
                        {users.map((profile) => (
                            <option key={profile.id} value={profile.id} className="dark:bg-slate-900">
                                {profile.full_name || 'Unnamed User'} {profile.email ? `(${profile.email})` : ''}
                            </option>
                        ))}
                   </select>
                   <div className="pr-4 pointer-events-none text-slate-400 dark:text-slate-500">
                        <ArrowRight className="w-4 h-4" />
                   </div>
                </div>
            )}
        </div>
    );
};

export default AdminUserSwitcher;
