
import React, { useMemo, useState, useEffect } from 'react';
import { db } from '../../db/mockDb';
import { useAuth } from '../../context/AuthContext';
import { HardDrive, Laptop, Monitor, Smartphone, ShieldCheck, Clock, Lock, Info, X, MousePointer2, Briefcase, ArrowRight } from 'lucide-react';
import { AppSettings, Asset, InventoryCategory } from '../../types';

const MyAssets: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const allMyAssets = useMemo(() => db.getAssets().filter(a => a.assignedTo === user?.id), [user]);
  const [activeCategory, setActiveCategory] = useState<InventoryCategory | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  useEffect(() => {
    setSettings(db.getSettings());
  }, []);

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'laptop': return <Laptop size={24} />;
      case 'monitor': return <Monitor size={24} />;
      case 'phone': return <Smartphone size={24} />;
      case 'mouse': return <MousePointer2 size={24} />;
      case 'accessory': return <Briefcase size={24} />;
      default: return <HardDrive size={24} />;
    }
  };

  const filtered = useMemo(() => {
      return allMyAssets.filter(a => a.inventoryCategory === activeCategory);
  }, [allMyAssets, activeCategory]);

  const categoryCounts = {
      ASSET: allMyAssets.filter(a => a.inventoryCategory === 'ASSET').length,
      MOUSE: allMyAssets.filter(a => a.inventoryCategory === 'MOUSE').length,
      ACCESSORY: allMyAssets.filter(a => a.inventoryCategory === 'ACCESSORY').length
  };

  const categoryTiles = [
    { id: 'ASSET', title: 'My Hardware', icon: Laptop, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    { id: 'MOUSE', title: 'My Mouse', icon: MousePointer2, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { id: 'ACCESSORY', title: 'My Accessories', icon: Briefcase, color: 'text-brand-primary', bgColor: 'bg-brand-primary/10' }
  ];

  if (!activeCategory) {
    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">My Inventory</h1>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Allocated Equipment Tracking
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {categoryTiles.map(tile => (
                    <button 
                        key={tile.id}
                        onClick={() => setActiveCategory(tile.id as InventoryCategory)}
                        className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm group hover:shadow-2xl hover:border-brand-primary/20 transition-all text-left flex flex-col relative overflow-hidden"
                    >
                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-slate-50 rounded-full group-hover:bg-brand-primary/5 transition-all" />
                        
                        <div className={`w-16 h-16 rounded-3xl ${tile.bgColor} ${tile.color} flex items-center justify-center mb-8 transition-transform group-hover:scale-110 shadow-inner relative z-10`}>
                            <tile.icon size={32} />
                        </div>
                        
                        <div className="flex justify-between items-center w-full relative z-10">
                            <p className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">{tile.title}</p>
                            <span className="bg-slate-900 text-white text-[11px] font-black px-3 py-1 rounded-xl">
                                {categoryCounts[tile.id as keyof typeof categoryCounts]}
                            </span>
                        </div>
                        
                        <div className="mt-10 flex items-center gap-2 text-brand-primary font-black uppercase text-[10px] tracking-widest relative z-10">
                            View Assigned Items <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
            <button 
                onClick={() => setActiveCategory(null)}
                className="p-4 bg-white border border-slate-200 rounded-[1.5rem] text-slate-400 hover:text-brand-primary transition-all shadow-sm"
            >
                <X size={24} />
            </button>
            <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                    {categoryTiles.find(t => t.id === activeCategory)?.title}
                </h1>
                <p className="text-slate-500 font-medium mt-1">Official inventory signature registered to your identity.</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filtered.map(asset => {
          const currentValue = db.calculateAssetValue(asset, settings);
          return (
            <div 
              key={asset.id} 
              onClick={() => setSelectedAsset(asset)}
              className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:border-brand-primary/20 hover:shadow-2xl transition-all duration-300 cursor-pointer"
            >
              <div className="p-8 flex items-start justify-between border-b border-slate-100 bg-white group-hover:bg-slate-50/30 transition-colors">
                <div className="flex gap-5">
                  <div className="p-4 bg-brand-primary/10 text-brand-primary rounded-[1.5rem] shadow-sm transition-transform group-hover:scale-110">
                    {getIcon(asset.inventoryCategory === 'ASSET' ? asset.assetType : asset.inventoryCategory)}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-xl tracking-tight leading-none uppercase">{asset.model}</h3>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mt-3">{asset.brand} • {asset.assetType}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${asset.status === 'Under Repair' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {asset.status === 'Under Repair' ? 'In Repair' : 'Operational'}
                  </span>
                </div>
              </div>
              
              <div className="p-8 bg-slate-50/50 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Internal Code</p>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">{asset.assetCode}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Serial Identity</p>
                    <p className="text-xs font-mono text-slate-900 font-bold">{asset.serialNumber || 'N/A'}</p>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-200/60">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Book Valuation</p>
                  {settings.allowViewAssetValue ? (
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-black text-slate-900 tracking-tighter">{settings.currencySymbol}{currentValue.toLocaleString()}</span>
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Real-time estimate</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-5 bg-white rounded-[1.5rem] border border-slate-200/60 shadow-inner">
                      <Lock size={16} className="text-slate-300" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valuation protected by policy</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 p-5 bg-white rounded-[1.5rem] border border-slate-200 shadow-sm">
                  <ShieldCheck size={20} className="text-emerald-500 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Compliance verified & warranted</span>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-32 bg-white rounded-[3rem] border border-dashed border-slate-200 text-center flex flex-col items-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
              <Briefcase size={48} className="text-slate-200" />
            </div>
            <p className="text-slate-500 font-black uppercase tracking-[0.2em]">List Empty</p>
            <p className="text-sm text-slate-400 mt-4 max-w-sm font-medium">No items assigned to you in the {activeCategory.toLowerCase()} category.</p>
          </div>
        )}
      </div>

      {selectedAsset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedAsset(null)} />
          <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-12 border border-white/20 animate-in zoom-in overflow-y-auto max-h-[95vh]">
            <div className="flex justify-between items-start mb-10">
              <div className="w-16 h-16 bg-brand-primary/10 text-brand-primary rounded-[2rem] flex items-center justify-center shadow-inner border border-brand-primary/10">
                {getIcon(selectedAsset.inventoryCategory === 'ASSET' ? selectedAsset.assetType : selectedAsset.inventoryCategory)}
              </div>
              <button onClick={() => setSelectedAsset(null)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24} /></button>
            </div>
            <div className="space-y-10">
              <div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{selectedAsset.model}</h3>
                <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em] mt-5">Inventory Signature</p>
              </div>
              
              <div className="grid grid-cols-2 gap-10 border-t border-slate-100 pt-10">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Internal Tag</p>
                  <p className="text-base font-black text-slate-900 uppercase tracking-tight">{selectedAsset.assetCode}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Category</p>
                  <p className="text-base font-bold text-slate-900 uppercase tracking-tight">{selectedAsset.assetType}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Serial Identity</p>
                  <p className="text-xs font-mono font-bold text-slate-700">{selectedAsset.serialNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Operational Since</p>
                  <p className="text-base font-bold text-slate-900">{new Date(selectedAsset.purchaseDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedAsset(null)} className="w-full mt-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95">Dismiss View</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAssets;
