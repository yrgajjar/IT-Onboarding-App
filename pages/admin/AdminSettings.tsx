
import React, { useState } from 'react';
import { db } from '../../db/mockDb';
import { AppSettings, AssetStatus, ComplaintStatus } from '../../types';
// Add missing Settings2 and ShieldAlert icons
import { Cog, Percent, BadgeIndianRupee, Save, RotateCcw, ShieldCheck, Bell, Shield, Workflow, Lock, Mail, Trash2, Users, Power, Calendar, Monitor, Settings2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AdminSettings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [activeTab, setActiveTab] = useState<'workflow' | 'behavior' | 'notifications' | 'financial' | 'security' | 'modes'>('modes');

  const canModify = user?.permissions?.settings?.write || user?.permissions?.settings?.update;

  const handleSave = () => {
    if (!user || !canModify) return;
    setIsSaving(true);
    db.saveSettings({ ...settings, lastUpdated: new Date().toISOString() }, user);
    setTimeout(() => { setIsSaving(false); setShowToast(true); setTimeout(() => setShowToast(false), 3000); }, 500);
  };

  const Toggle = ({ enabled, onClick, label, sublabel }: any) => (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
      <div>
        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{label}</p>
        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{sublabel}</p>
      </div>
      <button disabled={!canModify} onClick={onClick} className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${enabled ? 'bg-brand-primary shadow-inner' : 'bg-slate-300 shadow-inner'}`}>
        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  const InputField = ({ label, type, value, onChange, suffix, placeholder }: any) => (
    <div className="space-y-1 flex-1">
      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <input 
            disabled={!canModify} 
            type={type} 
            value={value} 
            placeholder={placeholder}
            onChange={e => onChange(e.target.value)} 
            className="w-full px-4 py-2.5 text-sm font-bold rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-brand-primary bg-white text-slate-900 shadow-inner" 
        />
        {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-black uppercase tracking-widest border-l border-slate-200 pl-3">{suffix}</span>}
      </div>
    </div>
  );

  const tabs = [
    { id: 'modes', label: 'System Modes', icon: Power },
    { id: 'workflow', label: 'Workflow', icon: Workflow },
    { id: 'behavior', label: 'Employees', icon: Users },
    { id: 'notifications', label: 'Alerts', icon: Bell },
    { id: 'financial', label: 'Financial', icon: BadgeIndianRupee },
    { id: 'security', label: 'Shield', icon: Shield },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {showToast && (
        <div className="fixed top-8 right-8 z-[200] bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3">
          <ShieldCheck size={20} />
          <p className="text-sm font-bold uppercase tracking-widest">Global Policy Synced</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">System Configuration</h1>
          <p className="text-slate-600 text-sm font-medium">Define global automation logic and security constraints.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setSettings(db.getSettings())} className="px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200">Revert</button>
          <button onClick={handleSave} disabled={isSaving || !canModify} className="bg-brand-primary text-white px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
            <Save size={18} /> {isSaving ? 'Synchronizing...' : 'Apply Changes'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 bg-slate-50/50 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2.5 whitespace-nowrap ${activeTab === tab.id ? 'border-brand-primary text-brand-primary bg-white shadow-[0_-2px_0_inset]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="p-8 space-y-8">
          {activeTab === 'modes' && (
            <div className="space-y-8 animate-in slide-in-from-left-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Settings2 size={14}/> Maintenance Engine</h3>
                    <Toggle 
                        label="Maintenance Mode" 
                        sublabel="Disables all Employee Portal access (Admins remain active)" 
                        enabled={settings.maintenanceMode} 
                        onClick={()=>setSettings({...settings, maintenanceMode: !settings.maintenanceMode})} 
                    />
                    {settings.maintenanceMode && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                            <ShieldAlert size={18} className="text-red-600 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-bold text-red-700 uppercase leading-tight">Warning: Employees will be unable to use the app until this mode is toggled off.</p>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Calendar size={14}/> Holiday Calendar</h3>
                    <Toggle 
                        label="Holiday Alert Mode" 
                        sublabel="Shows a persistent holiday banner on all employee pages" 
                        enabled={settings.holidaySettings.enabled} 
                        onClick={()=>setSettings({...settings, holidaySettings: {...settings.holidaySettings, enabled: !settings.holidaySettings.enabled}})} 
                    />
                    {settings.holidaySettings.enabled && (
                        <div className="space-y-4 p-5 bg-indigo-50 border border-indigo-100 rounded-xl animate-in fade-in">
                            <InputField 
                                label="Alert Message" 
                                type="text" 
                                placeholder="Happy Diwali! System under limited support."
                                value={settings.holidaySettings.message} 
                                onChange={(v:any)=>setSettings({...settings, holidaySettings: {...settings.holidaySettings, message: v}})} 
                            />
                        </div>
                    )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-left-2">
               <InputField label="Standard SLA Window" type="number" value={settings.slaDays} onChange={(v:any)=>setSettings({...settings, slaDays:parseInt(v)})} suffix="Days" />
               <Toggle label="SLA Lifecycle Monitor" sublabel="Flag overdue technical requests automatically" enabled={settings.highlightSlaBreach} onClick={()=>setSettings({...settings, highlightSlaBreach: !settings.highlightSlaBreach})} />
               <Toggle label="Automated Service Logging" sublabel="Draft service history entry on ticket resolution" enabled={settings.autoCreateServiceOnClose} onClick={()=>setSettings({...settings, autoCreateServiceOnClose: !settings.autoCreateServiceOnClose})} />
            </div>
          )}

          {activeTab === 'behavior' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-left-2">
              <Toggle label="Authorized Identity Edit" sublabel="Allow personnel to modify their registered legal name" enabled={settings.allowNameChange} onClick={()=>setSettings({...settings, allowNameChange: !settings.allowNameChange})} />
              <Toggle label="Self-Service Reporting" sublabel="Allow personnel to initiate technical support tickets" enabled={settings.allowRaiseComplaint} onClick={()=>setSettings({...settings, allowRaiseComplaint: !settings.allowRaiseComplaint})} />
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-md space-y-6 animate-in slide-in-from-left-2">
              <Toggle label="System-wide Email Alerts" sublabel="Dispatch automated status updates via SMTP" enabled={settings.enableNotifications} onClick={()=>setSettings({...settings, enableNotifications: !settings.enableNotifications})} />
              <InputField label="Admin Notification Gateway" type="email" value={settings.adminEmailForNotifications} onChange={(v:any)=>setSettings({...settings, adminEmailForNotifications:v})} />
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-left-2">
              <InputField label="Monthly Depreciation" type="number" value={settings.depreciationRate} onChange={(v:any)=>setSettings({...settings, depreciationRate:parseFloat(v)})} suffix="%" />
              <InputField label="Currency Token" type="text" value={settings.currencySymbol} onChange={(v:any)=>setSettings({...settings, currencySymbol:v})} />
              <Toggle label="Threshold E-Waste Flagging" sublabel="Auto-flag units reaching zero book valuation" enabled={settings.autoMarkEWaste} onClick={()=>setSettings({...settings, autoMarkEWaste: !settings.autoMarkEWaste})} />
            </div>
          )}

          {activeTab === 'security' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-left-2">
              <InputField label="Access Retry Limit" type="number" value={settings.maxLoginAttempts} onChange={(v:any)=>setSettings({...settings, maxLoginAttempts:parseInt(v)})} suffix="Tries" />
              <Toggle label="Mandatory Password Update" sublabel="Require credential refresh after administrative override" enabled={settings.forcePasswordChangeAfterReset} onClick={()=>setSettings({...settings, forcePasswordChangeAfterReset: !settings.forcePasswordChangeAfterReset})} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
