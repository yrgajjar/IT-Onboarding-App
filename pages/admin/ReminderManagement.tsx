
import React, { useState, useEffect } from 'react';
import { db } from '../../db/mockDb';
import { UserReminder, ReminderStatus, ReminderRepeat, User, UserRole } from '../../types';
import { Plus, Search, CheckSquare, X, Loader2, CheckCircle2, Trash2, Calendar, User as UserIcon, Clock, Link as LinkIcon, Filter, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ReminderManagement: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const [reminders, setReminders] = useState<UserReminder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  const [formData, setFormData] = useState<Partial<UserReminder>>({
    title: '',
    description: '',
    assignedToIds: [],
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    repeat: 'NONE',
    priority: 'MEDIUM',
    linkedModule: 'GENERAL',
    status: 'PENDING'
  });

  const canWrite = currentAdmin?.permissions?.reminders?.write === true;

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setReminders(db.getReminders().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setUsers(db.getUsers());
  };

  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setIsProcessing(true);

    const newReminder: UserReminder = {
      id: `rem-${Date.now()}`,
      ...(formData as UserReminder),
      createdBy: currentAdmin?.id || 'sys',
      createdAt: new Date().toISOString()
    };

    const currentReminders = db.getReminders();
    db.saveReminders([newReminder, ...currentReminders]);

    db.addAuditLog({
      action: 'REMINDER_CREATED',
      performedBy: currentAdmin?.id || 'sys',
      performedByName: currentAdmin?.name || 'Admin',
      details: `Scheduled reminder: ${newReminder.title} for ${newReminder.assignedToIds.length} users`
    });

    setTimeout(() => {
      setIsProcessing(false);
      setShowAddModal(false);
      setSuccessToast('Reminder scheduled.');
      refreshData();
      setTimeout(() => setSuccessToast(''), 3000);
    }, 500);
  };

  const handleDeleteReminder = (id: string) => {
    if (!window.confirm('Delete this reminder?')) return;
    const updated = reminders.filter(r => r.id !== id);
    db.saveReminders(updated);
    refreshData();
  };

  const getStatusBadge = (status: ReminderStatus) => {
    switch (status) {
      case 'COMPLETED': return <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Completed</span>;
      case 'SNOOZED': return <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Snoozed</span>;
      default: return <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Pending</span>;
    }
  };

  const filteredReminders = reminders.filter(r => 
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.description.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-2xl font-bold text-slate-900">Task Scheduler</h1>
          <p className="text-slate-500 text-sm">Automated action reminders and follow-ups.</p>
        </div>
        {canWrite && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus size={18} /> Schedule Task
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search tasks..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-brand-primary outline-none" />
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
            <tr>
              <th className="px-6 py-3 font-semibold uppercase text-[10px]">Task Description</th>
              <th className="px-6 py-3 font-semibold uppercase text-[10px]">Assigned To</th>
              <th className="px-6 py-3 font-semibold uppercase text-[10px]">Schedule</th>
              <th className="px-6 py-3 font-semibold uppercase text-[10px]">Status</th>
              <th className="px-6 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredReminders.map((rem) => (
              <tr key={rem.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-bold text-slate-900">{rem.title}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{rem.description}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600">
                  {rem.assignedToIds.length} users
                </td>
                <td className="px-6 py-4 text-slate-500 text-xs">
                  <div className="flex items-center gap-1"><Calendar size={12}/> {rem.date}</div>
                  <div className="flex items-center gap-1 mt-0.5"><Clock size={12}/> {rem.time}</div>
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(rem.status)}
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDeleteReminder(rem.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
            {filteredReminders.length === 0 && (
              <tr>
                <td colSpan={5} className="py-20 text-center text-slate-400 italic">No scheduled tasks found.</td>
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
              <h2 className="text-xl font-bold text-slate-900">Schedule Task Reminder</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveReminder} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Task Title</label>
                  <input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-brand-primary outline-none" placeholder="e.g. Asset Audit Due" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Instructions</label>
                  <textarea required rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-brand-primary outline-none" placeholder="What needs to be done?" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Reminder Date</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Reminder Time</label>
                  <input required type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Assign To</label>
                  <select multiple value={formData.assignedToIds} onChange={e => setFormData({ ...formData, assignedToIds: Array.from(e.target.selectedOptions, o => o.value) })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white h-20">
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Linked Module</label>
                  <select value={formData.linkedModule} onChange={e => setFormData({ ...formData, linkedModule: e.target.value as any })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white">
                    <option value="GENERAL">General</option>
                    <option value="ASSET">Asset Module</option>
                    <option value="COMPLAINT">Complaint Module</option>
                    <option value="SERVICE">Service Module</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Repeat Frequency</label>
                  <select value={formData.repeat} onChange={e => setFormData({ ...formData, repeat: e.target.value as ReminderRepeat })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white">
                    <option value="NONE">No Repeat</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Priority</label>
                  <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value as any })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
            </form>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button type="submit" onClick={handleSaveReminder} disabled={isProcessing} className="px-6 py-2 bg-brand-primary text-white text-sm font-bold rounded-lg shadow-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
                {isProcessing && <Loader2 className="animate-spin" size={14} />}
                Set Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReminderManagement;
