
import React, { useState, useEffect } from 'react';
import { db } from '../../db/mockDb';
import { Complaint, ComplaintStatus, User, ServiceStatus, AssetService, Asset, AppSettings } from '../../types';
import { Search, Filter, Clock, MessageSquare, User as UserIcon, CheckCircle2, ChevronRight, X, AlertCircle, Loader2, Calendar } from 'lucide-react';

const ComplaintManagement: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<ComplaintStatus | 'ALL'>('ALL');
  
  // Modals
  const [pendingModal, setPendingModal] = useState<{ open: boolean, complaintId: string }>({ open: false, complaintId: '' });
  const [inProcessModal, setInProcessModal] = useState<{ open: boolean, complaintId: string }>({ open: false, complaintId: '' });
  const [closureModal, setClosureModal] = useState<{ open: boolean, complaintId: string }>({ open: false, complaintId: '' });
  
  const [pendingReason, setPendingReason] = useState('');
  const [inProcessData, setInProcessData] = useState({ start: '', end: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  // Closure Form State
  const [closureForm, setClosureForm] = useState<Partial<AssetService>>({
    monthOfTT: '', dateOfTT: '', dateOfClose: '', category: 'Hardware', subCategory: '', 
    technicianName: '', summary: '', status: ServiceStatus.COMPLETED_CLOSED,
    uncompletedRepairs: '', addedReplacedParts: '', partsCost: 0, invoiceReference: '', conclusion: '', whatNext: ''
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setComplaints(db.getComplaints().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setUsers(db.getUsers());
    setAssets(db.getAssets());
    setSettings(db.getSettings());
  };

  const updateComplaintStatus = async (id: string, newStatus: ComplaintStatus, extras?: { remarks?: string, start?: string, end?: string }) => {
    setIsProcessing(true);
    const all = db.getComplaints();
    const complaint = all.find(c => c.id === id);
    if (!complaint) return;

    const updated = all.map(c => {
      if (c.id === id) {
        return {
          ...c,
          status: newStatus,
          pendingReason: newStatus === ComplaintStatus.PENDING ? extras?.remarks : c.pendingReason,
          appointmentStart: extras?.start || c.appointmentStart,
          appointmentEnd: extras?.end || c.appointmentEnd,
          statusHistory: [
            ...c.statusHistory,
            { status: newStatus, timestamp: new Date().toISOString(), remarks: extras?.remarks }
          ]
        };
      }
      return c;
    });

    db.saveComplaints(updated);
    
    if (settings.enableNotifications && settings.notifyOnStatusChange) {
      try {
        const employee = users.find(u => u.id === complaint.userId);
        if (employee) {
          await fetch('https://formsubmit.co/ajax/' + employee.email, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              _subject: `IT Ticket Update: ${complaint.id} - ${newStatus}`,
              Name: employee.name,
              Ticket_ID: complaint.id,
              Subject: complaint.subject,
              Current_Status: newStatus,
              Remarks: extras?.remarks || 'Update recorded.',
              _template: 'table'
            })
          });
        }
      } catch (err) { console.warn(err); }
    }

    setComplaints(updated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setIsProcessing(false);
  };

  const handleStatusClick = (id: string, currentStatus: ComplaintStatus, targetStatus: ComplaintStatus) => {
    if (targetStatus === ComplaintStatus.PENDING) {
      setPendingModal({ open: true, complaintId: id });
    } else if (targetStatus === ComplaintStatus.IN_PROCESS) {
      const comp = complaints.find(c => c.id === id);
      setInProcessData({
        start: comp?.appointmentStart || new Date().toISOString().slice(0, 16),
        end: comp?.appointmentEnd || new Date(Date.now() + 3600000).toISOString().slice(0, 16)
      });
      setInProcessModal({ open: true, complaintId: id });
    } else if (targetStatus === ComplaintStatus.CLOSED) {
      const complaint = complaints.find(c => c.id === id);
      if (complaint) {
        if (settings.autoCreateServiceOnClose) {
          const employee = users.find(u => u.id === complaint.userId);
          const asset = assets.find(a => a.assetCode === complaint.assetCode);
          setClosureForm({
            ...closureForm,
            userId: complaint.userId,
            userName: employee?.name || '',
            assetId: asset?.id || '',
            assetCode: complaint.assetCode,
            assetType: asset?.assetType || '',
            brand: asset?.brand || '',
            model: asset?.model || '',
            serialNumber: asset?.serialNumber || '',
            summary: complaint.subject,
            monthOfTT: new Date(complaint.createdAt).toLocaleString('default', { month: 'long' }),
            dateOfTT: new Date(complaint.createdAt).toISOString().split('T')[0],
            dateOfClose: new Date().toISOString().split('T')[0]
          });
          setClosureModal({ open: true, complaintId: id });
        } else {
          updateComplaintStatus(id, ComplaintStatus.CLOSED, { remarks: "Closed as requested." });
        }
      }
    } else {
      updateComplaintStatus(id, targetStatus);
    }
  };

  const handleClosureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    const services = db.getServices();
    const newService: AssetService = {
      id: `svc-auto-${Date.now()}`,
      ...closureForm as AssetService,
      createdAt: new Date().toISOString()
    };
    db.saveServices([newService, ...services]);
    await updateComplaintStatus(closureModal.complaintId, ComplaintStatus.CLOSED, { remarks: closureForm.conclusion });
    setClosureModal({ open: false, complaintId: '' });
    setIsProcessing(false);
    refreshData();
  };

  const filtered = complaints.filter(c => {
    const user = users.find(u => u.id === c.userId);
    const matchesSearch = c.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'ALL' || c.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusStyle = (status: ComplaintStatus) => {
    switch (status) {
      case ComplaintStatus.NEW: return 'bg-red-50 text-red-900 border border-red-200';
      case ComplaintStatus.PENDING: return 'bg-amber-50 text-amber-900 border border-amber-200';
      case ComplaintStatus.IN_PROCESS: return 'bg-blue-50 text-blue-900 border border-blue-200';
      case ComplaintStatus.CLOSED: return 'bg-emerald-50 text-emerald-900 border border-emerald-200';
      default: return 'bg-slate-50 text-slate-900 border border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tighter">Support Lifecycle</h1>
          <p className="text-slate-600 text-sm font-medium">Monitor tickets and schedule technical resolution windows.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by subject or employee name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-1 focus:ring-brand-primary outline-none shadow-sm text-slate-900 bg-white font-medium"
          />
        </div>
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary bg-white font-bold text-slate-700 shadow-sm cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          {Object.values(ComplaintStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((comp) => {
          const user = users.find(u => u.id === comp.userId);
          const createdAt = new Date(comp.createdAt);
          const now = new Date();
          const daysOld = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24));
          const isBreached = settings.highlightSlaBreach && comp.status !== ComplaintStatus.CLOSED && daysOld >= settings.slaDays;

          return (
            <div key={comp.id} className={`bg-white p-6 rounded-2xl border transition-all shadow-sm ${isBreached ? 'border-red-400' : 'border-slate-200'}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`mt-1 p-3 rounded-xl shrink-0 ${getStatusStyle(comp.status)}`}>
                    <MessageSquare size={24} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-slate-900 uppercase tracking-tight">{comp.subject}</h3>
                      {isBreached && <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest shadow-sm">SLA BREACH ({daysOld}d)</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <UserIcon size={14} className="text-slate-400" /> <span className="text-slate-800">{user?.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-400" /> <span className="text-slate-800">{createdAt.toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-brand-primary bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{comp.assetCode}</span>
                      </div>
                    </div>
                    <p className="text-slate-800 text-sm font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">{comp.message}</p>
                    
                    {comp.status === ComplaintStatus.IN_PROCESS && comp.appointmentStart && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                        <Calendar size={16} className="text-blue-600" />
                        <p className="text-[11px] font-black text-blue-900 uppercase tracking-widest">
                          Scheduled: {new Date(comp.appointmentStart).toLocaleString()} — {new Date(comp.appointmentEnd || '').toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <select 
                    value={comp.status}
                    onChange={(e) => handleStatusClick(comp.id, comp.status, e.target.value as ComplaintStatus)}
                    className={`px-4 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest border-none ring-1 outline-none transition-all shadow-sm ${getStatusStyle(comp.status)} cursor-pointer`}
                  >
                    {Object.values(ComplaintStatus).map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending Modal */}
      {pendingModal.open && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setPendingModal({ open: false, complaintId: '' })} />
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl p-8 overflow-hidden">
            <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tighter border-b border-slate-100 pb-4">Hold Resolution</h2>
            <form onSubmit={(e) => { e.preventDefault(); updateComplaintStatus(pendingModal.complaintId, ComplaintStatus.PENDING, { remarks: pendingReason }); setPendingModal({ open: false, complaintId: '' }); setPendingReason(''); }} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Reason for Pending Status</label>
                <textarea required rows={4} value={pendingReason} onChange={e => setPendingReason(e.target.value)} placeholder="e.g. Awaiting part shipment from vendor..." className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary text-slate-900 bg-white font-medium shadow-inner" />
              </div>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setPendingModal({ open: false, complaintId: '' })} className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200">Cancel</button>
                <button type="submit" disabled={isProcessing} className="flex-1 py-3 bg-brand-primary text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-md hover:brightness-110 transition-all">Submit & Notify</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In Process Timing Modal */}
      {inProcessModal.open && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setInProcessModal({ open: false, complaintId: '' })} />
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl p-8 overflow-hidden">
            <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tighter border-b border-slate-100 pb-4">Define Service Window</h2>
            <form onSubmit={(e) => { e.preventDefault(); updateComplaintStatus(inProcessModal.complaintId, ComplaintStatus.IN_PROCESS, { start: inProcessData.start, end: inProcessData.end }); setInProcessModal({ open: false, complaintId: '' }); }} className="space-y-6">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900 text-[11px] font-bold uppercase tracking-tight shadow-inner">
                Note: This window will be synchronized to the global technical timeline and employee portal.
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Process Initiation</label>
                  <input required type="datetime-local" value={inProcessData.start} onChange={e => setInProcessData({...inProcessData, start: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary text-slate-900 bg-white font-bold shadow-inner" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Target Completion</label>
                  <input required type="datetime-local" value={inProcessData.end} onChange={e => setInProcessData({...inProcessData, end: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-1 focus:ring-brand-primary text-slate-900 bg-white font-bold shadow-inner" />
                </div>
              </div>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setInProcessModal({ open: false, complaintId: '' })} className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200">Cancel</button>
                <button type="submit" disabled={isProcessing} className="flex-1 py-3 bg-brand-primary text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-md hover:brightness-110 transition-all">Publish Window</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintManagement;
