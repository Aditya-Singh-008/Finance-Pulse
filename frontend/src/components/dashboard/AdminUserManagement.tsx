/**
 * AdminUserManagement.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides administrative oversight of all platform users.
 * Supports promoting/demoting roles and toggling account status.
 * Fulfills "Managing user status such as active or inactive" requirement.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldAlert, 
  UserCheck, 
  UserMinus, 
  RefreshCw, 
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  Briefcase,
  Eye
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
  role: 'admin' | 'analyst' | 'viewer';
  status: 'active' | 'inactive';
  created_at: string;
}

const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      console.log('DEBUG: ADMIN CONTROL CENTER - Protocol Request Initiated...');
      setLoading(true);
      // Explicitly use GET method to avoid default empty-body POST
      const { data, error } = await supabase.functions.invoke('manage-users', {
        method: 'GET'
      });
      
      if (error) {
        console.error('DEBUG: HANDSHAKE FAILED:', error);
        throw error;
      }
      
      console.log('DEBUG: DATA RECALIBRATED SUCCESSFULEY:', data);
      // Handle response structure (sometimes it's double wrapped)
      const list = Array.isArray(data) ? data : data?.data || [];
      setUsers(list);
    } catch (err: any) {
      console.error('Admin Panel Error:', err);
      toast.error('Failed to load user protocols: ' + (err.message || 'Access Denied'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('DEBUG: ADMIN CONTROL CENTER - Integrity Shield Active (Component Mounted)');
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdate = async (userId: string, updates: Partial<UserProfile>) => {
    try {
      setUpdatingId(userId);
      // Removed sub-path to resolve 404; userId is now in body
      const { error } = await supabase.functions.invoke(`manage-users`, {
        method: 'PATCH',
        body: { userId, ...updates }
      });

      if (error) throw error;

      toast.success('Core status recalibrated.');
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    } catch (err: any) {
      toast.error('Recalibration failed: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case 'analyst': return <Briefcase className="w-4 h-4 text-indigo-500" />;
      default: return <Eye className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 mt-12 overflow-hidden shadow-sm dark:shadow-none animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500">Access Control Center</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Identity & <span className="text-rose-500">Role Management</span></h2>
          <p className="text-slate-600 dark:text-slate-400 font-medium mt-1">Audit and update platform access levels in real-time.</p>
        </div>

        <div className="flex gap-4">
          <div className="relative group max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search registry..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white pl-12 pr-6 py-3 rounded-2xl w-full focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm"
            />
          </div>
          <button 
            onClick={fetchUsers}
            className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl hover:bg-indigo-500/20 transition-all"
          >
            <RefreshCw className={`w-5 h-5 text-indigo-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] font-black text-slate-600 dark:text-slate-400">Identity</th>
              <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] font-black text-slate-600 dark:text-slate-400">Current Role</th>
              <th className="text-left py-4 px-6 text-[10px] uppercase tracking-[0.2em] font-black text-slate-600 dark:text-slate-400">Integrity Status</th>
              <th className="text-right py-4 px-6 text-[10px] uppercase tracking-[0.2em] font-black text-slate-600 dark:text-slate-400">Access Protocols</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {loading && users.length === 0 ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={4} className="py-8 px-6">
                    <div className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded-2xl"></div>
                  </td>
                </tr>
              ))
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-20 text-center opacity-40">
                  <Shield className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold tracking-tight">No identities found within specified parameters.</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="group hover:bg-slate-100/50 dark:hover:bg-indigo-500/5 transition-all duration-300">
                  <td className="py-6 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20">
                        {user.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="text-slate-900 dark:text-white font-black tracking-tight">{user.full_name || 'Anonymous User'}</div>
                        <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{user.id.substring(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {getRoleIcon(user.role)}
                      <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">{user.role}</span>
                    </div>
                  </td>
                  <td className="py-6 px-6">
                    <div className={`flex items-center gap-2 ${(user.status || 'active').toLowerCase() === 'active' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {(user.status || 'active').toLowerCase() === 'active' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{user.status || 'active'}</span>
                    </div>
                  </td>
                  <td className="py-6 px-6">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 transition-transform">
                      {/* Update Role Actions */}
                      <select 
                        disabled={updatingId === user.id}
                        value={user.role}
                        onChange={(e) => handleUpdate(user.id, { role: e.target.value as any })}
                        className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 rounded-xl px-4 py-2 hover:border-indigo-500 transition-all cursor-pointer outline-none"
                      >
                        <option value="viewer">Demote to Viewer</option>
                        <option value="analyst">Promote to Analyst</option>
                        <option value="admin">Super Admin</option>
                      </select>

                      {/* Toggle Status Action */}
                      <button
                        onClick={() => handleUpdate(user.id, { status: user.status === 'active' ? 'inactive' : 'active' })}
                        disabled={updatingId === user.id}
                        className={`p-2 rounded-xl border transition-all ${
                          user.status === 'active' 
                            ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-500 hover:bg-rose-500 hover:text-white' 
                            : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                        }`}
                        title={user.status === 'active' ? 'Deactivate Node' : 'Initialize Node'}
                      >
                        {user.status === 'active' ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUserManagement;
