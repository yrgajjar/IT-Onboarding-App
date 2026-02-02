
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db/mockDb';
import { UserCircle, Key, Mail, CheckCircle2, ShieldCheck, History, Clock } from 'lucide-react';
import { AuditLog } from '../../types';

const AdminProfile: React.FC = () => {
  const { user, updateCurrentUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>(db.getAuditLogs().filter(l => l.performedBy === user?.id).slice(0, 10));

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const allUsers = db.getUsers();
    const updated = allUsers.map(u => u.id === user.id ? { ...u, name, email, lastUpdated: new Date().toISOString() } : u);
    
    db.saveUsers(updated);
    updateCurrentUser({ name, email });
    
    db.addAuditLog({
      action: 'ADMIN_PROFILE_UPDATE',
      performedBy: user.id,
      performedByName: user.name,
      details: `Admin updated profile (Name: ${name}, Email: ${email})`
    });

    setSuccessMsg('Profile updated successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
    refreshLogs();
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    const allUsers = db.getUsers();
    const updated = allUsers.map(u => u.id === user.id ? { ...u, password: newPassword, lastUpdated: new Date().toISOString() } : u);
    
    db.saveUsers(updated);
    db.addAuditLog({
      action: 'ADMIN_PASSWORD_CHANGE',
      performedBy: user.id,
      performedByName: user.name,
      details: 'Admin changed their own password.'
    });

    setNewPassword('');
    setSuccessMsg('Password changed successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
    refreshLogs();
  };

  const refreshLogs = () => {
    setLogs(db.getAuditLogs().filter(l => l.performedBy === user?.id).slice(0, 10));
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Administrator Profile</h1>
        <p className="text-slate-500">Manage your administrative credentials and security settings.</p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={20} />
          <p className="font-semibold text-sm">{successMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* General Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
              <UserCircle className="text-indigo-600" size={20} />
              <h2 className="font-bold text-slate-900">General Information</h2>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Admin Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="pt-2">
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95">
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
              <Key className="text-amber-500" size={20} />
              <h2 className="font-bold text-slate-900">Privileged Password Reset</h2>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 mb-4">
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  As an administrator, you can reset your own password directly. Old password is not required. Ensure your account is secure.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password</label>
                <input 
                  required
                  type="password" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="pt-2">
                <button type="submit" className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Audit Log Sidebar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <History className="text-slate-500" size={20} />
            <h2 className="font-bold text-slate-900">Your Recent Activity</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[600px]">
            {logs.map(log => (
              <div key={log.id} className="flex gap-4 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Clock size={16} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 leading-tight mb-1">{log.action.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate-500 mb-2">{log.details}</p>
                  <span className="text-[10px] text-slate-400 font-medium">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center py-20 text-slate-400 italic">No activity logs found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
