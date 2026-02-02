
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../db/mockDb';
import { useAuth } from '../../context/AuthContext';
import { ByodEntry, ByodStatus, User, UserRole, AssetUsage, AssetStatus, AssetHistory } from '../../types';
import { Search, Monitor, Filter, Download, X, Archive, ShieldCheck, AlertCircle, FileText, ChevronDown, CheckCircle2, Loader2, Smartphone, Laptop, Tablet, ListFilter, Trash2, ShieldAlert, Check, Ban, Eye, User as UserIcon, Calendar, Clock, Phone, Mail, ChevronRight, RefreshCw } from 'lucide-react';

const ByodManagement: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const [entries, setEntries] = useState<ByodEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ByodStatus | 'ALL'>('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRetrieveModal, setShowRetrieveModal] = useState<ByodEntry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<ByodEntry | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<ByodEntry | null>(null);
  const [retrievalReason, setRetrievalReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setEntries(db.getByodEntries());
  };

  const departments = useMemo(() => ['ALL', ...new Set(entries.map(e => e.department))], [entries]);

  const filtered = entries.filter(e => {
    const matchesSearch = e.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    const matchesDept = deptFilter === 'ALL' || e.department === deptFilter;
    return matchesSearch && matchesStatus && matchesDept;
  });

  const handleApprove = (entry: ByodEntry) => {
    if (!currentAdmin) return;
    setIsProcessing(true);
    
    const now = new Date().toISOString();

    // 1. Update BYOD Entry
    const allByod = db.getByodEntries();
    const updatedByod = allByod.map(e => e.id === entry.id ? {
      ...e,
      status: ByodStatus.ACTIVE,
      approvedAt: now,
      approvedBy: currentAdmin.name
    } : e);
    db.saveByodEntries(updatedByod);

    // 2. Find and Move assigned assets to Queue (Pending Audit)
    const allAssets = db.getAssets();
    const assetsToOffboard = allAssets.filter(a => a.assignedTo === entry.userId);
    
    if (assetsToOffboard.length > 0) {
        const updatedAssets = allAssets.map(a => {
            if (a.assignedTo === entry.userId) {
                // Add to history
                const h: AssetHistory = {
                    id: `hist-byod-offboard-${Date.now()}-${a.id}`,
                    assetId: a.id,
                    userId: entry.userId,
                    type: 'RETURN',
                    note: 'Automatic return to Audit Queue due to BYOD Approval.',
                    timestamp: now
                };
                db.saveHistory([...db.getHistory(), h]);

                return {
                    ...a,
                    status: AssetStatus.PENDING_AUDIT,
                    assignedTo: undefined,
                    isSpareAssignment: undefined,
                    spareReturnDate: undefined
                };
            }
            return a;
        });
        db.saveAssets(updatedAssets);
    }

    // 3. Automatically switch the User's mode to PERSONAL
    const allUsers = db.getUsers();
    const updatedUsers = allUsers.map(u => u.id === entry.userId ? {
        ...u,
        assetUsage: AssetUsage.PERSONAL,
        lastUpdated: now
    } : u);
    db.saveUsers(updatedUsers);

    // 4. Audit Log
    db.addAuditLog({
      action: 'BYOD_POLICY_APPROVED',
      performedBy: currentAdmin.id,
      performedByName: currentAdmin.name,
      details: `Approved BYOD for ${entry.employeeName}. Switched to PERSONAL mode. ${assetsToOffboard.length} assets moved to Audit Queue.`
    });

    setTimeout(() => {
      setIsProcessing(false);
      refreshData();
    }, 600);
  };

  const handleReject = () => {
    if (!showRejectModal || !currentAdmin) return;
    setIsProcessing(true);
    const all = db.getByodEntries();
    const updated = all.map(e => e.id === showRejectModal.id ? {
      ...e,
      status: ByodStatus.REJECTED,
      rejectionReason: rejectionReason
    } : e);
    db.saveByodEntries(updated);
    db.addAuditLog({
      action: 'BYOD_REJECTED',
      performedBy: currentAdmin.id,
      performedByName: currentAdmin.name,
      details: `Rejected BYOD switch request for ${showRejectModal.employeeName}. Reason: ${rejectionReason}`
    });
    setTimeout(() => {
      setIsProcessing(false);
      setShowRejectModal(null);
      setRejectionReason('');
      refreshData();
    }, 500);
  };

  const handleAdminRetrieve = () => {
    if (!showRetrieveModal || !currentAdmin) return;
    setIsProcessing(true);

    const all = db.getByodEntries();
    const updated = all.map(e => e.id === showRetrieveModal.id ? {
        ...e,
        status: ByodStatus.RETRIEVED_BY_ADMIN,
        retrievalReason: retrievalReason,
        retrievedAt: new Date().toISOString()
    } : e);

    db.saveByodEntries(updated);
    db.addAuditLog({
        action: 'BYOD_ADMIN_OVERRIDE',
        performedBy: currentAdmin.id,
        performedByName: currentAdmin.name,
        details: `Administrative retrieval of BYOD for ${showRetrieveModal.employeeName}. Reason: ${retrievalReason}`
    });

    setTimeout(() => {
        setIsProcessing(false);
        setShowRetrieveModal(null);
        setRetrievalReason('');
        refreshData();
    }, 500);
  };

  const handleExport = async () => {
    setIsProcessing(true);
    try {
      const { jsPDF } = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      const autoTable = autoTableModule.default;
      
      const doc = new jsPDF('l', 'mm', 'a4');
      doc.setFontSize(20);
      doc.text("BYOD Asset Register", 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()} | Filter: ${statusFilter}`, 14, 28);

      const tableData = filtered.map(e => [
        e.employeeName,
        e.department,
        e.deviceType,
        e.brand + ' ' + e.model,
        e.serialNumber,
        e.status,
        new Date(e.createdAt).toLocaleDateString()
      ]);

      autoTable(doc, {
        startY: 35,
        head: [['Employee', 'Department', 'Type', 'Model', 'Serial Identity', 'Status', 'Registered']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [118, 53, 248] },
        styles: { fontSize: 8 }
      });

      doc.save(`BYOD_Directory_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'Laptop': return <Laptop size={18}/>;
      case 'Mobile': return <Smartphone size={18}/>;
      case 'Tablet': return <Tablet size={18}/>;
      default: return <Monitor size={18}/>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">BYOD Management</h1>
          <p className="text-slate-500 font-medium">Monitoring switch requests and auditing personal endpoints.</p>
        </div>
        <button 
            onClick={handleExport}
            disabled={isProcessing || filtered.length === 0}
            className="flex items-center gap-3 bg-white border border-slate-200 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
        >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Export Registry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, serial or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none shadow-sm bg-white font-medium text-sm"
          />
        </div>
        <div className="relative">
            <ListFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none bg-white text-[11px] font-black uppercase tracking-widest appearance-none shadow-sm cursor-pointer"
            >
                <option value="ALL">All Statuses</option>
                {Object.values(ByodStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        </div>
        <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none bg-white text-[11px] font-black uppercase tracking-widest appearance-none shadow-sm cursor-pointer"
            >
                {departments.map(d => <option key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</option>)}
            </select>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900 border-b border-white/5">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee & Dept</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Device Specs</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity Key</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setShowDetailModal(entry)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm uppercase group-hover:scale-110 transition-transform">
                            {entry.employeeName.charAt(0)}
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 text-sm">{entry.employeeName}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{entry.department}</p>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="text-slate-400">{getDeviceIcon(entry.deviceType)}</div>
                        <div>
                            <p className="text-xs font-bold text-slate-700">{entry.brand} {entry.model}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-black">{entry.osVersion}</p>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-mono font-bold text-brand-primary">{entry.serialNumber}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-start gap-1">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            entry.status === ByodStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                            entry.status === ByodStatus.AWAITING_APPROVAL ? 'bg-blue-50 text-blue-600 border border-blue-100 animate-pulse' :
                            entry.status === ByodStatus.PENDING ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                          {entry.status}
                        </span>
                        {entry.status === ByodStatus.AWAITING_APPROVAL && (
                            <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter flex items-center gap-1">
                                <RefreshCw size={8} /> Switch Request
                            </span>
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                          {entry.status === ByodStatus.AWAITING_APPROVAL && (
                              <>
                                  <button 
                                    onClick={() => handleApprove(entry)}
                                    className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm border border-emerald-100" 
                                    title="Approve Policy Switch"
                                  >
                                      <Check size={18} />
                                  </button>
                                  <button 
                                    onClick={() => setShowRejectModal(entry)}
                                    className="p-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm border border-red-100" 
                                    title="Reject Switch"
                                  >
                                      <Ban size={18} />
                                  </button>
                              </>
                          )}
                          <button 
                            onClick={() => setShowDetailModal(entry)}
                            className="p-2.5 text-slate-400 hover:text-brand-primary hover:bg-indigo-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100" 
                            title="View Details"
                          >
                              <ChevronRight size={18} />
                          </button>
                      </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-24 text-center bg-slate-50/50">
              <Archive size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">Zero transition requests at this time.</p>
            </div>
          )}
        </div>
      </div>

      {/* Detailed View Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowDetailModal(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 border border-white/20 animate-in zoom-in overflow-y-auto max-h-[90vh] no-scrollbar">
            <div className="flex justify-between items-start mb-10">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center shadow-inner">
                        {getDeviceIcon(showDetailModal.deviceType)}
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{showDetailModal.brand} {showDetailModal.model}</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Registration Parameters</p>
                    </div>
                </div>
                <button onClick={() => setShowDetailModal(null)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24} /></button>
            </div>

            <div className="space-y-10">
                <section>
                    <h3 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <UserIcon size={14}/> Employee & Mode
                    </h3>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</p>
                            <p className="font-black text-slate-900 text-sm uppercase">{showDetailModal.employeeName}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Official ID</p>
                            <p className="font-mono text-xs font-bold text-slate-900">{showDetailModal.employeeId || 'N/A'}</p>
                        </div>
                        <div className="col-span-2 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                            <RefreshCw size={18} className="text-amber-600" />
                            <p className="text-[11px] font-bold text-amber-700 leading-tight">Transitioning from TMA Assets. Assigned hardware will move to Audit Queue.</p>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Laptop size={14}/> Technical Inventory Identity
                    </h3>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Serial Number (S/N)</p>
                            <p className="font-mono text-xs font-bold text-brand-primary bg-indigo-50 p-2 rounded-lg border border-indigo-100 inline-block">{showDetailModal.serialNumber}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">OS Distribution</p>
                            <p className="font-bold text-slate-900 text-sm">{showDetailModal.osVersion}</p>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Clock size={14}/> Audit Trail
                    </h3>
                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Submission Date</p>
                            <p className="text-xs font-bold text-slate-700">{new Date(showDetailModal.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Mode</p>
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase text-amber-600 bg-amber-50">PERSONAL (BYOD)</span>
                        </div>
                    </div>
                </section>
                
                {showDetailModal.status === ByodStatus.AWAITING_APPROVAL && (
                    <div className="flex gap-4 pt-6">
                        <button onClick={() => { setShowRejectModal(showDetailModal); setShowDetailModal(null); }} className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-xs tracking-widest border border-red-100 flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all">
                            <Ban size={16} /> Reject Request
                        </button>
                        <button onClick={() => { handleApprove(showDetailModal); setShowDetailModal(null); }} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-200 flex items-center justify-center gap-2 hover:brightness-110 transition-all">
                            <Check size={16} /> Approve & Switch Mode
                        </button>
                    </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isProcessing && setShowRejectModal(null)} />
              <div className="relative bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in">
                  <div className="flex items-center gap-3 mb-8">
                    <Ban className="text-red-600" size={28} />
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Reject BYOD Request</h2>
                  </div>
                  <div className="space-y-6">
                      <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Official Reason for Rejection</label>
                          <textarea 
                            rows={4}
                            required
                            value={rejectionReason} 
                            onChange={e => setRejectionReason(e.target.value)}
                            className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none font-bold text-sm bg-white shadow-inner"
                            placeholder="Feedback for the employee..."
                          />
                      </div>
                      <div className="flex gap-4 pt-4">
                          <button type="button" onClick={() => setShowRejectModal(null)} className="flex-1 py-4 border-2 border-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest">Discard</button>
                          <button 
                            onClick={handleReject}
                            disabled={isProcessing || !rejectionReason}
                            className="flex-[2] py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-400/30 flex items-center justify-center gap-2"
                          >
                              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Rejection'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Admin Retrieval Modal */}
      {showRetrieveModal && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isProcessing && setShowRetrieveModal(null)} />
              <div className="relative bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                        <ShieldAlert size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Admin Decommission</h2>
                  </div>
                  <div className="space-y-6">
                      <div className="p-5 bg-red-50 border border-red-100 rounded-2xl">
                          <p className="text-xs text-red-600 font-bold leading-relaxed uppercase tracking-tight">Administrative override for {showRetrieveModal.employeeName}. This will revoke hardware authorization immediately.</p>
                      </div>
                      <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Official Reason for Override</label>
                          <textarea 
                            rows={3}
                            required
                            value={retrievalReason} 
                            onChange={e => setRetrievalReason(e.target.value)}
                            className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none font-bold text-sm bg-white"
                            placeholder="Provide audit context..."
                          />
                      </div>
                      <div className="flex gap-4 pt-4">
                          <button type="button" onClick={() => setShowRetrieveModal(null)} className="flex-1 py-4 border-2 border-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest">Discard</button>
                          <button 
                            onClick={handleAdminRetrieve}
                            disabled={isProcessing || !retrievalReason}
                            className="flex-[2] py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-400/30 flex items-center justify-center gap-2"
                          >
                              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Override'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ByodManagement;
