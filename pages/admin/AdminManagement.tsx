
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../db/mockDb';
// Fix: Add AssetUsage to imports
import { User, UserRole, AdminRole, UserPermissions, ModuleName, AssetUsage } from '../../types';
import { Plus, Search, Edit3, X, Loader2, CheckCircle2, UserPlus, ShieldAlert, Lock, Check, Camera, Key, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const MODULES_LIST: { id: ModuleName; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'employees', label: 'Employees' },
  { id: 'assets', label: 'Assets' },
  { id: 'mouse', label: 'Mouse' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'services', label: 'Services' },
  { id: 'complaints', label: 'Complaints' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'tools_manager', label: 'Tools Manager' },
  { id: 'admin', label: 'Admin User Management' },
  { id: 'rar', label: 'RAR – Removed Assets' },
  { id: 'settings', label: 'System Settings' },
];

const DEFAULT_PERMISSIONS: UserPermissions = {
  dashboard: { read: true, write: false, update: false },
  employees: { read: false, write: false, update: false },
  assets: { read: false, write: false, update: false },
  mouse: { read: false, write: false, update: false },
  accessories: { read: false, write: false, update: false },
  services: { read: false, write: false, update: false },
  complaints: { read: false, write: false, update: false },
  calendar: { read: false, write: false, update: false },
  tools_manager: { read: false, write: false, update: false },
  admin: { read: false, write: false, update: false },
  rar: { read: false, write: false, update: false },
  settings: { read: false, write: false, update: false },
};

const ROLE_PRESETS: Record<AdminRole, UserPermissions> = {
  [AdminRole.SUPER_ADMIN]: Object.fromEntries(MODULES_LIST.map(m => [m.id, { read: true, write: true, update: true }])),
  [AdminRole.OPERATOR]: Object.fromEntries(MODULES_LIST.map(m => [m.id, { read: true, write: false, update: false }])),
  [AdminRole.ASSETS_MANAGER]: {
    ...DEFAULT_PERMISSIONS,
    dashboard: { read: true, write: false, update: false },
    assets: { read: true, write: true, update: true },
    mouse: { read: true, write: true, update: true },
    accessories: { read: true, write: true, update: true },
    services: { read: true, write: true, update: true },
    rar: { read: true, write: false, update: false },
  },
  [AdminRole.COMPLAINT_ASSISTANT]: {
    ...DEFAULT_PERMISSIONS,
    dashboard: { read: true, write: false, update: false },
    complaints: { read: true, write: true, update: true },
  },
};

type ModalTab = 'basic' | 'roles' | 'profile' | 'security';

