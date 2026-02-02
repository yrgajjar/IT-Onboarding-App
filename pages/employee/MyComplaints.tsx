
import React, { useState, useEffect } from 'react';
import { db } from '../../db/mockDb';
import { useAuth } from '../../context/AuthContext';
import { Complaint, ComplaintStatus, Asset, AppSettings } from '../../types';
import { Plus, MessageSquare, AlertCircle, CheckCircle2, X, Loader2, Clock, ChevronRight, Calendar, Info } from 'lucide-react';

const MyComplaints: React.FC = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [myAssets, setMyAssets] = useState<Asset[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Complaint | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  
  const [formData, setFormData] = useState({
    assetCode: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    if (user) {
      setComplaints(db.getComplaints().filter(c => c.userId === user.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      const assets = db.getAssets().filter(a => a.assignedTo === user.id);
      setMyAssets(assets);
      if (assets.length > 0) {
        setFormData(prev => ({ ...prev, assetCode: assets[0].assetCode }));
      }
    }
    setSettings(db.getSettings());
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    const now = new Date().toISOString();
    const newComplaint: Complaint = {
      id: `ticket-${Date.now()}`,
      userId: user.id,
      assetCode: formData.assetCode,
      subject: formData.subject,
      message: formData.message,
      status: ComplaintStatus.NEW,
      statusHistory: [{ status: ComplaintStatus.NEW, timestamp: now, remarks: 'Ticket created by employee.' }],
      createdAt: now
    };

    const current = db.getComplaints();
    const updated = [...current, newComplaint];
    db.saveComplaints(updated);
    setComplaints(updated.filter(c => c.userId === user.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    
    try {
      await fetch('https://formsubmit.co/ajax/' + settings.adminEmailForNotifications, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: `New IT Complaint: ${formData.subject}`,
          Employee_Name: user.name,
          Asset_Code: formData.assetCode,
          Ticket_ID: newComplaint.id,
          Message: formData.message,
          _template: 'table'
        })
      });
    } catch (err) {
      console.warn('Notification error:', err);
    } finally {
      setIsSubmitting(false);
      setShowForm(false);
      setFormData(prev => ({ ...prev, subject: '', message: '' }));
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);
    }
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case ComplaintStatus.NEW: return 'bg-red-100 text-red-900 border border-red-200';
      case ComplaintStatus.PENDING: return 'bg-amber-100 text-amber-900 border border-amber-200';
      case ComplaintStatus.IN_PROCESS: return 'bg-blue-100 text-blue-900 border border-blue-200';
      case ComplaintStatus.CLOSED: return 'bg-emerald-100 text-emerald-900 border border-emerald-200';
      default: return 'bg-slate-100 text-slate-900 border border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {showSuccessToast && (
        <div className="fixed top-8 right-8 z-[200] bg-brand-primary text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3">
          <CheckCircle2 size={20} />
          <p className="text-sm font-bold uppercase tracking-widest">Ticket Published</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Support Pulse</h1>
          <p className="text-slate-600 text-sm font-medium">Track your technical requests and scheduled resolutions.</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 bg-brand-primary text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md hover:brightness-110 active:scale-95 transition-all uppercase tracking-widest"
        >
          <Plus size={18} /> New Request
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {complaints.map(comp => (
          <div 
            key={comp.id} 
            className="bg-white p-6 rounded-xl border border-slate-200 hover:border-brand-primary hover:shadow-lg transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 group shadow-sm" 
            onClick={() => setSelectedTicket(comp)}
          >
            <div className="flex gap-4 items-start">
              <div className={`p-3 rounded-lg shrink-0 ${getStatusBadge(comp.status)}`}>
                <MessageSquare size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-slate-900 uppercase tracking-tight group-hover:text-brand-primary transition-colors">{comp.subject}</h3>
                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>#{comp.id}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-800">{comp.assetCode}</span>
                  <span className="text-slate-300">•</span>
                  <span>{new Date(comp.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-slate-700 font-medium line-clamp-1 mt-1">{comp.message}</p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-4 self-end sm:self-center">
              <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${getStatusBadge(comp.status)} shadow-inner`}>
                {comp.status.replace('_', ' ')}
              </span>
              <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        ))}
        
        {complaints.length === 0 && (
          <div className="py-24 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
            <MessageSquare size={40} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Zero Active Requests</p>
          </div>
        )}
      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedTicket(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-xl shadow-2xl p-8 overflow-y-auto max-h-[90vh] no-scrollbar">
            <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${getStatusBadge(selectedTicket.status)} shadow-inner`}>
                    {selectedTicket.status.replace('_', ' ')}
                  </span>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket ID: {selectedTicket.id}</p>
                </div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{selectedTicket.subject}</h2>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>

            <div className="space-y-8">
              {selectedTicket.status === ComplaintStatus.IN_PROCESS && selectedTicket.appointmentStart && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-4 shadow-inner">
                  <Calendar className="text-brand-primary mt-1 shrink-0" size={20} />
                  <div>
                    <p className="text-[11px] font-black text-indigo-900 uppercase tracking-widest mb-1">Resolution Window Scheduled</p>
                    <p className="text-sm font-black text-slate-900">
                      {new Date(selectedTicket.appointmentStart).toLocaleString()} — {new Date(selectedTicket.appointmentEnd || '').toLocaleString()}
                    </p>
                    <p className="text-[11px] text-indigo-700 mt-1 font-bold uppercase tracking-tight opacity-70">Technician will visit/contact you during this block.</p>
                  </div>
                </div>
              )}

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl shadow-inner">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1.5 flex items-center gap-2"><Info size={12}/> Reported Problem Context</p>
                <p className="text-slate-900 text-sm leading-relaxed font-bold">{selectedTicket.message}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Clock size={16} className="text-brand-primary" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Technical Audit Trail</p>
                </div>
                <div className="space-y-6 pl-4 border-l-2 border-slate-200 ml-2">
                  {selectedTicket.statusHistory.map((h, i) => (
                    <div key={i} className="relative">
                      <div className={`absolute -left-[22px] top-1.5 w-3 h-3 rounded-full border-2 bg-white ${h.status === ComplaintStatus.CLOSED ? 'border-emerald-500' : 'border-brand-primary'}`} />
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{h.status.replace('_', ' ')}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{new Date(h.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                        </div>
                        {h.remarks && <p className="text-[12px] text-slate-700 font-bold italic leading-tight mt-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200 shadow-inner">"{h.remarks}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedTicket(null)} className="w-full mt-10 py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95">Dismiss View</button>
          </div>
        </div>
      )}

      {/* New Ticket Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isSubmitting && setShowForm(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-xl shadow-2xl p-8 overflow-hidden flex flex-col">
            <h2 className="text-xl font-black text-slate-900 mb-8 uppercase tracking-tighter border-b border-slate-100 pb-4">Initiate Support Request</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Device Association</label>
                <select 
                  required 
                  value={formData.assetCode} 
                  onChange={e => setFormData({ ...formData, assetCode: e.target.value })} 
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary bg-white text-sm font-black text-slate-900 transition-all appearance-none shadow-inner"
                >
                  {myAssets.map(a => <option key={a.id} value={a.assetCode}>{a.assetCode} — {a.model}</option>)}
                  {myAssets.length === 0 && <option value="PERSONAL">Personal / Bring Your Own</option>}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Issue Header (Subject)</label>
                <input required type="text" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} placeholder="e.g. Unusual fan noise or BIOS error" className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary text-sm font-bold text-slate-900 bg-white shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Technical Context (Message)</label>
                <textarea required rows={5} value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} placeholder="Explain the symptoms clearly..." className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary text-sm font-bold text-slate-900 bg-white shadow-inner" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200">Discard</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-3 bg-brand-primary text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Dispatch Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyComplaints;
