
import React, { useState, useEffect, useMemo } from 'react';
// Fix: Ensure useSearchParams is correctly imported from react-router-dom
import { useSearchParams } from 'react-router-dom';
import { db } from '../../db/mockDb';
import { Asset, AssetService, User, ServiceStatus } from '../../types';
import { Plus, Search, Filter, Settings2, Calendar, User as UserIcon, HardDrive, Edit3, Trash2, X, ChevronRight, CheckCircle2, Clock } from 'lucide-react';

const AssetServices: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialAssetFilter = searchParams.get('assetCode') || '';

  const [services, setServices] = useState<AssetService[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [assetFilter, setAssetFilter] = useState(initialAssetFilter);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<AssetService | null>(null);

  const emptyService: Partial<AssetService> = {
    userId: '', userName: '', assetId: '', assetCode: '', assetType: '', brand: '', model: '', serialNumber: '',
    monthOfTT: new Date().toLocaleString('default', { month: 'long' }),
    dateOfTT: new Date().toISOString().split('T')[0],
    category: '', subCategory: '', technicianName: '', summary: '',
    status: ServiceStatus.UNCOMPLETED_PENDING,
    uncompletedRepairs: '', addedReplacedParts: '', partsCost: 0,
    invoiceReference: '', conclusion: '', whatNext: ''
  };

  const [formData, setFormData] = useState<Partial<AssetService>>(emptyService);

  useEffect(() => {
    setServices(db.getServices().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setAssets(db.getAssets());
    setUsers(db.getUsers());
  }, []);

  const handleAssetSelect = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
      setFormData(prev => ({
        ...prev,
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetType: asset.assetType,
        brand: asset.brand,
        model: asset.model,
        serialNumber: asset.serialNumber
      }));
    }
  };

  const handleUserSelect = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setFormData(prev => ({
        ...prev,
        userId: user.id,
        userName: user.name
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentServices = db.getServices();
    let updated;

    if (editingService) {
      updated = currentServices.map(s => s.id === editingService.id ? { ...s, ...formData } as AssetService : s);
    } else {
      const newService: AssetService = {
        id: `svc-${Date.now()}`,
        ...formData as AssetService,
        createdAt: new Date().toISOString()
      };
      updated = [newService, ...currentServices];
    }

    db.saveServices(updated);
    setServices(updated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setShowAddModal(false);
    setEditingService(null);
    setFormData(emptyService);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this service record?')) {
      const updated = db.getServices().filter(s => s.id !== id);
      db.saveServices(updated);
      setServices(updated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }
  };

  const filtered = useMemo(() => {
    return services.filter(s => {
      const matchesSearch = s.assetCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            s.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.technicianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.summary.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAsset = !assetFilter || s.assetCode === assetFilter;
      return matchesSearch && matchesAsset;
    });
  }, [services, searchTerm, assetFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asset Services Management</h1>
          <p className="text-slate-500">Track repairs, maintenance, and technical history.</p>
        </div>
        <button 
          onClick={() => { setEditingService(null); setFormData(emptyService); setShowAddModal(true); }}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md active:scale-95"
        >
          <Plus size={20} /> Add Service Record
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by asset, employee, technician or summary..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
          />
        </div>
        {assetFilter && (
          <button 
            onClick={() => setAssetFilter('')}
            className="px-4 py-3 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-bold flex items-center gap-2"
          >
            Filtered: {assetFilter} <X size={14} />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {filtered.map(svc => (
          <div key={svc.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5 ${
                    svc.status === ServiceStatus.COMPLETED_CLOSED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {svc.status === ServiceStatus.COMPLETED_CLOSED ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                    {svc.status}
                  </div>
                  <span className="text-sm font-bold text-slate-900">{svc.assetCode}</span>
                  <span className="text-sm text-slate-400">•</span>
                  <span className="text-sm text-slate-500 font-medium">{svc.category} / {svc.subCategory}</span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-lg mb-1">{svc.summary}</h3>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <UserIcon size={16} className="text-slate-400" /> {svc.userName}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={16} className="text-slate-400" /> {svc.dateOfTT}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Settings2 size={16} className="text-slate-400" /> {svc.technicianName}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Parts & Repairs</p>
                    <p className="text-sm text-slate-700 font-medium">
                      {svc.addedReplacedParts || 'No parts added'}
                      {svc.partsCost > 0 && <span className="text-indigo-600 ml-2">(Cost: ₹{svc.partsCost})</span>}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Recommendation</p>
                    <p className="text-sm text-slate-700 font-medium italic">"{svc.whatNext || 'N/A'}"</p>
                  </div>
                </div>
              </div>

              <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-3 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6 shrink-0">
                <div className="text-right hidden lg:block">
                  <p className="text-xs text-slate-400">Month</p>
                  <p className="text-sm font-bold text-slate-700">{svc.monthOfTT}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setEditingService(svc); setFormData(svc); setShowAddModal(true); }}
                    className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                  >
                    <Edit3 size={20} />
                  </button>
                  <button 
                    onClick={() => handleDelete(svc.id)}
                    className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <Settings2 size={40} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500">No service records found.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl p-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-900">{editingService ? 'Edit Service Record' : 'Add New Service Record'}</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Section: Entity Association */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><UserIcon size={18} className="text-indigo-600" /> Employee Assignment</h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Employee</label>
                    <select 
                      required
                      value={formData.userId}
                      onChange={e => handleUserSelect(e.target.value)}
                      className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">Choose employee...</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><HardDrive size={18} className="text-indigo-600" /> Asset Information</h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Asset (All Items)</label>
                    <select 
                      required
                      value={formData.assetId}
                      onChange={e => handleAssetSelect(e.target.value)}
                      className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">Choose asset...</option>
                      {assets.map(a => <option key={a.id} value={a.id}>{a.assetCode} - {a.model} ({a.brand})</option>)}
                    </select>
                  </div>
                  {formData.assetCode && (
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-500">
                      <div>Type: <span className="text-slate-900">{formData.assetType}</span></div>
                      <div>Brand: <span className="text-slate-900">{formData.brand}</span></div>
                      <div>Model: <span className="text-slate-900">{formData.model}</span></div>
                      <div>S/N: <span className="text-slate-900 font-mono">{formData.serialNumber}</span></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section: Service Details */}
              <div className="space-y-6">
                <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Service Context</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Month of TT</label>
                    <input type="text" value={formData.monthOfTT} onChange={e => setFormData({...formData, monthOfTT: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date of TT</label>
                    <input type="date" value={formData.dateOfTT} onChange={e => setFormData({...formData, dateOfTT: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date of Close</label>
                    <input type="date" value={formData.dateOfClose} onChange={e => setFormData({...formData, dateOfClose: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                    <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g. Hardware" className="w-full px-4 py-2 border rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sub-Category</label>
                    <input required type="text" value={formData.subCategory} onChange={e => setFormData({...formData, subCategory: e.target.value})} placeholder="e.g. Display Panel" className="w-full px-4 py-2 border rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Technician / Vendor</label>
                    <input required type="text" value={formData.technicianName} onChange={e => setFormData({...formData, technicianName: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Problem Summary</label>
                  <input required type="text" value={formData.summary} onChange={e => setFormData({...formData, summary: e.target.value})} placeholder="Short description of the issue" className="w-full px-4 py-2 border rounded-xl" />
                </div>
              </div>

              {/* Section: Results & Cost */}
              <div className="space-y-6">
                <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Outcome & Financials</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ServiceStatus})} className="w-full px-4 py-2 border rounded-xl bg-white">
                      <option value={ServiceStatus.UNCOMPLETED_PENDING}>Uncompleted / Pending</option>
                      <option value={ServiceStatus.COMPLETED_CLOSED}>Completed / Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Parts Cost (₹)</label>
                    <input type="number" value={formData.partsCost} onChange={e => setFormData({...formData, partsCost: parseFloat(e.target.value)})} className="w-full px-4 py-2 border rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Invoice Reference</label>
                    <input type="text" value={formData.invoiceReference} onChange={e => setFormData({...formData, invoiceReference: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Added / Replaced Parts</label>
                    <textarea rows={2} value={formData.addedReplacedParts} onChange={e => setFormData({...formData, addedReplacedParts: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Uncompleted Repairs</label>
                    <textarea rows={2} value={formData.uncompletedRepairs} onChange={e => setFormData({...formData, uncompletedRepairs: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Completed Summary / Conclusion</label>
                    <textarea rows={2} value={formData.conclusion} onChange={e => setFormData({...formData, conclusion: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">What Next? (Recommendation)</label>
                    <textarea rows={2} value={formData.whatNext} onChange={e => setFormData({...formData, whatNext: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all active:scale-[0.98]">
                  {editingService ? 'Update Service Record' : 'Save Service Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetServices;
