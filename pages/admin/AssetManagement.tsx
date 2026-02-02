
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/mockDb';
import { Asset, AssetStatus, User, UserRole, AssetHistory, AppSettings, AssetRemovalData, InventoryCategory, AssetUsage } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, UserCheck, RefreshCw, Trash2, Laptop, Edit3, X, Eye, HardDrive, Lock, ArrowRight, MousePointer2, Briefcase, LogOut, Loader2, CheckCircle2, ShieldAlert, Calendar, Clock, Tag, Settings2 } from 'lucide-react';

const AssetManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<AssetStatus>(AssetStatus.READY_TO_USE);
  const [activeCategory, setActiveCategory] = useState<InventoryCategory | null>(null);
  
  const canWrite = user?.permissions?.assets?.write === true;
  const canUpdate = user?.permissions?.assets?.update === true;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuickView, setShowQuickView] = useState<Asset | null>(null);
  const [showEditModal, setShowEditModal] = useState<Asset | null>(null);
  const [assignModal, setAssignModal] = useState<{ open: boolean, assetId: string }>({ open: false, assetId: '' });
  const [returnModal, setReturnModal] = useState<{ open: boolean, assetId: string }>({ open: false, assetId: '' });
  const [removeModal, setRemoveModal] = useState<{ open: boolean, asset: Asset | null }>({ open: false, asset: null });
  const [statusModal, setStatusModal] = useState<{ open: boolean, asset: Asset | null }>({ open: false, asset: null });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const initialAsset: Partial<Asset> = {
    assetCode: '', assetType: 'Laptop', brand: '', model: '', serialNumber: '', status: AssetStatus.READY_TO_USE,
    inventoryCategory: activeCategory || 'ASSET',
    purchaseDate: new Date().toISOString().split('T')[0], purchaseValue: 0,
    totalServices: 0, openServices: 0, closedServices: 0
  };
  const [formData, setFormData] = useState<Partial<Asset>>(initialAsset);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isSpare, setIsSpare] = useState(false);
  const [spareReturnDate, setSpareReturnDate] = useState('');
  const [newStatus, setNewStatus] = useState<AssetStatus>(AssetStatus.SPARE);

  const [returnForm, setReturnForm] = useState({
    reason: 'Asset Replaced',
    otherRemark: '',
    status: AssetStatus.SPARE
  });

  const initialRemovalData: Partial<AssetRemovalData> = {
    auditStatus: 'Remove from Inventory',
    statusToCheck: 'Depreciated',
    adminRemovalDate: new Date().toISOString().split('T')[0],
    reason: '',
    approvedBy: '',
    conditionAtRemoval: 'Operational',
    valueAtRemoval: 0,
    proofRef: '',
    remark: ''
  };
  const [removalForm, setRemovalForm] = useState<Partial<AssetRemovalData>>(initialRemovalData);

  const refreshData = () => {
    setAssets(db.getAssets());
    setUsers(db.getUsers().filter(u => u.role === UserRole.EMPLOYEE && !u.isDeleted));
    setSettings(db.getSettings());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    const current = db.getAssets();
    let updated;
    if (showEditModal) {
      updated = current.map(a => a.id === showEditModal.id ? { ...a, ...formData } as Asset : a);
      db.addAuditLog({ action: 'ASSET_UPDATE', performedBy: user?.id || 'sys', performedByName: user?.name || 'Admin', details: `Updated asset: ${formData.assetCode}` });
    } else {
      const asset: Asset = { id: `ast-${Date.now()}`, ...(formData as any), inventoryCategory: activeCategory || formData.inventoryCategory || 'ASSET' };
      updated = [...current, asset];
      db.addAuditLog({ action: 'ASSET_CREATE', performedBy: user?.id || 'sys', performedByName: user?.name || 'Admin', details: `Registered new asset: ${asset.assetCode}` });
    }
    db.saveAssets(updated);
    setTimeout(() => {
      setIsProcessing(false);
      setShowAddModal(false);
      setShowEditModal(null);
      refreshData();
    }, 500);
  };

  const handleAssignAsset = () => {
    const targetUser = users.find(u => u.id === selectedUserId);
    const targetAsset = assets.find(a => a.id === assignModal.assetId);
    
    if (!targetUser || !targetAsset) return;

    if (targetUser.assetUsage === AssetUsage.PERSONAL && targetAsset.inventoryCategory === 'ASSET' && !isSpare) {
        alert("Action Denied: This employee is on 'Personal Laptop' mode. Standard company laptops can only be assigned as 'Spare/Temporary' units.");
        return;
    }

    setIsProcessing(true);
    const now = new Date().toISOString();
    const updated = db.getAssets().map(a => a.id === assignModal.assetId ? { 
        ...a, 
        status: AssetStatus.ASSIGNED, 
        assignedTo: selectedUserId,
        isSpareAssignment: isSpare,
        spareReturnDate: isSpare ? spareReturnDate : undefined
    } : a);

    const note = isSpare ? `Spare Laptop Assignment. Expected Return: ${spareReturnDate || 'Not Defined'}` : '';
    const newHistory: AssetHistory = { id: `hist-${Date.now()}`, assetId: assignModal.assetId, userId: selectedUserId, type: 'ASSIGNMENT', note, timestamp: now };
    
    db.saveAssets(updated);
    db.saveHistory([...db.getHistory(), newHistory]);
    
    db.addAuditLog({ 
        action: 'ASSET_ASSIGN', 
        performedBy: user?.id || 'sys', 
        performedByName: user?.name || 'Admin', 
        details: `Assigned asset ${targetAsset.assetCode} to ${targetUser.name} ${isSpare ? '(Spare Mode)' : ''}` 
    });

    setTimeout(() => {
      setIsProcessing(false);
      setAssignModal({ open: false, assetId: '' });
      setSelectedUserId('');
      setIsSpare(false);
      setSpareReturnDate('');
      refreshData();
    }, 500);
  };

  const submitReturn = () => {
    setIsProcessing(true);
    const asset = assets.find(a => a.id === returnModal.assetId);
    if (!asset) return;
    const updated = db.getAssets().map(a => a.id === returnModal.assetId ? { 
        ...a, 
        status: returnForm.status, 
        assignedTo: returnForm.status === AssetStatus.ASSIGNED ? a.assignedTo : undefined,
        isSpareAssignment: undefined,
        spareReturnDate: undefined
    } : a);

    const newHistory: AssetHistory = { id: `hist-${Date.now()}`, assetId: returnModal.assetId, userId: asset.assignedTo || '', type: 'RETURN', timestamp: new Date().toISOString() };
    db.saveAssets(updated);
    db.saveHistory([...db.getHistory(), newHistory]);
    db.addAuditLog({ action: 'ASSET_RETURN', performedBy: user?.id || 'sys', performedByName: user?.name || 'Admin', details: `Asset returned from user: ${asset.assignedTo}` });
    setTimeout(() => {
      setIsProcessing(false);
      setReturnModal({ open: false, assetId: '' });
      refreshData();
    }, 500);
  };

  const handleUpdateStatus = () => {
    if (!statusModal.asset) return;
    setIsProcessing(true);
    
    const now = new Date().toISOString();
    const updated = db.getAssets().map(a => a.id === statusModal.asset!.id ? { 
        ...a, 
        status: newStatus,
        // If moving away from Assigned, clear assignment fields
        assignedTo: newStatus === AssetStatus.ASSIGNED ? a.assignedTo : undefined,
        isSpareAssignment: newStatus === AssetStatus.ASSIGNED ? a.isSpareAssignment : undefined,
        spareReturnDate: newStatus === AssetStatus.ASSIGNED ? a.spareReturnDate : undefined
    } : a);

    const h: AssetHistory = {
        id: `hist-stat-${Date.now()}`,
        assetId: statusModal.asset!.id,
        userId: statusModal.asset!.assignedTo || user?.id || 'sys',
        type: 'RETURN',
        note: `Manual status transition: ${statusModal.asset!.status} -> ${newStatus}`,
        timestamp: now
    };

    db.saveAssets(updated);
    db.saveHistory([...db.getHistory(), h]);
    db.addAuditLog({
        action: 'ASSET_STATUS_CHANGE',
        performedBy: user?.id || 'sys',
        performedByName: user?.name || 'Admin',
        details: `Manually updated status of ${statusModal.asset!.assetCode} to ${newStatus}`
    });

    setTimeout(() => {
        setIsProcessing(false);
        setStatusModal({ open: false, asset: null });
        refreshData();
    }, 500);
  };

  const submitRemoval = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    if (!removeModal.asset) return;
    const updated = db.getAssets().map(a => a.id === removeModal.asset!.id ? { ...a, status: AssetStatus.REMOVED, assignedTo: undefined, removalData: { ...removalForm, removalTimestamp: new Date().toISOString() } } as Asset : a);
    db.saveAssets(updated);
    db.addAuditLog({ action: 'ASSET_DECOMMISSION', performedBy: user?.id || 'sys', performedByName: user?.name || 'Admin', details: `Asset decommissioned: ${removeModal.asset!.assetCode}` });
    setTimeout(() => {
      setIsProcessing(false);
      setRemoveModal({ open: false, asset: null });
      refreshData();
    }, 500);
  };

  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.assetCode.toLowerCase().includes(searchTerm.toLowerCase()) || a.brand.toLowerCase().includes(searchTerm.toLowerCase()) || a.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = a.status === activeTab;
    const matchesCategory = activeCategory ? a.inventoryCategory === activeCategory : true;
    return matchesSearch && matchesTab && matchesCategory;
  });

  const categoryCounts = useMemo(() => ({
    ASSET: assets.filter(a => a.inventoryCategory === 'ASSET' && a.status !== AssetStatus.REMOVED).length,
    MOUSE: assets.filter(a => a.inventoryCategory === 'MOUSE' && a.status !== AssetStatus.REMOVED).length,
    ACCESSORY: assets.filter(a => a.inventoryCategory === 'ACCESSORY' && a.status !== AssetStatus.REMOVED).length
  }), [assets]);

  // Status Counts for Badges (Specific to Category)
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(AssetStatus).forEach(s => {
      counts[s] = assets.filter(a => a.status === s && (activeCategory ? a.inventoryCategory === activeCategory : true)).length;
    });
    return counts;
  }, [assets, activeCategory]);

  const categoryTiles = [
    { id: 'ASSET', title: 'Hardware', icon: Laptop, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    { id: 'MOUSE', title: 'Mice', icon: MousePointer2, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { id: 'ACCESSORY', title: 'Accessories', icon: Briefcase, color: 'text-amber-600', bgColor: 'bg-amber-50' }
  ];

  if (!activeCategory) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tighter">Inventory Console</h1>
          <p className="text-slate-600 text-sm font-medium">Select a category to manage stock and technical lifecycle.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryTiles.map((tile) => (
            <button key={tile.id} onClick={() => setActiveCategory(tile.id as InventoryCategory)} className="bg-white p-6 rounded-xl border border-slate-200 hover:border-brand-primary hover:shadow-md transition-all text-left flex items-center justify-between group shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${tile.bgColor} ${tile.color} rounded-lg flex items-center justify-center shadow-inner`}>
                  <tile.icon size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 uppercase tracking-tight">{tile.title}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{categoryCounts[tile.id as keyof typeof categoryCounts]} Units Active</p>
                </div>
              </div>
              <ArrowRight size={20} className="text-slate-300 group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const currentAssetForAssign = assets.find(a => a.id === assignModal.assetId);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveCategory(null)} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-brand-primary shadow-sm"><X size={20} /></button>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{activeCategory} Console</h1>
        </div>
        {canWrite && (
          <button 
            onClick={() => { setFormData({...initialAsset, inventoryCategory: activeCategory}); setShowAddModal(true); }} 
            className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest"
          >
            <Plus size={18} /> Register Unit
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col xl:flex-row gap-4 justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Filter inventory registry..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:ring-1 focus:ring-brand-primary outline-none text-slate-900 font-medium" />
          </div>
          <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200 overflow-x-auto no-scrollbar shadow-inner">
            {Object.values(AssetStatus).filter(s => s !== AssetStatus.REMOVED).map(s => {
              const count = statusCounts[s] || 0;
              return (
                <button 
                  key={s} 
                  onClick={() => setActiveTab(s)} 
                  className={`relative px-4 py-2 rounded text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === s ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  {s}
                  {count > 0 && (
                    <span className={`flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black ${s === AssetStatus.PENDING_AUDIT ? 'bg-red-500 text-white animate-pulse' : (activeTab === s ? 'bg-white text-brand-primary' : 'bg-slate-200 text-slate-600')}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
            <tr>
              <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-wider">Asset Info</th>
              <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-wider">Book Value</th>
              <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-wider">Active Assignee</th>
              <th className="px-6 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAssets.map((asset) => (
              <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div>
                        <p className="font-bold text-slate-900 uppercase tracking-tighter">{asset.assetCode}</p>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">{asset.brand} {asset.model}</p>
                    </div>
                    {asset.isSpareAssignment && (
                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[8px] font-black uppercase border border-amber-200 shadow-inner">Spare Unit</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="font-black text-slate-800">{settings.currencySymbol}{db.calculateAssetValue(asset, settings).toLocaleString()}</p>
                </td>
                <td className="px-6 py-4">
                  {asset.assignedTo ? <span className="text-xs font-bold text-slate-700">{users.find(u => u.id === asset.assignedTo)?.name}</span> : <span className="text-[11px] text-slate-400 italic font-bold uppercase tracking-widest">In Inventory</span>}
                </td>
                <td className="px-6 py-4 text-right">
                   <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setShowQuickView(asset)} className="p-2 text-slate-400 hover:text-brand-primary rounded-lg transition-colors" title="Quick View"><Eye size={18} /></button>
                      {canUpdate && (
                        <>
                          <button onClick={() => { setFormData(asset); setShowEditModal(asset); }} className="p-2 text-slate-400 hover:text-brand-primary rounded-lg transition-colors" title="Edit Properties"><Edit3 size={18} /></button>
                          <button onClick={() => { setNewStatus(asset.status); setStatusModal({ open: true, asset }); }} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors" title="Update Asset Status"><Tag size={18} /></button>
                          {asset.status === AssetStatus.ASSIGNED ? (
                            <button onClick={() => setReturnModal({ open: true, assetId: asset.id })} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="Formal Return"><RefreshCw size={18} /></button>
                          ) : (
                            <button onClick={() => setAssignModal({ open: true, assetId: asset.id })} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Assign to Employee"><UserCheck size={18} /></button>
                          )}
                          <button onClick={() => setRemoveModal({ open: true, asset })} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Decommission"><Trash2 size={18} /></button>
                        </>
                      )}
                   </div>
                </td>
              </tr>
            ))}
            {filteredAssets.length === 0 && (
              <tr>
                <td colSpan={4} className="py-20 text-center text-slate-400 italic font-medium uppercase text-xs tracking-widest">No matching units found in this category/status.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Quick View Modal */}
      {showQuickView && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowQuickView(null)} />
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl p-8 overflow-y-auto animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{showQuickView.assetCode}</h3>
              <button onClick={() => setShowQuickView(null)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Brand</p><p className="font-bold text-slate-900">{showQuickView.brand}</p></div>
                <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Model</p><p className="font-bold text-slate-900">{showQuickView.model}</p></div>
                <div className="col-span-2"><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Serial Identity</p><p className="font-mono text-xs font-bold text-brand-primary bg-indigo-50 p-2 rounded border border-indigo-100">{showQuickView.serialNumber}</p></div>
                <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Purchase Date</p><p className="font-bold text-slate-900">{showQuickView.purchaseDate}</p></div>
                <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Assigned To</p><p className="font-bold text-slate-900">{users.find(u => u.id === showQuickView.assignedTo)?.name || 'N/A'}</p></div>
              </div>
            </div>
            <button onClick={() => setShowQuickView(null)} className="w-full mt-10 py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-lg text-sm transition-all uppercase tracking-widest shadow-lg active:scale-95">Dismiss View</button>
          </div>
        </div>
      )}

      {/* Manual Status Modal */}
      {statusModal.open && statusModal.asset && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isProcessing && setStatusModal({ open: false, asset: null })} />
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl p-8 animate-in zoom-in duration-200">
            <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tighter border-b border-slate-100 pb-4 flex items-center gap-2">
                <Tag size={24} className="text-indigo-600" /> Transition Lifecycle
            </h2>
            <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Asset</p>
                    <p className="text-sm font-bold text-slate-900 uppercase">{statusModal.asset.assetCode} — {statusModal.asset.brand} {statusModal.asset.model}</p>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">New Lifecycle State</label>
                    <select 
                        value={newStatus} 
                        onChange={e => setNewStatus(e.target.value as AssetStatus)} 
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary bg-white text-slate-900 font-bold appearance-none cursor-pointer"
                    >
                        {Object.values(AssetStatus).filter(s => s !== AssetStatus.REMOVED).map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
                {statusModal.asset.status === AssetStatus.ASSIGNED && newStatus !== AssetStatus.ASSIGNED && (
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
                        <ShieldAlert size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-amber-700 uppercase leading-tight">Note: Changing from 'Assigned' will automatically un-link this asset from its current user.</p>
                    </div>
                )}
                {newStatus === AssetStatus.PENDING_AUDIT && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                        <ShieldAlert size={14} className="text-red-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-red-700 uppercase leading-tight">Unit will be moved to the Pending Audit queue for technical verification.</p>
                    </div>
                )}
                <div className="flex gap-4 pt-2">
                    <button type="button" onClick={() => setStatusModal({ open: false, asset: null })} className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200">Discard</button>
                    <button 
                        type="button" 
                        onClick={handleUpdateStatus} 
                        disabled={isProcessing} 
                        className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2"
                    >
                        {isProcessing && <Loader2 className="animate-spin" size={16} />}
                        Apply Lifecycle State
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Asset Modal (Asset Register Form) */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isProcessing && (setShowAddModal(false), setShowEditModal(null))} />
          <div className="relative bg-white w-full max-w-2xl rounded-xl shadow-2xl p-8 overflow-y-auto max-h-[95vh] animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                {showEditModal ? `Update Unit: ${showEditModal.assetCode}` : `Register New ${activeCategory}`}
              </h3>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(null); }} className="p-1 text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveAsset} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Asset Tag / Code</label>
                  <input required type="text" value={formData.assetCode} onChange={e => setFormData({ ...formData, assetCode: e.target.value.toUpperCase() })} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary text-slate-900 bg-white font-bold" placeholder="e.g. LAP-001" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Asset Type</label>
                  <select required value={formData.assetType} onChange={e => setFormData({ ...formData, assetType: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary bg-white text-slate-900 font-bold appearance-none cursor-pointer">
                    <option value="Laptop">Laptop</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Phone">Smartphone</option>
                    <option value="Desktop">Desktop PC</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Mouse">Mouse (Input)</option>
                    <option value="Keyboard">Keyboard (Input)</option>
                    <option value="Other">Other Equipment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Manufacturer (Brand)</label>
                  <input required type="text" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary text-slate-900 bg-white font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Model Name / Number</label>
                  <input required type="text" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary text-slate-900 bg-white font-medium" />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Serial Identity (S/N)</label>
                  <input required type="text" value={formData.serialNumber} onChange={e => setFormData({ ...formData, serialNumber: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary text-slate-900 bg-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Purchase Date</label>
                  <input required type="date" value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary text-slate-900 bg-white font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Purchase Value ({settings.currencySymbol})</label>
                  <input required type="number" value={formData.purchaseValue} onChange={e => setFormData({ ...formData, purchaseValue: parseFloat(e.target.value) })} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary text-slate-900 bg-white font-bold" />
                </div>
              </div>
              <div className="flex gap-4 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => { setShowAddModal(false); setShowEditModal(null); }} className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200">Discard</button>
                <button type="submit" disabled={isProcessing} className="flex-[2] py-3 bg-brand-primary text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2">
                  {isProcessing && <Loader2 className="animate-spin" size={16} />}
                  {showEditModal ? 'Update Register' : 'Finalize Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {assignModal.open && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isProcessing && setAssignModal({ open: false, assetId: '' })} />
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl p-8 animate-in zoom-in duration-200">
            <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tighter border-b border-slate-100 pb-4">Assign to Employee</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Select Assignee</label>
                <select required value={selectedUserId} onChange={e => { setSelectedUserId(e.target.value); setIsSpare(false); }} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary bg-white text-slate-900 font-bold appearance-none cursor-pointer">
                  <option value="">Choose employee...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.employeeId})</option>)}
                </select>
              </div>
              
              {selectedUserId && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee Policy mode</p>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${users.find(u => u.id === selectedUserId)?.assetUsage === AssetUsage.PERSONAL ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {users.find(u => u.id === selectedUserId)?.assetUsage}
                        </span>
                      </div>
                      
                      {currentAssetForAssign?.inventoryCategory === 'ASSET' && (
                          <div className="space-y-4 pt-2 border-t border-slate-200">
                              <label className="flex items-center gap-3 cursor-pointer group">
                                  <div className={`w-10 h-6 rounded-full transition-all relative ${isSpare ? 'bg-brand-primary' : 'bg-slate-300'}`}>
                                      <input type="checkbox" className="hidden" checked={isSpare} onChange={e => setIsSpare(e.target.checked)} />
                                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${isSpare ? 'left-5' : 'left-1'}`} />
                                  </div>
                                  <div className="flex-1">
                                      <p className="text-xs font-black text-slate-900 uppercase">Mark as Spare/Temporary</p>
                                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">For repair loaners or short-term use</p>
                                  </div>
                              </label>

                              {isSpare && (
                                  <div className="space-y-2 animate-in slide-in-from-top-2">
                                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Expected Return Date (Optional)</label>
                                      <div className="relative">
                                          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                          <input type="date" value={spareReturnDate} onChange={e => setSpareReturnDate(e.target.value)} className="w-full pl-10 pr-4 py-2 text-xs font-bold rounded-lg border border-slate-300 focus:ring-1 focus:ring-brand-primary outline-none" />
                                      </div>
                                  </div>
                              )}

                              {users.find(u => u.id === selectedUserId)?.assetUsage === AssetUsage.PERSONAL && !isSpare && (
                                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                                      <ShieldAlert size={14} className="text-red-500 shrink-0 mt-0.5" />
                                      <p className="text-[9px] font-bold text-red-600 uppercase leading-tight">Must enable Spare Mode for Personal usage employees.</p>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              )}

              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setAssignModal({ open: false, assetId: '' })} className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200">Cancel</button>
                <button 
                    type="button" 
                    onClick={handleAssignAsset} 
                    disabled={!selectedUserId || isProcessing || (users.find(u => u.id === selectedUserId)?.assetUsage === AssetUsage.PERSONAL && currentAssetForAssign?.inventoryCategory === 'ASSET' && !isSpare)} 
                    className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-md hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing && <Loader2 className="animate-spin" size={16} />}
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnModal.open && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isProcessing && setReturnModal({ open: false, assetId: '' })} />
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl p-8 animate-in zoom-in duration-200">
            <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tighter border-b border-slate-100 pb-4">Release From Assignee</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Inventory Destination</label>
                <select value={returnForm.status} onChange={e => setReturnForm({...returnForm, status: e.target.value as AssetStatus})} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary bg-white text-slate-900 font-bold appearance-none cursor-pointer">
                  <option value={AssetStatus.READY_TO_USE}>Ready to Use (Stock)</option>
                  <option value={AssetStatus.SPARE}>Spare Inventory</option>
                  <option value={AssetStatus.PENDING_AUDIT}>Return to Audit Queue</option>
                  <option value={AssetStatus.UNDER_REPAIR}>Sent for Repair</option>
                </select>
              </div>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setReturnModal({ open: false, assetId: '' })} className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200">Cancel</button>
                <button type="button" onClick={submitReturn} disabled={isProcessing} className="flex-[2] py-3 bg-amber-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2">
                  {isProcessing && <Loader2 className="animate-spin" size={16} />}
                  Confirm Return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decommission (Remove) Modal */}
      {removeModal.open && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isProcessing && setRemoveModal({ open: false, asset: null })} />
          <div className="relative bg-white w-full max-w-2xl rounded-xl shadow-2xl p-8 overflow-y-auto max-h-[90vh] animate-in zoom-in duration-200">
            <h2 className="text-xl font-black text-red-600 mb-6 uppercase tracking-tighter border-b border-slate-100 pb-4">Decommission Unit</h2>
            <form onSubmit={submitRemoval} className="space-y-6">
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 text-[11px] font-bold uppercase tracking-tight shadow-inner">
                Warning: Decommissioning will move this unit to the Removed Assets Register (RAR) permanently. This action cannot be undone.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Formal Reason</label>
                  <input required type="text" value={removalForm.reason} onChange={e => setRemovalForm({...removalForm, reason: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary text-slate-900 bg-white font-medium" placeholder="e.g. Motherboard failure" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Audit Status</label>
                  <select value={removalForm.statusToCheck} onChange={e => setRemovalForm({...removalForm, statusToCheck: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary bg-white text-slate-900 font-bold cursor-pointer">
                    <option value="Broken">Broken / Unrepairable</option>
                    <option value="E-Waste">End of Life (E-Waste)</option>
                    <option value="Stolen">Stolen / Missing</option>
                    <option value="Lost">Lost by Employee</option>
                    <option value="Sold">Asset Sold</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Approved By</label>
                  <input required type="text" value={removalForm.approvedBy} onChange={e => setRemovalForm({...removalForm, approvedBy: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary text-slate-900 bg-white font-bold" placeholder="Admin Name" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Residual Value ({settings.currencySymbol})</label>
                  <input required type="number" value={removalForm.valueAtRemoval} onChange={e => setRemovalForm({...removalForm, valueAtRemoval: parseFloat(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary text-slate-900 bg-white font-bold" />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Final Remarks</label>
                  <textarea rows={3} value={removalForm.remark} onChange={e => setRemovalForm({...removalForm, remark: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary text-slate-900 bg-white font-medium" placeholder="Additional audit context..." />
                </div>
              </div>
              <div className="flex gap-4 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setRemoveModal({ open: false, asset: null })} className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200">Abort</button>
                <button type="submit" disabled={isProcessing} className="flex-[2] py-3 bg-red-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-md hover:bg-red-700 transition-all flex items-center justify-center gap-2">
                  {isProcessing && <Loader2 className="animate-spin" size={16} />}
                  Archive Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetManagement;
