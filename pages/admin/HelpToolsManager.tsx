
import React, { useState } from 'react';
import { db } from '../../db/mockDb';
import { AppSettings, HelpGuide, SoftwareTool } from '../../types';
import { Terminal, Download, Plus, Trash2, Edit3, Save, X, Eye, EyeOff, LayoutGrid, ListOrdered, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const HelpToolsManager: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [editingGuide, setEditingGuide] = useState<HelpGuide | null>(null);
  const [editingTool, setEditingTool] = useState<SoftwareTool | null>(null);

  const saveToDb = (newSettings: AppSettings) => {
    if (!user) return;
    db.saveSettings(newSettings, user);
    setSettings(newSettings);
  };

  const handleToggleVisibility = (key: 'showCleanupGuides' | 'showSoftwareTools') => {
    const updated = { ...settings, [key]: !settings[key] };
    saveToDb(updated);
  };

  const handleDeleteGuide = (id: string) => {
    if (!window.confirm('Delete this guide permanently?')) return;
    const updated = { ...settings, helpGuides: settings.helpGuides.filter(g => g.id !== id) };
    saveToDb(updated);
  };

  const handleDeleteTool = (id: string) => {
    if (!window.confirm('Delete this tool entry permanently?')) return;
    const updated = { ...settings, softwareTools: settings.softwareTools.filter(t => t.id !== id) };
    saveToDb(updated);
  };

  const handleSaveGuide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuide) return;
    let updatedGuides;
    if (settings.helpGuides.find(g => g.id === editingGuide.id)) {
      updatedGuides = settings.helpGuides.map(g => g.id === editingGuide.id ? editingGuide : g);
    } else {
      updatedGuides = [...settings.helpGuides, editingGuide];
    }
    saveToDb({ ...settings, helpGuides: updatedGuides });
    setEditingGuide(null);
  };

  const handleSaveTool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTool) return;
    let updatedTools;
    if (settings.softwareTools.find(t => t.id === editingTool.id)) {
      updatedTools = settings.softwareTools.map(t => t.id === editingTool.id ? editingTool : t);
    } else {
      updatedTools = [...settings.softwareTools, editingTool];
    }
    saveToDb({ ...settings, softwareTools: updatedTools });
    setEditingTool(null);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Help & Tools Manager</h1>
          <p className="text-slate-500 font-medium">Control the resources and troubleshooting guides available to employees.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cleanup Guides Section */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-primary/10 text-brand-primary rounded-2xl flex items-center justify-center">
                  <Terminal size={24} />
                </div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Cleanup Guides</h2>
              </div>
              <button 
                onClick={() => handleToggleVisibility('showCleanupGuides')}
                className={`p-3 rounded-xl transition-all ${settings.showCleanupGuides ? 'bg-brand-primary/10 text-brand-primary' : 'bg-slate-100 text-slate-400'}`}
                title={settings.showCleanupGuides ? 'Visible to Employees' : 'Hidden from Employees'}
              >
                {settings.showCleanupGuides ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>

            <div className="space-y-4">
              {settings.helpGuides.map(guide => (
                <div key={guide.id} className="p-4 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-all">
                      <ListOrdered size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{guide.title}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{guide.steps.length} Steps</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingGuide(guide)} className="p-2 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg"><Edit3 size={16} /></button>
                    <button onClick={() => handleDeleteGuide(guide.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => setEditingGuide({ id: `guide-${Date.now()}`, title: '', steps: [''], isActive: true })}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black uppercase tracking-widest text-[10px] hover:border-brand-primary/50 hover:bg-brand-primary/5 hover:text-brand-primary transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add New Guide
              </button>
            </div>
          </div>
        </div>

        {/* Software & Tools Section */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <Download size={24} />
                </div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Software & Tools</h2>
              </div>
              <button 
                onClick={() => handleToggleVisibility('showSoftwareTools')}
                className={`p-3 rounded-xl transition-all ${settings.showSoftwareTools ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}
                title={settings.showSoftwareTools ? 'Visible to Employees' : 'Hidden from Employees'}
              >
                {settings.showSoftwareTools ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>

            <div className="space-y-4">
              {settings.softwareTools.map(tool => (
                <div key={tool.id} className="p-4 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-all">
                      <LayoutGrid size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{tool.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate max-w-[200px]">{tool.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingTool(tool)} className="p-2 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg"><Edit3 size={16} /></button>
                    <button onClick={() => handleDeleteTool(tool.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => setEditingTool({ id: `tool-${Date.now()}`, name: '', description: '', isEnabled: true })}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black uppercase tracking-widest text-[10px] hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add New Tool
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Edit Modal */}
      {editingGuide && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setEditingGuide(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl border border-white/20 animate-in zoom-in">
            <h2 className="text-2xl font-black text-brand-primary mb-8 uppercase tracking-tighter">Edit Guide</h2>
            <form onSubmit={handleSaveGuide} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Guide Title</label>
                <input required value={editingGuide.title} onChange={e => setEditingGuide({ ...editingGuide, title: e.target.value })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none transition-all font-bold" />
              </div>
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Steps (One per line)</label>
                <textarea 
                  required 
                  rows={4} 
                  value={editingGuide.steps.join('\n')} 
                  onChange={e => setEditingGuide({ ...editingGuide, steps: e.target.value.split('\n') })} 
                  className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none transition-all font-medium text-sm" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Warning Note (Optional)</label>
                <input value={editingGuide.warning || ''} onChange={e => setEditingGuide({ ...editingGuide, warning: e.target.value })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary outline-none transition-all font-medium text-sm text-amber-700" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setEditingGuide(null)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-brand-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-primary/30">Save Guide</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tool Edit Modal */}
      {editingTool && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setEditingTool(null)} />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl border border-white/20 animate-in zoom-in">
            <h2 className="text-2xl font-black text-emerald-600 mb-8 uppercase tracking-tighter">Edit Software Tool</h2>
            <form onSubmit={handleSaveTool} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Tool Name</label>
                <input required value={editingTool.name} onChange={e => setEditingTool({ ...editingTool, name: e.target.value })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 outline-none transition-all font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Description</label>
                <input required value={editingTool.description} onChange={e => setEditingTool({ ...editingTool, description: e.target.value })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 outline-none transition-all font-medium text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Download URL (Optional)</label>
                <input type="url" value={editingTool.downloadUrl || ''} onChange={e => setEditingTool({ ...editingTool, downloadUrl: e.target.value })} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 outline-none transition-all font-mono text-xs" placeholder="https://" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setEditingTool(null)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-400/30">Save Tool</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpToolsManager;
