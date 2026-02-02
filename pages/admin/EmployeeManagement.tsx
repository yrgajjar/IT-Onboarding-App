
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../db/mockDb';
import { User, UserRole, AssetHistory, AssetUsage, AdminRole, ByodStatus } from '../../types';
// Fixed: Added ArrowRight to the imports list
import { Plus, Search, ShieldAlert, CheckCircle, XCircle, Key, Edit, X, Loader2, Mail, CheckCircle2, Users, Trash2, User as UserIcon, Calendar, Info, Phone, BadgeInfo, Download, Filter, Building2, MapPin, Laptop, Smartphone, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const EmployeeManagement: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'DELETED'>('ACTIVE');
  const [employees, setEmployees] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<User | null>(null);
  const [showResetModal, setShowResetModal] = useState<User | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<User | null>(null);
  const [confirmUsageModal, setConfirmUsageModal] = useState<{ user: User, nextMode: AssetUsage } | null>(null);
  
  // Form States
  const [newEmployee, setNewEmployee] = useState({ 
    name: '', email: '', mobile: '', employeeId: '', password: '', 
    location: '', department: '', assetUsage: AssetUsage.COMPANY
  });
  const [deleteData, setDeleteData] = useState({ reason: 'Left The Organization', otherRemark: '' });
  const [resetPasswordData, setResetPasswordData] = useState({ password: '', forceChange: true });
  const [isProcessing, setIsProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [errorToast, setErrorToast] = useState('');

  const canToggle = currentAdmin?.adminRole === AdminRole.SUPER_ADMIN || currentAdmin?.adminRole === AdminRole.ASSETS_MANAGER;

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setEmployees(db.getUsers().filter(u => u.role === UserRole.EMPLOYEE).sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
  };

  const locations = useMemo(() => ['ALL', ...new Set(employees.map(e => e.location).filter(Boolean))], [employees]);
  const departments = useMemo(() => ['ALL', ...new Set(employees.map(e => e.department).filter(Boolean))], [employees]);

  const handleToggleActive = (id: string) => {
    const allUsers = db.getUsers();
    const target = allUsers.find(u => u.id === id);
    if (!target) return;

    if (target.isActive) {
      const assignedAssets = db.getAssets().filter(a => a.assignedTo === id);
      if (assignedAssets.length > 0) {
        setErrorToast(`Please remove or return assigned assets before deactivating ${target.name}.`);
        setTimeout(() => setErrorToast(''), 5000);
        return;
      }
    }

    const updated = allUsers.map(u => u.id === id ? { ...u, isActive: !u.isActive, lastUpdated: new Date().toISOString() } : u);
    db.saveUsers(updated);
    refreshData();
  };

  const handleQuickToggleUsage = (user: User, nextMode: AssetUsage) => {
    if (user.assetUsage === nextMode) return;
    
    // Safety Check: If switching TO Personal, ensure they don't have a non-spare laptop
    if (nextMode === AssetUsage.PERSONAL) {
        const heldAssets = db.getAssets().filter(a => a.assignedTo === user.id);
        const heldLaptops = heldAssets.filter(a => a.inventoryCategory === 'ASSET' && !a.isSpareAssignment);
        if (heldLaptops.length > 0) {
            setErrorToast(`Action Denied: ${user.name} holds ${heldLaptops.length} company-provided primary laptop(s). Return them before switching to BYOD mode.`);
            setTimeout(() => setErrorToast(''), 6000);
            return;
        }
    }

    setConfirmUsageModal({ user, nextMode });
  };

  const confirmUsageChange = () => {
    if (!confirmUsageModal || !currentAdmin) return;
    const { user, nextMode } = confirmUsageModal;
    
    setIsProcessing(true);
    const allUsers = db.getUsers();
    const now = new Date().toISOString();
    
    const updatedUsers = allUsers.map(u => u.id === user.id ? { 
        ...u, 
        assetUsage: nextMode, 
        lastUpdated: now 
    } : u);
    
    // Also handle BYOD records if switching to COMPANY
    if (nextMode === AssetUsage.COMPANY) {
        const allByod = db.getByodEntries();
        const updatedByod = allByod.map(b => b.userId === user.id && b.status === ByodStatus.ACTIVE ? {
            ...b,
            status: ByodStatus.INACTIVE_SWITCHED_TO_COMPANY,
            retrievalReason: 'Admin switched mode to Company Assets',
            retrievedAt: now
        } : b);
        db.saveByodEntries(updatedByod);
    }

    db.saveUsers(updatedUsers);
    db.addAuditLog({
        action: 'ASSET_USAGE_TOGGLE',
        performedBy: currentAdmin.id,
        performedByName: currentAdmin.name,
        details: `Quick-toggled asset usage for ${user.name}: ${user.assetUsage} → ${nextMode}`
    });

    setTimeout(() => {
        setIsProcessing(false);
        setConfirmUsageModal(null);
        setSuccessToast(`Mode updated for ${user.name}`);
        setTimeout(() => setSuccessToast(''), 3000);
        refreshData();
    }, 400);
  };

  const confirmSoftDelete = () => {
    if (!showDeleteModal) return;
    const targetId = showDeleteModal.id;
    const finalReason = deleteData.reason === 'Other' ? `Other: ${deleteData.otherRemark}` : deleteData.reason;

    setIsProcessing(true);
    const allUsers = db.getUsers();
    const assets = db.getAssets();
    const now = new Date().toISOString();

    const updatedUsers = allUsers.map(u => u.id === targetId ? { 
      ...u, 
      isActive: false, 
      isDeleted: true, 
      deleteReason: finalReason, 
      deletedAt: now,
      lastUpdated: now 
    } : u);

    const updatedAssets = assets.map(a => {
      if (a.assignedTo === targetId) {
        const h: AssetHistory = {
          id: `h-del-${Date.now()}-${a.id}`,
          assetId: a.id,
          userId: targetId,
          type: 'RETURN',
          note: `System Auto-Return: Employee soft-deleted (${finalReason})`,
          timestamp: now
        };
        db.saveHistory([...db.getHistory(), h]);
        return { ...a, assignedTo: undefined, status: db.getSettings().defaultAssetStatus };
      }
      return a;
    });

    db.saveUsers(updatedUsers);
    db.saveAssets(updatedAssets);
    
    db.addAuditLog({
      action: 'EMPLOYEE_SOFT_DELETE',
      performedBy: currentAdmin?.id || 'sys',
      performedByName: currentAdmin?.name || 'Admin',
      details: `Soft-deleted employee ${showDeleteModal.name}. Reason: ${finalReason}`
    });

    setIsProcessing(false);
    setShowDeleteModal(null);
    setDeleteData({ reason: 'Left The Organization', otherRemark: '' });
    setSuccessToast('Employee soft-deleted successfully.');
    setTimeout(() => setSuccessToast(''), 3000);
    refreshData();
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const allUsers = db.getUsers();
    const newUser: User = {
      id: `emp-${Date.now()}`,
      ...newEmployee,
      role: UserRole.EMPLOYEE,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    db.saveUsers([...allUsers, newUser]);
    setShowAddModal(false);
    setNewEmployee({ name: '', email: '', mobile: '', employeeId: '', password: '', location: '', department: '', assetUsage: AssetUsage.COMPANY });
    setSuccessToast('Employee authorized successfully!');
    setTimeout(() => setSuccessToast(''), 3000);
    refreshData();
  };

  const handleEditEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;

    // BUSINESS LOGIC: Usage Change Validation
    if (showEditModal.assetUsage === AssetUsage.PERSONAL) {
        // If changing to Personal, check if they have a non-spare laptop
        const heldAssets = db.getAssets().filter(a => a.assignedTo === showEditModal.id);
        const heldLaptops = heldAssets.filter(a => a.inventoryCategory === 'ASSET' && !a.isSpareAssignment);
        
        if (heldLaptops.length > 0) {
            setErrorToast(`Action Denied: Employee holds ${heldLaptops.length} company-provided laptop(s). Return them before switching to Personal mode.`);
            setTimeout(() => setErrorToast(''), 6000);
            return;
        }
    }

    const allUsers = db.getUsers();
    const updated = allUsers.map(u => u.id === showEditModal.id ? { 
      ...u, 
      name: showEditModal.name, 
      email: showEditModal.email,
      mobile: showEditModal.mobile,
      employeeId: showEditModal.employeeId,
      location: showEditModal.location,
      department: showEditModal.department,
      assetUsage: showEditModal.assetUsage,
      isActive: showEditModal.isActive,
      password: showEditModal.password || u.password,
      lastUpdated: new Date().toISOString() 
    } : u);
    
    db.saveUsers(updated);
    setShowEditModal(null);
    setSuccessToast('Profile updated successfully!');
    setTimeout(() => setSuccessToast(''), 3000);
    refreshData();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetModal) return;
    setIsProcessing(true);
    const allUsers = db.getUsers();
    const updated = allUsers.map(u => u.id === showResetModal.id ? { 
      ...u, 
      password: resetPasswordData.password, 
      forcePasswordChange: resetPasswordData.forceChange,
      lastUpdated: new Date().toISOString() 
    } : u);
    db.saveUsers(updated);
    setIsProcessing(false);
    setShowResetModal(null);
    setSuccessToast('Security reset successful!');
    setTimeout(() => setSuccessToast(''), 3000);
    refreshData();
  };

  const filteredEmployees = employees.filter(e => {
    const isDeletedTab = activeTab === 'DELETED';
    const matchesTab = isDeletedTab ? e.isDeleted : !e.isDeleted;
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLoc = locationFilter === 'ALL' || e.location === locationFilter;
    const matchesDept = deptFilter === 'ALL' || e.department === deptFilter;
    return matchesTab && matchesSearch && matchesLoc && matchesDept;
  });

  const handleExport = async () => {
    if (filteredEmployees.length === 0) {
      alert("No data to export.");
      return;
    }
    setIsProcessing(true);
    try {
      const { jsPDF } = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      const autoTable = autoTableModule.default;
      
      const doc = new jsPDF('l', 'mm', 'a4');
      doc.setFontSize(18);
      doc.setTextColor(32, 33, 36);
      doc.text("Workforce Directory", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated By: ${currentAdmin?.name} | Date: ${new Date().toLocaleString()}`, 14, 28);
      
      const tableData = filteredEmployees.map(e => [
        e.name,
        e.employeeId || 'N/A',
        e.email,
        e.department || 'N/A',
        e.location || 'N/A',
        e.assetUsage || 'TMA Assets',
        e.isActive ? 'Active' : 'Inactive',
        e.createdAt ? new Date(e.createdAt).toLocaleDateString() : 'N/A'
      ]);

      autoTable(doc, {
        startY: 35,
        head: [['Full Name', 'Emp ID', 'Corporate Email', 'Department', 'Location', 'Usage Mode', 'Status', 'Joined']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [118, 53, 248], textColor: [255, 255, 255] },
        styles: { fontSize: 8, cellPadding: 3 }
      });
      
      doc.save(`Workforce_Directory_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {successToast && (
        <div className="fixed bottom-8 right-8 z-[200] bg-brand-primary text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 size={24} />
          <p className="font-black uppercase text-xs tracking-widest">{successToast}</p>
        </div>
      )}

      {errorToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <ShieldAlert size={24} />
          <p className="font-bold text-sm">{errorToast}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Employee Directory</h1>
          <p className="text-slate-500 font-medium">Manage workforce credentials and access levels.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Export
          </button>
          <button 
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'ACTIVE' ? 'bg-brand-primary text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
          >
            Active
          </button>
          <button 
            onClick={() => setActiveTab('DELETED')}
            className={`px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'DELETED' ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
          >
            Archived
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-brand-primary/20 active:scale-95 ml-2"
          >
            <Plus size={20} /> Authorize User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-primary" size={20} />
          <input 
            type="text" 
            placeholder="Search by name, ID, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-4 rounded-3xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none shadow-sm bg-white font-medium"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select 
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-4 rounded-3xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none bg-white text-[11px] font-black uppercase tracking-widest shadow-sm cursor-pointer appearance-none"
          >
            {locations.map(loc => <option key={loc} value={loc}>{loc === 'ALL' ? 'All Locations' : loc}</option>)}
          </select>
        </div>
        <div className="relative">
          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select 
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-4 rounded-3xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none bg-white text-[11px] font-black uppercase tracking-widest shadow-sm cursor-pointer appearance-none"
          >
            {departments.map(dept => <option key={dept} value={dept}>{dept === 'ALL' ? 'All Departments' : dept}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className={`${activeTab === 'ACTIVE' ? 'bg-brand-secondary' : 'bg-slate-700'} border-b border-white/20`}>
              <tr>
                <th className="px-6 py-5 text-[10px] font-black text-white uppercase tracking-widest">Profile & Identity</th>
                <th className="px-6 py-5 text-[10px] font-black text-white uppercase tracking-widest">Usage Mode Toggle</th>
                <th className="px-6 py-5 text-[10px] font-black text-white uppercase tracking-widest">Org Details</th>
                <th className="px-6 py-5 text-[10px] font-black text-white uppercase tracking-widest">Contact Info</th>
                <th className="px-6 py-5 text-[10px] font-black text-white uppercase tracking-widest">State</th>
                <th className="px-6 py-5 text-[10px] font-black text-white uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl ${activeTab === 'ACTIVE' ? 'bg-brand-primary/10 text-brand-primary' : 'bg-slate-100 text-slate-400'} flex items-center justify-center font-black text-lg shadow-inner overflow-hidden shrink-0`}>
                        {emp.profilePicture ? <img src={emp.profilePicture} alt={emp.name} className="w-full h-full object-cover" /> : emp.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 leading-tight">{emp.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{emp.employeeId || 'NO-ID'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {activeTab === 'ACTIVE' ? (
                        <div className="flex items-center bg-slate-100 p-1 rounded-2xl w-fit shadow-inner">
                            <button 
                                onClick={() => handleQuickToggleUsage(emp, AssetUsage.COMPANY)}
                                disabled={!canToggle}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all ${emp.assetUsage === AssetUsage.COMPANY ? 'bg-brand-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Building2 size={12}/> TMA
                            </button>
                            <button 
                                onClick={() => handleQuickToggleUsage(emp, AssetUsage.PERSONAL)}
                                disabled={!canToggle}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all ${emp.assetUsage === AssetUsage.PERSONAL ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Laptop size={12}/> BYOD
                            </button>
                        </div>
                    ) : (
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${emp.assetUsage === AssetUsage.PERSONAL ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>
                            {emp.assetUsage}
                        </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5"><Building2 size={10} className="text-slate-300" /> {emp.department || 'N/A'}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={10} className="text-slate-300" /> {emp.location || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-600 flex items-center gap-2"><Mail size={12} className="text-slate-300" /> {emp.email}</p>
                      <p className="text-xs font-medium text-slate-600 flex items-center gap-2"><Phone size={12} className="text-slate-300" /> {emp.mobile || 'No Mobile'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {activeTab === 'ACTIVE' ? (
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${emp.isActive ? 'bg-brand-primary/10 text-brand-primary' : 'bg-red-50 text-red-500'}`}>
                        {emp.isActive ? 'Active' : 'Locked'}
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Reason: {emp.deleteReason}</p>
                        <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase tracking-widest">
                          <Calendar size={10} /> {emp.deletedAt ? new Date(emp.deletedAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {activeTab === 'ACTIVE' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setShowEditModal(emp)} className="p-3 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all shadow-sm" title="Edit Profile"><Edit size={18} /></button>
                        <button onClick={() => setShowResetModal(emp)} className="p-3 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all shadow-sm" title="Security Reset"><Key size={18} /></button>
                        <button onClick={() => handleToggleActive(emp.id)} className={`p-3 rounded-xl transition-all shadow-sm ${emp.isActive ? 'text-red-500 hover:bg-red-500 hover:text-white' : 'text-emerald-500 hover:bg-emerald-500 hover:text-white'}`} title={emp.isActive ? 'Lock Account' : 'Unlock Account'}>
                          {emp.isActive ? <XCircle size={18} /> : <CheckCircle size={18} />}
                        </button>
                        <button onClick={() => setShowDeleteModal(emp)} className="p-3 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm" title="Archive / Delete"><Trash2 size={18} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2 text-slate-300" title="Archived Records are read-only">
                         <Info size={18} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEmployees.length === 0 && (
            <div className="p-20 text-center space-y-4">
              <Users size={48} className="mx-auto text-slate-200" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No personnel records in this view.</p>
            </div>
          )}
        </div>
      </div>

      {/* Usage Change Confirmation Modal */}
      {confirmUsageModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => !isProcessing && setConfirmUsageModal(null)} />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 border border-white/20 animate-in zoom-in">
            <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center shadow-inner">
                    <AlertTriangle size={40} />
                </div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-4 uppercase tracking-tighter text-center">Update Asset Policy?</h2>
            <div className="space-y-6">
                <p className="text-sm text-slate-600 font-medium text-center leading-relaxed">
                    You are changing <span className="font-black text-slate-900">{confirmUsageModal.user.name}'s</span> usage mode to <span className={`font-black uppercase tracking-tight ${confirmUsageModal.nextMode === AssetUsage.PERSONAL ? 'text-amber-600' : 'text-brand-primary'}`}>{confirmUsageModal.nextMode}</span>. 
                </p>
                
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <ul className="text-[10px] font-bold text-slate-500 uppercase tracking-widest space-y-2">
                        <li className="flex items-start gap-2"><ArrowRight size={10} className="mt-0.5 shrink-0" /> Instant profile sync</li>
                        <li className="flex items-start gap-2"><ArrowRight size={10} className="mt-0.5 shrink-0" /> Inventory rules updated</li>
                        {confirmUsageModal.nextMode === AssetUsage.PERSONAL ? (
                            <li className="flex items-start gap-2 text-amber-700 font-black"><CheckCircle2 size={10} className="mt-0.5 shrink-0" /> BYOD Module will activate</li>
                        ) : (
                            <li className="flex items-start gap-2 text-indigo-700 font-black"><CheckCircle2 size={10} className="mt-0.5 shrink-0" /> Full hardware allocation enabled</li>
                        )}
                    </ul>
                </div>

                <div className="flex gap-4 pt-2">
                    <button disabled={isProcessing} onClick={() => setConfirmUsageModal(null)} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-400">Cancel</button>
                    <button disabled={isProcessing} onClick={confirmUsageChange} className={`flex-[2] py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${confirmUsageModal.nextMode === AssetUsage.PERSONAL ? 'bg-amber-500 text-white shadow-amber-200' : 'bg-brand-primary text-white shadow-indigo-200'}`}>
                        {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Change'}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 border border-white/20 animate-in zoom-in overflow-y-auto max-h-[95vh]">
            <h2 className="text-2xl font-black text-brand-primary mb-8 uppercase tracking-tighter">Authorize Workforce</h2>
            <form onSubmit={handleAddEmployee} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Full Legal Name</label>
                  <input required value={newEmployee.name} onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none text-slate-900 font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Employee ID</label>
                  <input required value={newEmployee.employeeId} onChange={e => setNewEmployee({ ...newEmployee, employeeId: e.target.value.toUpperCase() })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none font-black text-slate-900" placeholder="EMP-XXX" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Mobile Number</label>
                  <input required type="tel" value={newEmployee.mobile} onChange={e => setNewEmployee({ ...newEmployee, mobile: e.target.value })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none text-slate-900 font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Work Location</label>
                  <input required value={newEmployee.location} onChange={e => setNewEmployee({ ...newEmployee, location: e.target.value })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none text-slate-900 font-bold" placeholder="e.g. Bangalore" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Department</label>
                  <input required value={newEmployee.department} onChange={e => setNewEmployee({ ...newEmployee, department: e.target.value })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none text-slate-900 font-bold" placeholder="e.g. Engineering" />
                </div>
                
                <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Inventory Utilization Mode</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            type="button" 
                            onClick={() => setNewEmployee({...newEmployee, assetUsage: AssetUsage.COMPANY})}
                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${newEmployee.assetUsage === AssetUsage.COMPANY ? 'border-brand-primary bg-brand-primary/5 text-brand-primary shadow-inner' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}
                        >
                            <Building2 size={20} />
                            <div className="text-left">
                                <p className="text-xs font-black uppercase">TMA Assets</p>
                                <p className="text-[9px] font-bold opacity-60">Company Provided</p>
                            </div>
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setNewEmployee({...newEmployee, assetUsage: AssetUsage.PERSONAL})}
                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${newEmployee.assetUsage === AssetUsage.PERSONAL ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-inner' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}
                        >
                            <Laptop size={20} />
                            <div className="text-left">
                                <p className="text-xs font-black uppercase">Personal</p>
                                <p className="text-[9px] font-bold opacity-60">Bring Your Own</p>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Corporate Email</label>
                  <input required type="email" value={newEmployee.email} onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none text-slate-900 font-medium" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">System Password</label>
                  <input required value={newEmployee.password} onChange={e => setNewEmployee({ ...newEmployee, password: e.target.value })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none font-mono text-slate-900" />
                </div>
              </div>
              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-400">Discard</button>
                <button type="submit" className="flex-[2] py-4 bg-brand-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-primary/30 active:scale-95 transition-all">Provision User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-primary/40 backdrop-blur-md" onClick={() => setShowEditModal(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 border border-white/20 animate-in zoom-in overflow-y-auto max-h-[95vh]">
            <h2 className="text-2xl font-black text-brand-primary mb-8 uppercase tracking-tighter">Modify Credentials</h2>
            <form onSubmit={handleEditEmployee} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Full Legal Name</label>
                  <input required value={showEditModal.name} onChange={e => setShowEditModal({ ...showEditModal, name: e.target.value })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none text-slate-900 font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Employee ID</label>
                  <input required value={showEditModal.employeeId || ''} onChange={e => setShowEditModal({ ...showEditModal, employeeId: e.target.value.toUpperCase() })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none font-black text-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Mobile Number</label>
                  <input type="tel" value={showEditModal.mobile || ''} onChange={e => setShowEditModal({ ...showEditModal, mobile: e.target.value })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none text-slate-900 font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Work Location</label>
                  <input required value={showEditModal.location || ''} onChange={e => setShowEditModal({ ...showEditModal, location: e.target.value })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none text-slate-900 font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Department</label>
                  <input required value={showEditModal.department || ''} onChange={e => setShowEditModal({ ...showEditModal, department: e.target.value })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none text-slate-900 font-bold" />
                </div>

                <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Inventory Utilization Mode</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            type="button" 
                            onClick={() => setShowEditModal({...showEditModal, assetUsage: AssetUsage.COMPANY})}
                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${showEditModal.assetUsage === AssetUsage.COMPANY ? 'border-brand-primary bg-brand-primary/5 text-brand-primary shadow-inner' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}
                        >
                            <Building2 size={20} />
                            <div className="text-left">
                                <p className="text-xs font-black uppercase">TMA Assets</p>
                                <p className="text-[9px] font-bold opacity-60">Company Provided</p>
                            </div>
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setShowEditModal({...showEditModal, assetUsage: AssetUsage.PERSONAL})}
                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${showEditModal.assetUsage === AssetUsage.PERSONAL ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-inner' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}
                        >
                            <Laptop size={20} />
                            <div className="text-left">
                                <p className="text-xs font-black uppercase">Personal</p>
                                <p className="text-[9px] font-bold opacity-60">Bring Your Own</p>
                            </div>
                        </button>
                    </div>
                    {showEditModal.assetUsage === AssetUsage.PERSONAL && (
                        <p className="mt-3 p-3 bg-amber-50 rounded-xl text-[10px] font-bold text-amber-700 uppercase border border-amber-100">
                           <ShieldAlert size={12} className="inline mr-1 mb-0.5" /> Hardware restrictions apply for this mode.
                        </p>
                    )}
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Corporate Email</label>
                  <input required type="email" value={showEditModal.email} onChange={e => setShowEditModal({ ...showEditModal, email: e.target.value })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none text-slate-900 font-medium" />
                </div>
              </div>
              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowEditModal(null)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-400">Discard</button>
                <button type="submit" className="flex-[2] py-4 bg-brand-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-primary/30 active:scale-95 transition-all">Update Workforce</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowDeleteModal(null)} />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 border border-white/20 animate-in zoom-in">
            <h2 className="text-2xl font-black text-red-600 mb-6 uppercase tracking-tighter">Confirm Termination</h2>
            <div className="space-y-6">
              <div className="p-5 bg-red-50 rounded-2xl border border-red-100">
                <p className="text-[11px] font-black text-red-700 leading-tight uppercase tracking-tight">
                  You are archiving <span className="underline">{showDeleteModal.name}</span>.
                </p>
                <p className="text-[10px] text-red-600 mt-2 font-medium">All assigned assets will be auto-returned to stock and access will be terminated immediately.</p>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Reason for Deletion</label>
                <select value={deleteData.reason} onChange={(e) => setDeleteData({ ...deleteData, reason: e.target.value })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold text-sm bg-white text-slate-900">
                  <option value="Left The Organization">Left The Organization</option>
                  <option value="Using Own Laptop">Using Own Laptop</option>
                  <option value="Policy Violation">Policy Violation</option>
                  <option value="Role Redundancy">Role Redundancy</option>
                  <option value="Other">Other (Remark Below)</option>
                </select>
              </div>
              {deleteData.reason === 'Other' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Optional Remark</label>
                  <textarea value={deleteData.otherRemark} onChange={(e) => setDeleteData({ ...deleteData, otherRemark: e.target.value })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all font-medium text-sm text-slate-900" placeholder="Provide additional context for audit..." />
                </div>
              )}
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowDeleteModal(null)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-400">Abort</button>
                <button onClick={confirmSoftDelete} disabled={isProcessing} className="flex-[2] py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-400/30 active:scale-95 transition-all flex items-center justify-center gap-2">
                  {isProcessing && <Loader2 size={16} className="animate-spin" />}
                  Archive User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-primary/40 backdrop-blur-md" onClick={() => setShowResetModal(null)} />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 border border-white/20 animate-in zoom-in">
            <h2 className="text-2xl font-black text-brand-primary mb-6 uppercase tracking-tighter">Security Reset</h2>
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="p-5 bg-brand-secondary/5 rounded-2xl border border-brand-secondary/20">
                <p className="text-[11px] font-bold text-slate-600 leading-tight uppercase tracking-widest">
                  Overriding credentials for <span className="text-brand-primary font-black">{showResetModal.name}</span>.
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">New Secure String</label>
                <input required value={resetPasswordData.password} onChange={e => setResetPasswordData({ ...resetPasswordData, password: e.target.value })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none font-mono text-slate-900" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowResetModal(null)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-400">Cancel</button>
                <button type="submit" className="flex-[2] py-4 bg-brand-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-primary/30 active:scale-95 transition-all">Apply Reset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
