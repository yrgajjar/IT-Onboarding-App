
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../db/mockDb';
import { useAuth } from '../../context/AuthContext';
import { AssetService, ServiceStatus } from '../../types';
import { Settings2, Clock, CheckCircle2, Calendar, HardDrive, ShieldCheck, ChevronRight, Info } from 'lucide-react';

const MyServices: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<AssetService[]>([]);

  useEffect(() => {
    if (user) {
      const userAssets = db.getAssets().filter(a => a.assignedTo === user.id);
      const userAssetCodes = userAssets.map(a => a.assetCode);
      const allServices = db.getServices();
      const relevantServices = allServices.filter(s => 
        s.userId === user.id || userAssetCodes.includes(s.assetCode)
      );
      setServices(relevantServices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }
  }, [user]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Maintenance Pulse</h1>
          <p className="text-slate-500 font-medium mt-1">Lifecycle history and technical audits for your equipment.</p>
        </div>
      </div>

      <div className="space-y-6">
        {services.map(svc => (
          <div key={svc.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm group hover:border-brand-primary/20 transition-all duration-300">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-6">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <div className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.15em] flex items-center gap-2 ${
                    svc.status === ServiceStatus.COMPLETED_CLOSED ? 'bg-emerald-100 text-emerald-700 shadow-inner' : 'bg-amber-100 text-amber-700 shadow-inner'
                  }`}>
                    {svc.status === ServiceStatus.COMPLETED_CLOSED ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                    {svc.status}
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-black text-slate-900 uppercase tracking-widest">
                    <HardDrive size={16} className="text-brand-primary" /> {svc.assetCode}
                  </div>
                  <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest shrink-0">•</span>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em]">{svc.category} Audit</span>
                </div>

                <div className="space-y-2">
                  <h3 className="font-black text-slate-900 text-xl uppercase tracking-tight group-hover:text-brand-primary transition-colors">{svc.summary}</h3>
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-300" /> Opened: {svc.dateOfTT}
                    </div>
                    {svc.dateOfClose && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400" /> Resolved: {svc.dateOfClose}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">Components Replaced</p>
                    <p className="text-sm font-bold text-slate-700">{svc.addedReplacedParts || 'Physical hardware maintained without replacements.'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">Technical Conclusion</p>
                    <p className="text-sm font-medium text-slate-600 italic leading-relaxed">"{svc.conclusion || 'Preliminary assessment completed. Awaiting final closure by technical team.'}"</p>
                  </div>
                </div>
              </div>
              
              <div className="md:w-64 shrink-0 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8">
                <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <ShieldCheck size={16} /> IT Directive
                </p>
                <p className="text-xs text-slate-500 leading-relaxed font-bold uppercase tracking-tight">
                  {svc.whatNext || 'Continue standard utilization. Monitor device performance over 72 hours.'}
                </p>
                <div className="mt-8 p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                   <p className="text-[9px] font-black text-brand-primary uppercase tracking-widest">Technician</p>
                   <p className="text-[11px] font-bold text-slate-700 mt-1">{svc.technicianName || 'SYSTEM_AUTO'}</p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {services.length === 0 && (
          <div className="py-32 text-center bg-white border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
              <Settings2 size={48} className="text-slate-200" />
            </div>
            <p className="text-slate-500 font-black uppercase tracking-[0.2em]">Zero Maintenance Logs</p>
            <p className="text-sm text-slate-400 mt-4 max-w-sm font-medium">History will populate here once IT performs official servicing on your assigned hardware stack.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyServices;
