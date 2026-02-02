
import React, { useState, useEffect } from 'react';
import { db } from '../../db/mockDb';
import { UserAlert, AlertType, AlertTarget, AlertPriority, User, UserRole, AdminRole } from '../../types';
import { Plus, Search, Bell, X, Loader2, CheckCircle2, Trash2, Calendar, User as UserIcon, Users, AlertCircle, Info, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AlertManagement: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const [alerts, setAlerts] = useState<UserAlert[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  const [formData, setFormData] = useState<Partial<UserAlert>>({
    title: '',
    message: '',
    type: 'INFO',
    targetType: 'ALL',
    targetIds: [],
    validFrom: new Date().toISOString().split('T')[0],
    validTill: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'MEDIUM',
    dismissible: true
  });

  const canWrite = currentAdmin?.permissions?.alerts?.write === true;
  const canUpdate = currentAdmin?.permissions?.alerts?.update === true;

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setAlerts(db.getAlerts().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setUsers(db.getUsers());
  };

  const handleSaveAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setIsProcessing(true);

    const newAlert: UserAlert = {
      id: `alt-${Date.now()}`,
      ...(formData as UserAlert),
      createdBy: currentAdmin?.id || 'sys',
      createdAt: new Date().toISOString()
    };

    const currentAlerts = db.getAlerts();
    db.saveAlerts([newAlert, ...currentAlerts]);

    db.addAuditLog({
      action: 'ALERT_CREATED',
      performedBy: currentAdmin?.id || 'sys',
      performedByName: currentAdmin?.name || 'Admin',
      details: `Created new alert: ${newAlert.title} for ${newAlert.targetType}`
    });

    setTimeout(() => {
      setIsProcessing(false);
      setShowAddModal(false);
      setSuccessToast('Alert published successfully.');
      refreshData();
      setTimeout(() => setSuccessToast(''), 3000);
    }, 500);
  };

  const handleDeleteAlert = (id: string) => {
    if (!window.confirm('Delete this alert? It will disappear for all users.')) return;
    const updated = alerts.filter(a => a.id !== id);
    db.saveAlerts(updated);
    refreshData();
  };

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'CRITICAL': return <ShieldAlert className="text-red-600" size={20} />;
      case 'WARNING': return <AlertCircle className="text-amber-600" size={20} />;
      default: return <Info className="text-blue-600" size={20} />;
    }
  };

  const getStatusBadge = (alert: UserAlert) => {
    const now = new Date().toISOString();
    if (now > alert.validTill) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 uppercase">Expired</span>;
    if (now < alert.validFrom) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 uppercase">Scheduled</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 uppercase">Active</span>;
  };

  const filteredAlerts = alerts.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-slate-900">Communication Center</h1>
          <p className="text-slate-500 text-sm">Targeted system alerts and broadcast messages.</p>
        </div>
        {canWrite && (
          <button 
            onClick={() => { setShowAddModal(true); }}
            className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus size={18} /> New Alert
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search alerts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-brand-primary outline-none" />
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
            <tr>
              <th className="px-6 py-3 font-semibold uppercase text-[10px]">Title & Content</th>
              <th className="px-6 py-3 font-semibold uppercase text-[10px]">Target</th>
              <th className="px-6 py-3 font-semibold uppercase text-[10px]">Validity</th>
              <th className="px-6 py-3 font-semibold uppercase text-[10px]">Status</th>
              <th className="px-6 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAlerts.map((alert) => (
              <tr key={alert.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getAlertIcon(alert.type)}</div>
                    <div>
                      <p className="font-bold text-slate-900">{alert.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{alert.message}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{alert.targetType}: {alert.targetType === 'ALL' ? 'Global' : alert.targetIds.length}</span>
                </td>
                <td className="px-6 py-4 text-slate-500 text-xs">
                  {alert.validFrom} <br/> to {alert.validTill}
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(alert)}
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDeleteAlert(alert.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
            {filteredAlerts.length === 0 && (
              <tr>
                <td colSpan={5} className="py-20 text-center text-slate-400 italic">No alerts found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => !isProcessing && setShowAddModal(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">Broadcast New Alert</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveAlert} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Alert Title</label>
                  <input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-brand-primary outline-none" placeholder="e.g. Scheduled Downtime" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Description Message</label>
                  <textarea required rows={3} value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-brand-primary outline-none" placeholder="Detailed information for the user..." />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Alert Type</label>
                  <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as AlertType })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white">
                    <option value="INFO">Information</option>
                    <option value="WARNING">Warning</option>
                    <option value="CRITICAL">Critical (Non-Dismissible)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Priority</label>
                  <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value as AlertPriority })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Target Segment</label>
                  <select value={formData.targetType} onChange={e => setFormData({ ...formData, targetType: e.target.value as AlertTarget, targetIds: [] })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white">
                    <option value="ALL">All Users</option>
                    <option value="ROLE">Role-Based</option>
                    <option value="USER">Specific Users</option>
                  </select>
                </div>
                {formData.targetType === 'USER' && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Select Users</label>
                    <select multiple value={formData.targetIds} onChange={e => setFormData({ ...formData, targetIds: Array.from(e.target.selectedOptions, o => o.value) })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white h-20">
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                )}
                {formData.targetType === 'ROLE' && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Select Role</label>
                    <select value={formData.targetIds?.[0]} onChange={e => setFormData({ ...formData, targetIds: [e.target.value] })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white">
                      <option value="ADMIN">Admin Users</option>
                      <option value="EMPLOYEE">Employees</option>
                    </select>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Valid From</label>
                  <input type="date" value={formData.validFrom} onChange={e => setFormData({ ...formData, validFrom: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Valid Till</label>
                  <input type="date" value={formData.validTill} onChange={e => setFormData({ ...formData, validTill: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="diss" checked={formData.dismissible} onChange={e => setFormData({ ...formData, dismissible: e.target.checked })} className="w-4 h-4 text-brand-primary rounded" />
                <label htmlFor="diss" className="text-sm font-medium text-slate-700">Allow users to dismiss this alert</label>
              </div>
            </form>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button type="submit" onClick={handleSaveAlert} disabled={isProcessing} className="px-6 py-2 bg-brand-primary text-white text-sm font-bold rounded-lg shadow-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
                {isProcessing && <Loader2 className="animate-spin" size={14} />}
                Publish Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertManagement;
