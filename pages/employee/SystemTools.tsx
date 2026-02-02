
import React, { useState, useEffect } from 'react';
import { db } from '../../db/mockDb';
import { AppSettings } from '../../types';
import { Terminal, Download, FileWarning, Info } from 'lucide-react';

const SystemTools: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());

  useEffect(() => {
    // Basic polling for dynamic updates
    const interval = setInterval(() => {
      setSettings(db.getSettings());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const hasGuides = settings.showCleanupGuides && settings.helpGuides.filter(g => g.isActive).length > 0;
  const hasTools = settings.showSoftwareTools && settings.softwareTools.filter(t => t.isEnabled).length > 0;

  if (!hasGuides && !hasTools) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">IT Help & Tools</h1>
          <p className="text-slate-500 font-medium text-lg mt-1 tracking-tight">No tools or guides are currently published by the administration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">IT Help & Tools</h1>
        <p className="text-slate-500 font-medium text-lg mt-1 tracking-tight">Quick guides for keeping your machine running smooth.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
        {settings.showCleanupGuides && settings.helpGuides.filter(g => g.isActive).map(guide => (
          <div key={guide.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 text-brand-primary">
              <div className="p-3 bg-brand-primary/10 rounded-2xl">
                <Terminal size={24} />
              </div>
              <h2 className="font-black text-xl text-slate-900 uppercase tracking-tight">{guide.title}</h2>
            </div>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">System optimization instructions for employees:</p>
            <ul className="space-y-4">
              {guide.steps.filter(step => step.trim()).map((step, i) => (
                <li key={i} className="flex gap-4 text-sm text-slate-700 font-medium">
                  <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-brand-primary text-white flex items-center justify-center font-black text-xs shadow-lg shadow-brand-primary/20">
                    {i + 1}
                  </span>
                  <span className="mt-1">{step}</span>
                </li>
              ))}
            </ul>
            {guide.warning && (
              <div className="p-5 bg-amber-50 rounded-2xl flex gap-4 border border-amber-100 shadow-sm">
                <FileWarning size={24} className="text-amber-500 shrink-0" />
                <p className="text-xs text-amber-800 font-bold leading-relaxed">{guide.warning}</p>
              </div>
            )}
          </div>
        ))}

        {settings.showSoftwareTools && (
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="p-3 bg-emerald-50 rounded-2xl">
                <Download size={24} />
              </div>
              <h2 className="font-black text-xl text-slate-900 uppercase tracking-tight">Software & Tools</h2>
            </div>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">Common tools approved for company devices.</p>
            <div className="space-y-4">
              {settings.softwareTools.filter(t => t.isEnabled).map((tool) => (
                <div 
                  key={tool.id} 
                  onClick={() => tool.downloadUrl && window.open(tool.downloadUrl, '_blank')}
                  className={`p-5 border border-slate-100 rounded-3xl hover:border-emerald-200 hover:bg-emerald-50 transition-all flex items-center justify-between group ${tool.downloadUrl ? 'cursor-pointer' : ''}`}
                >
                  <div className="pr-4">
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{tool.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 leading-tight">{tool.description}</p>
                  </div>
                  {tool.downloadUrl && (
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                      <Download size={18} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 p-6 bg-slate-50 rounded-3xl border border-slate-200 shadow-inner">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-brand-primary/10 rounded-lg">
                  <Info size={18} className="text-brand-primary" />
                </div>
                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Need more help?</p>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Raising a support ticket is the fastest way to get help with hardware or software issues. Our IT team responds to all tickets within the standard SLA.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemTools;
