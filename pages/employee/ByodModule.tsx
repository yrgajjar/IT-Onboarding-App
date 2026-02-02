
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../db/mockDb';
import { useAuth } from '../../context/AuthContext';
import { ByodEntry, ByodStatus, EmployeeType, UserRole, AssetUsage } from '../../types';
import { Laptop, CheckCircle2, Download, Info, X, ShieldCheck, AlertCircle, Phone, Smartphone, Monitor, ChevronRight, Loader2, Archive, ArrowRight, User as UserIcon, Lock, Clock, RefreshCw } from 'lucide-react';

const ByodModule: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ByodEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showRetrievedModal, setShowRetrievedModal] = useState<ByodEntry | null>(null);
  const [retrievalReason, setRetrievalReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState<Partial<ByodEntry>>({
    employeeType: EmployeeType.PERMANENT,
    deviceType: 'Laptop',
    agreementAccepted: false,
    phone: user?.mobile || '',
    brand: '',
    model: '',
    serialNumber: '',
    osVersion: '',
    imeiMac: ''
  });

  useEffect(() => {
    if (user) {
        setEntries(db.getByodEntries().filter(e => e.userId === user.id));
    }
  }, [user]);

  const activeEntry = useMemo(() => entries.find(e => e.status === ByodStatus.ACTIVE), [entries]);
  const pendingApprovalEntry = useMemo(() => entries.find(e => e.status === ByodStatus.AWAITING_APPROVAL), [entries]);

  const generateAgreementPDF = async (entry: ByodEntry) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(32, 33, 36);
    doc.text("BYOD AUTHORIZATION AGREEMENT", 20, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Reference ID: ${entry.id}`, 20, 40);
    doc.text(`Date of Submission: ${new Date(entry.createdAt).toLocaleString()}`, 20, 45);

    doc.setFontSize(14);
    doc.setTextColor(32, 33, 36);
    doc.text("1. Employee & Device Identity", 20, 60);
    
    doc.setFontSize(10);
    doc.text(`Name: ${entry.employeeName}`, 25, 70);
    doc.text(`Email: ${entry.email}`, 25, 75);
    doc.text(`Emp Type: ${entry.employeeType}`, 25, 80);
    doc.text(`Device: ${entry.deviceType} (${entry.brand} ${entry.model})`, 25, 85);
    doc.text(`S/N: ${entry.serialNumber}`, 25, 90);
    doc.text(`Identity Key (IMEI/MAC): ${entry.imeiMac}`, 25, 95);

    doc.setFontSize(14);
    doc.text("2. Terms and Conditions", 20, 110);
    doc.setFontSize(9);
    const terms = [
      "The employee agrees to use their personal device for official business purposes.",
      "The company reserves the right to audit device security compliance periodically.",
      "Employee is responsible for data backup and physical security of the device.",
      "All company data must be encrypted and password-protected on this device.",
      "Upon retrieval or termination, all company data must be purged from the device."
    ];
    terms.forEach((term, i) => {
      doc.text(`• ${term}`, 25, 120 + (i * 7));
    });

    doc.setFontSize(12);
    doc.setTextColor(118, 53, 248);
    doc.text("E-SIGNATURE CONFIRMED VIA PORTAL AUTHORIZATION", 20, 170);
    doc.setTextColor(32, 33, 36);
    doc.setFontSize(10);
    doc.text(`Status: ${entry.status}`, 20, 180);
    
    doc.save(`BYOD_Agreement_${entry.employeeName.replace(/\s+/g, '_')}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.agreementAccepted) {
        alert("You must accept the BYOD agreement.");
        return;
    }

    setIsSubmitting(true);
    const newEntry: ByodEntry = {
        id: `byod-${Date.now()}`,
        userId: user.id,
        employeeName: user.name,
        department: user.department || 'N/A',
        email: user.email,
        status: ByodStatus.AWAITING_APPROVAL,
        createdAt: new Date().toISOString(),
        ...(formData as ByodEntry)
    };

    const all = db.getByodEntries();
    db.saveByodEntries([newEntry, ...all]);
    
    db.addAuditLog({
        action: 'BYOD_REQUEST_SUBMITTED',
        performedBy: user.id,
        performedByName: user.name,
        details: `Submitted BYOD switch request for ${newEntry.brand} ${newEntry.model}.`
    });

    setTimeout(() => {
        setIsSubmitting(false);
        setShowForm(false);
        setEntries([newEntry, ...entries]);
        setSuccessMsg('Transition Request Sent to IT.');
        setTimeout(() => setSuccessMsg(''), 5000);
    }, 800);
  };

  const handleRetrieve = () => {
    if (!showRetrievedModal || !user) return;
    setIsSubmitting(true);

    const all = db.getByodEntries();
    const updated = all.map(e => e.id === showRetrievedModal.id ? {
        ...e,
        status: ByodStatus.RETRIEVED_BY_EMPLOYEE,
        retrievalReason: retrievalReason,
        retrievedAt: new Date().toISOString()
    } : e);

    db.saveByodEntries(updated);
    db.addAuditLog({
        action: 'BYOD_RETRIEVAL_REQUEST',
        performedBy: user.id,
        performedByName: user.name,
        details: `Requested BYOD retrieval. Reason: ${retrievalReason}`
    });

    setTimeout(() => {
        setIsSubmitting(false);
        setShowRetrievedModal(null);
        setRetrievalReason('');
        setEntries(updated.filter(e => e.userId === user.id));
        setSuccessMsg('Retrieval Processed Successfully');
        setTimeout(() => setSuccessMsg(''), 3000);
    }, 800);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-10">
      {successMsg && (
        <div className="fixed bottom-8 right-8 z-[200] bg-brand-primary text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4 border border-white/20">
          <CheckCircle2 size={28} />
          <p className="font-black uppercase text-sm tracking-widest leading-none">{successMsg}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">BYOD Console</h1>
          <p className="text-slate-500 font-medium mt-1">Request technical transition from company assets to personal hardware.</p>
        </div>
        <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-200">
                <Lock size={12} /> Managed by IT Admin
            </span>
        </div>
      </div>

      {user?.assetUsage === AssetUsage.COMPANY && !pendingApprovalEntry && !showForm && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-[2.5rem] p-10 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center shadow-inner">
                <RefreshCw size={40} />
            </div>
            <div className="max-w-md">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Switch to BYOD?</h3>
                <p className="text-slate-500 font-medium text-sm">You are currently using <b>TMA Company Assets</b>. You can request a switch to using your own laptop. Once approved, you will be required to return any primary company-provided laptops.</p>
            </div>
            <button 
                onClick={() => setShowForm(true)}
                className="bg-brand-primary text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:brightness-110 transition-all shadow-xl shadow-brand-primary/20"
            >
                Start Switch Request
            </button>
          </div>
      )}

      {pendingApprovalEntry && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-[2.5rem] p-10 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center animate-pulse">
                <Clock size={40} />
            </div>
            <div className="max-w-md">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">BYOD Approval Pending</h3>
                <p className="text-slate-500 font-medium text-sm">Your request to utilize <span className="font-black">{pendingApprovalEntry.brand} {pendingApprovalEntry.model}</span> is awaiting Admin confirmation. Once approved, your account policy will automatically switch.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-indigo-100 shadow-sm text-[10px] font-black uppercase text-indigo-500 tracking-widest">
                Awaiting IT Authorization
            </div>
          </div>
      )}

      {activeEntry && user?.assetUsage === AssetUsage.PERSONAL && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-50/30">
                      <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-brand-primary/10 text-brand-primary rounded-3xl flex items-center justify-center shadow-inner">
                              {activeEntry.deviceType === 'Laptop' ? <Laptop size={28}/> : <Smartphone size={28}/>}
                          </div>
                          <div>
                              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">{activeEntry.brand} {activeEntry.model}</h2>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Active BYOD Signature</p>
                          </div>
                      </div>
                      <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">Verified Active</span>
                  </div>
                  <div className="p-10 grid grid-cols-2 md:grid-cols-3 gap-y-10 gap-x-8">
                      <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Identity Key (Serial)</p>
                          <p className="font-mono text-xs font-bold text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100">{activeEntry.serialNumber}</p>
                      </div>
                      <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">OS Version</p>
                          <p className="text-sm font-black text-slate-900 uppercase">{activeEntry.osVersion}</p>
                      </div>
                      <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Network Identity</p>
                          <p className="text-xs font-bold text-slate-700 truncate">{activeEntry.imeiMac}</p>
                      </div>
                      <div className="col-span-full pt-6 border-t border-slate-100 flex items-center gap-4">
                          <button 
                            onClick={() => generateAgreementPDF(activeEntry)}
                            className="flex-1 py-4 bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 flex items-center justify-center gap-2"
                          >
                            <Download size={16}/> Download Agreement
                          </button>
                          <button 
                            onClick={() => setShowRetrievedModal(activeEntry)}
                            className="flex-1 py-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-100 flex items-center justify-center gap-2"
                          >
                            <Archive size={16}/> Request Retrieval
                          </button>
                      </div>
                  </div>
              </div>
              <div className="bg-brand-primary rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col justify-center">
                  <div className="absolute top-0 right-0 p-12 opacity-10">
                      <ShieldCheck size={180} />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Security Compliance</p>
                    <h3 className="text-2xl font-black uppercase tracking-tighter mb-6">Device Vault</h3>
                    <p className="text-sm leading-relaxed font-medium opacity-80">This device is registered and authorized for professional connectivity. Security policies are active for corporate data protection.</p>
                  </div>
              </div>
          </div>
      )}

      {/* History Section */}
      {entries.length > (activeEntry || pendingApprovalEntry ? 1 : 0) && (
          <div className="space-y-6">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                  <Archive size={24} className="text-slate-300" /> Registry Log
              </h2>
              <div className="space-y-4">
                  {entries.filter(e => e.status !== ByodStatus.ACTIVE && e.status !== ByodStatus.AWAITING_APPROVAL).map(entry => (
                      <div key={entry.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 flex items-center justify-between opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                          <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center">
                                  {entry.deviceType === 'Laptop' ? <Laptop size={20}/> : <Smartphone size={20}/>}
                              </div>
                              <div>
                                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{entry.brand} {entry.model}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Updated: {entry.retrievedAt ? new Date(entry.retrievedAt).toLocaleDateString() : new Date(entry.createdAt).toLocaleDateString()}</p>
                              </div>
                          </div>
                          <div className="text-right">
                              <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${entry.status === ByodStatus.REJECTED ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'} border border-slate-200`}>{entry.status}</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isSubmitting && setShowForm(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 border border-white/20 animate-in zoom-in overflow-y-auto max-h-[95vh] no-scrollbar">
            <div className="flex justify-between items-start mb-10">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center shadow-inner">
                        <Monitor size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">BYOD Transition Request</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Personal Hardware Registration</p>
                    </div>
                </div>
                <button onClick={() => setShowForm(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
                <section>
                    <h3 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <UserIcon size={14}/> Identity & Profile
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Employment Context</label>
                            <select 
                                value={formData.employeeType} 
                                onChange={e => setFormData({...formData, employeeType: e.target.value as EmployeeType})}
                                className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none font-bold text-sm bg-white"
                            >
                                <option value={EmployeeType.PERMANENT}>Permanent Staff</option>
                                <option value={EmployeeType.CONTRACT}>Contract Basis</option>
                                <option value={EmployeeType.INTERN}>Internship Program</option>
                            </select>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Official ID</label>
                            <input 
                                required
                                value={formData.employeeId || user?.employeeId || ''} 
                                onChange={e => setFormData({...formData, employeeId: e.target.value})}
                                className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none font-bold text-sm"
                                placeholder="EMP-XXX"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Mobile Contact</label>
                            <input 
                                required 
                                type="tel" 
                                value={formData.phone} 
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none font-bold text-sm"
                                placeholder="+91 XXXXX XXXXX"
                            />
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Laptop size={14}/> Technical Specifications
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Device Class</label>
                            <select 
                                value={formData.deviceType} 
                                onChange={e => setFormData({...formData, deviceType: e.target.value as any})}
                                className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none font-bold text-sm bg-white"
                            >
                                <option value="Laptop">Professional Laptop</option>
                                <option value="Mobile">Smartphone / Mobile</option>
                                <option value="Tablet">Tablet / iPad</option>
                                <option value="Other">Other Endpoint</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Brand</label>
                            <input required value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none font-bold text-sm" placeholder="e.g. Apple, Dell, Lenovo" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Model Name</label>
                            <input required value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none font-bold text-sm" placeholder="e.g. MacBook Pro M3 Max" />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">S/N</label>
                            <input required value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value.toUpperCase()})} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none font-mono font-bold text-sm" />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">IMEI/MAC</label>
                            <input required value={formData.imeiMac} onChange={e => setFormData({...formData, imeiMac: e.target.value.toUpperCase()})} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none font-mono font-bold text-sm" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">OS Version</label>
                            <input required value={formData.osVersion} onChange={e => setFormData({...formData, osVersion: e.target.value})} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none font-bold text-sm" placeholder="e.g. Windows 11 / macOS 14" />
                        </div>
                    </div>
                </section>

                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-start gap-4">
                    <input 
                        id="agree" 
                        type="checkbox" 
                        className="mt-1 w-5 h-5 rounded-lg text-brand-primary focus:ring-brand-primary border-slate-300"
                        checked={formData.agreementAccepted}
                        onChange={e => setFormData({...formData, agreementAccepted: e.target.checked})}
                    />
                    <label htmlFor="agree" className="text-xs text-slate-600 font-medium leading-relaxed">
                        I agree to abide by the company’s BYOD policy. I understand that switch approval will require the return of company-provided primary laptops.
                    </label>
                </div>

                <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-5 border-2 border-slate-100 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-400 hover:bg-slate-50">Cancel</button>
                    <button 
                        type="submit" 
                        disabled={isSubmitting || !formData.agreementAccepted}
                        className="flex-[2] py-5 bg-brand-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-brand-primary/30 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Finalize Request'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ByodModule;