const AdminManagement: React.FC = () => {
  const { user: currentUser, updateCurrentUser } = useAuth();
  const [admins, setAdmins] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [activeTab, setActiveTab] = useState<ModalTab>('basic');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fix: Add assetUsage to initial state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    adminRole: AdminRole.OPERATOR,
    assetUsage: AssetUsage.COMPANY,
    isActive: true,
    profilePicture: undefined as string | undefined,
    permissions: { ...DEFAULT_PERMISSIONS }
  });

  const canUpdate = currentUser?.permissions?.admin?.update === true;
  const canWrite = currentUser?.permissions?.admin?.write === true;

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setAdmins(db.getUsers().filter(u => u.role === UserRole.ADMIN));
  };

  const handleRoleChange = (role: AdminRole) => {
    if (showEditModal?.id === currentUser?.id) return;
    setFormData({
      ...formData,
      adminRole: role,
      permissions: { ...ROLE_PRESETS[role] }
    });
  };

  const togglePermission = (module: string, type: 'read' | 'write' | 'update') => {
    if (showEditModal?.id === currentUser?.id) return;
    const current = formData.permissions[module] || { read: false, write: false, update: false };
    const nextValue = !current[type];
    let updatedModule = { ...current, [type]: nextValue };
    if (nextValue && (type === 'write' || type === 'update')) updatedModule.read = true;
    if (type === 'read' && !nextValue) { updatedModule.write = false; updatedModule.update = false; }
    setFormData({ ...formData, permissions: { ...formData.permissions, [module]: updatedModule } });
  };

  const handleSaveAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (showEditModal && !canUpdate) return;
    if (!showEditModal && !canWrite) return;

    setIsProcessing(true);
    const allUsers = db.getUsers();
    
    if (showEditModal) {
      if (showEditModal.id === 'admin-1' && (formData.adminRole !== AdminRole.SUPER_ADMIN || !formData.isActive)) {
        alert('Primary Super Admin cannot be modified.');
        setIsProcessing(false);
        return;
      }
      const updated = allUsers.map(u => u.id === showEditModal.id ? { ...u, ...formData, password: formData.password || u.password, lastUpdated: new Date().toISOString() } : u);
      db.saveUsers(updated);
      if (showEditModal.id === currentUser?.id) {
        updateCurrentUser({ name: formData.name, email: formData.email, mobile: formData.mobile, profilePicture: formData.profilePicture });
      }
      db.addAuditLog({ action: 'ADMIN_UPDATE', performedBy: currentUser?.id || 'sys', performedByName: currentUser?.name || 'Admin', details: `Updated admin: ${formData.name} (${formData.email})` });
      setSuccessToast('Administrator updated.');
    } else {
      // Fix: newAdmin literal now contains assetUsage from spread formData
      const newAdmin: User = { id: `adm-${Date.now()}`, ...formData, role: UserRole.ADMIN, createdAt: new Date().toISOString(), createdBy: currentUser?.id, createdByName: currentUser?.name };
      db.saveUsers([...allUsers, newAdmin]);
      setSuccessToast('New admin created.');
    }

    setTimeout(() => {
      setIsProcessing(false);
      setShowAddModal(false);
      setShowEditModal(null);
      setSuccessToast('');
      refreshData();
    }, 500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFormData(prev => ({ ...prev, profilePicture: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const filtered = admins.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.email.toLowerCase().includes(searchTerm.toLowerCase()));
  const isEditingSelf = showEditModal?.id === currentUser?.id;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {successToast && (
        <div className="fixed top-8 right-8 z-[200] bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3">
          <CheckCircle2 size={20} />
          <p className="text-sm font-bold uppercase">{successToast}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Administrators</h1>
          <p className="text-slate-600 text-sm font-medium">Manage delegated access and system privileges.</p>
        </div>
        {canWrite && (
          <button 
            // Fix: Add assetUsage to setFormData
            onClick={() => { setFormData({ name: '', email: '', mobile: '', password: 'password123', adminRole: AdminRole.OPERATOR, assetUsage: AssetUsage.COMPANY, isActive: true, profilePicture: undefined, permissions: { ...ROLE_PRESETS[AdminRole.OPERATOR] } }); setActiveTab('basic'); setShowAddModal(true); }}
            className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all"
          >
            <UserPlus size={18} /> Add Admin
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search admins..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-brand-primary outline-none text-slate-900" />
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
            <tr>
              <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-wider">Name</th>
              <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-wider">Role</th>
              <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-wider">Status</th>
              <th className="px-6 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((admin) => (
              <tr key={admin.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs overflow-hidden">
                      {admin.profilePicture ? <img src={admin.profilePicture} className="w-full h-full object-cover" /> : admin.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{admin.name}</p>
                      <p className="text-[11px] text-slate-500 font-semibold">{admin.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{admin.adminRole?.replace('_', ' ')}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${admin.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{admin.isActive ? 'Active' : 'Disabled'}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  {/* Fix: Add assetUsage to setFormData */}
                  <button onClick={() => { setFormData({ name: admin.name, email: admin.email, mobile: admin.mobile || '', password: '', adminRole: admin.adminRole || AdminRole.OPERATOR, assetUsage: admin.assetUsage || AssetUsage.COMPANY, isActive: admin.isActive, profilePicture: admin.profilePicture, permissions: admin.permissions || { ...DEFAULT_PERMISSIONS } }); setActiveTab('basic'); setShowEditModal(admin); }} className="p-2 text-slate-400 hover:text-brand-primary rounded-lg transition-colors"><Edit3 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isProcessing && (setShowAddModal(false), setShowEditModal(null))} />
          <div className="relative bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">{showEditModal ? 'Edit Admin' : 'New Admin'}</h2>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(null); }} className="p-1 text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <div className="flex bg-slate-50 px-6 border-b border-slate-100">
              {['basic', 'profile', 'roles', 'security'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{tab}</button>
              ))}
            </div>
            <form onSubmit={handleSaveAdmin} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              {activeTab === 'basic' && (
                <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-left-2 duration-200">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Full Name</label>
                    <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-1 focus:ring-brand-primary outline-none text-slate-900 font-medium" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Email</label>
                    <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-1 focus:ring-brand-primary outline-none text-slate-900 font-medium" />
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <input type="checkbox" checked={formData.isActive} disabled={showEditModal?.id === 'admin-1'} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4 text-brand-primary rounded" />
                    <span className="text-sm font-bold text-slate-800">Account Active</span>
                  </div>
                </div>
              )}
              {activeTab === 'roles' && (
                <div className="space-y-8 animate-in slide-in-from-left-2 duration-200">
                  <div className="max-w-sm space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Primary Role</label>
                    <select value={formData.adminRole} disabled={isEditingSelf || showEditModal?.id === 'admin-1'} onChange={e => handleRoleChange(e.target.value as AdminRole)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 font-bold">
                      <option value={AdminRole.OPERATOR}>Operator</option>
                      <option value={AdminRole.ASSETS_MANAGER}>Assets Manager</option>
                      <option value={AdminRole.COMPLAINT_ASSISTANT}>Complaint Assistant</option>
                      <option value={AdminRole.SUPER_ADMIN}>Super Admin</option>
                    </select>
                  </div>
                  <div className={`grid grid-cols-2 gap-3 ${isEditingSelf ? 'opacity-50 pointer-events-none' : ''}`}>
                    {MODULES_LIST.map((module) => {
                      const perm = formData.permissions[module.id] || { read: false, write: false, update: false };
                      return (
                        <div key={module.id} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-200">
                          <span className="text-xs font-bold text-slate-800">{module.label}</span>
                          <div className="flex gap-2">
                            {['read', 'write', 'update'].map((t) => (
                              <button key={t} type="button" onClick={() => togglePermission(module.id, t as any)} className={`w-7 h-7 rounded text-[10px] font-black uppercase transition-all shadow-sm ${perm[t as keyof typeof perm] ? 'bg-brand-primary text-white' : 'bg-white text-slate-400 border border-slate-300 hover:border-brand-primary'}`}>{t.charAt(0)}</button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </form>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button type="button" onClick={() => { setShowAddModal(false); setShowEditModal(null); }} className="px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-all uppercase tracking-widest">Cancel</button>
              <button type="submit" onClick={handleSaveAdmin} disabled={isProcessing} className="px-6 py-2 bg-brand-primary text-white text-sm font-bold rounded-lg shadow-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest">
                {isProcessing && <Loader2 className="animate-spin" size={14} />}
                {showEditModal ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
