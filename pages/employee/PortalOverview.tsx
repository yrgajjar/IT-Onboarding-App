
import React, { useMemo, useState, useEffect } from 'react';
import { db } from '../../db/mockDb';
import { useAuth } from '../../context/AuthContext';
// Added ChevronRight to the lucide-react imports
import { HardDrive, MessageSquare, AlertCircle, CheckCircle2, User as UserIcon, Calendar as CalendarIcon, Clock, Hammer, AlertTriangle, ArrowRight, ShieldCheck, Monitor, Plus, X, MousePointer2, Briefcase, Bell, CheckSquare, Info, ShieldAlert, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AssetStatus, ComplaintStatus, ServiceStatus, UserAlert, UserReminder, AlertReadStatus, AssetUsage, ByodStatus } from '../../types';

const PortalOverview: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const allAssets = db.getAssets();
  const allComplaints = db.getComplaints();
  const allServices = db.getServices();
  const settings = db.getSettings();

  const [activeAlert, setActiveAlert] = useState<UserAlert | null>(null);
  const [reminders, setReminders] = useState<UserReminder[]>([]);
  const [byodStatus, setByodStatus] = useState<ByodStatus>(ByodStatus.PENDING);

  const myAssets = useMemo(() => allAssets.filter(a => a.assignedTo === user?.id), [allAssets, user]);
  const myComplaints = useMemo(() => allComplaints.filter(c => c.userId === user?.id), [allComplaints, user]);
  const myServices = useMemo(() => allServices.filter(s => s.userId === user?.id || myAssets.some(a => a.assetCode === s.assetCode)), [allServices, user, myAssets]);

  useEffect(() => {
    if (!user) return;
    
    // Check for alerts
    const now = new Date().toISOString();
    const alertStatuses = db.getAlertReadStatuses();
    const myAlerts = db.getAlerts().filter(a => {
      const isTargeted = a.targetType === 'ALL' || 
                         (a.targetType === 'USER' && a.targetIds.includes(user.id)) ||
                         (a.targetType === 'ROLE' && a.targetIds.includes(user.role));
      const isActive = a.validFrom <= now && a.validTill >= now;
      const readStatus = alertStatuses.find(s => s.alertId === a.id && s.userId === user.id);
      return isTargeted && isActive && !readStatus?.dismissed;
    });

    if (myAlerts.length > 0) {
      // Prioritize Critical
      const critical = myAlerts.find(a => a.type === 'CRITICAL');
      setActiveAlert(critical || myAlerts[0]);
    }

    // Check for reminders
    const myReminders = db.getReminders().filter(r => r.assignedToIds.includes(user.id));
    setReminders(myReminders);

    // BYOD logic
    if (user.assetUsage === AssetUsage.PERSONAL) {
        const myByod = db.getByodEntries().find(e => e.userId === user.id && e.status === ByodStatus.ACTIVE);
        setByodStatus(myByod ? ByodStatus.ACTIVE : ByodStatus.PENDING);
    }
  }, [user]);

  const handleDismissAlert = () => {
    if (!user || !activeAlert) return;
    const statuses = db.getAlertReadStatuses();
    const existing = statuses.find(s => s.alertId === activeAlert.id && s.userId === user.id);
    
    let updated;
    if (existing) {
      updated = statuses.map(s => s.alertId === activeAlert.id && s.userId === user.id ? { ...s, dismissed: true, readAt: new Date().toISOString() } : s);
    } else {
      updated = [...statuses, { alertId: activeAlert.id, userId: user.id, dismissed: true, readAt: new Date().toISOString() }];
    }
    
    db.saveAlertReadStatuses(updated);
    setActiveAlert(null);
  };

  const updateReminderStatus = (id: string, newStatus: any) => {
    const all = db.getReminders();
    const updated = all.map(r => r.id === id ? { ...r, status: newStatus } : r);
    db.saveReminders(updated);
    setReminders(updated.filter(r => r.assignedToIds.includes(user?.id || '')));
  };

  const stats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return {
      assets: myAssets.filter(a => a.inventoryCategory === 'ASSET').length,
      mouse: myAssets.filter(a => a.inventoryCategory === 'MOUSE').length,
      accessories: myAssets.filter(a => a.inventoryCategory === 'ACCESSORY').length,
      repairing: myAssets.filter(a => a.status === AssetStatus.UNDER_REPAIR).length,
      activeComplaints: myComplaints.filter(c => c.status !== ComplaintStatus.CLOSED && c.status !== ComplaintStatus.CANCELLED).length,
      pendingComplaints: myComplaints.filter(c => c.status === ComplaintStatus.PENDING || c.status === ComplaintStatus.NEW).length,
      servicesCompleted: myServices.filter(s => s.status === ServiceStatus.COMPLETED_CLOSED && new Date(s.createdAt).getFullYear() === currentYear).length
    };
  }, [myAssets, myComplaints, myServices]);

  const alertsBar = useMemo(() => {
    const list = [];
    if (user?.assetUsage === AssetUsage.PERSONAL && byodStatus === ByodStatus.PENDING) {
        list.push({ type: 'error', text: 'BYOD details required: Please register your personal device.', icon: ShieldAlert, path: '/portal/byod' });
    }
    if (stats.pendingComplaints > 0) list.push({ type: 'warning', text: 'You have tickets awaiting IT review.', icon: Clock, path: '/portal/complaints' });
    if (stats.repairing > 0) list.push({ type: 'info', text: 'A device assigned to you is currently under repair.', icon: Hammer, path: '/portal/assets' });
    if (db.isHolidayActive()) list.push({ type: 'success', text: `System operating in Holiday Mode: ${settings.holidaySettings.startDate} to ${settings.holidaySettings.endDate}`, icon: CalendarIcon });
    if (settings.maintenanceMode) list.push({ type: 'warning', text: 'System Maintenance Active: Read-only access enforced.', icon: AlertTriangle });
    return list;
  }, [stats, settings, byodStatus, user]);

  const [showAssetQuickView, setShowAssetQuickView] = useState<any>(null);

  const SummaryCard = ({ label, value, icon: Icon, path, color }: any) => (
    <button 
      onClick={() => navigate(path)}
      className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:shadow-xl hover:border-brand-primary/20 transition-all text-left flex flex-col ${value === 0 ? 'opacity-60 grayscale' : ''}`}
    >
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mb-6 transition-transform group-hover:scale-110 shadow-inner`}>
        <Icon size={24} />
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
    </button>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-10">
      {/* Alert Modal Overlay */}
      {activeAlert && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 border border-white/20 animate-in zoom-in">
            <div className="flex justify-center mb-6">
              <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center ${
                activeAlert.type === 'CRITICAL' ? 'bg-red-50 text-red-600' :
                activeAlert.type === 'WARNING' ? 'bg-amber-50 text-amber-600' :
                'bg-blue-50 text-blue-600'
              }`}>
                {activeAlert.type === 'CRITICAL' ? <ShieldAlert size={48} /> : 
                 activeAlert.type === 'WARNING' ? <AlertCircle size={48} /> : 
                 <Bell size={48} />}
              </div>
            </div>
            <div className="text-center mb-8">
              <h2 className={`text-2xl font-black uppercase tracking-tighter ${activeAlert.type === 'CRITICAL' ? 'text-red-600' : 'text-slate-900'}`}>
                {activeAlert.title}
              </h2>
              <p className="text-slate-600 mt-4 text-sm leading-relaxed font-medium">
                {activeAlert.message}
              </p>
            </div>
            <button 
              onClick={handleDismissAlert}
              disabled={!activeAlert.dismissible && activeAlert.type === 'CRITICAL'}
              className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 ${
                !activeAlert.dismissible && activeAlert.type === 'CRITICAL' ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-brand-primary text-white shadow-brand-primary/30 hover:brightness-110'
              }`}
            >
              {activeAlert.dismissible || activeAlert.type !== 'CRITICAL' ? 'Acknowledge' : 'Action Required'}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-brand-primary/10 text-brand-primary border border-brand-primary/20 flex items-center justify-center font-black text-2xl uppercase shadow-inner overflow-hidden">
            {user?.profilePicture ? <img src={user.profilePicture} className="w-full h-full object-cover" /> : user?.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Welcome, {user?.name.split(' ')[0]}</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Authorized Employee Access
            </p>
          </div>
        </div>
        <Link to="/portal/complaints" className="flex items-center justify-center gap-2 bg-brand-primary text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-brand-primary/30 hover:scale-105 active:scale-95 transition-all">
          <Plus size={18} /> Raise Ticket
        </Link>
      </div>

      {/* Alert Bar */}
      {alertsBar.length > 0 && (
        <div className="space-y-2">
          {alertsBar.map((alert, i) => (
            <div 
              key={i} 
              onClick={() => alert.path && navigate(alert.path)}
              className={`flex items-center gap-4 p-4 rounded-2xl border animate-in slide-in-from-top-2 cursor-pointer transition-all hover:scale-[1.01] ${
                alert.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                alert.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                alert.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' :
                'bg-blue-50 border-blue-100 text-blue-700'
              }`}
            >
              <alert.icon size={18} className="shrink-0" />
              <p className="text-[11px] font-black uppercase tracking-tight flex-1">{alert.text}</p>
              {alert.path && <ChevronRight size={14} />}
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        <SummaryCard label="Hardware" value={stats.assets} icon={HardDrive} path="/portal/assets" color="bg-indigo-50 text-indigo-600" />
        <SummaryCard label="BYOD" value={user?.assetUsage === AssetUsage.PERSONAL ? (byodStatus === ByodStatus.ACTIVE ? 1 : 0) : 0} icon={Monitor} path="/portal/byod" color="bg-emerald-50 text-emerald-600" />
        <SummaryCard label="Tasks" value={reminders.filter(r => r.status === 'PENDING').length} icon={CheckSquare} path="#" color="bg-brand-primary/10 text-brand-primary" />
        <SummaryCard label="In Repair" value={stats.repairing} icon={Hammer} path="/portal/assets" color="bg-red-50 text-red-600" />
        <SummaryCard label="Tickets" value={stats.activeComplaints} icon={MessageSquare} path="/portal/complaints" color="bg-indigo-50 text-indigo-600" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Assets & Reminders */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Reminders Panel */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                <CheckSquare size={24} className="text-emerald-500" /> My Tasks
              </h2>
            </div>
            <div className="space-y-4">
              {reminders.filter(r => r.status !== 'COMPLETED').map(rem => (
                <div key={rem.id} className="p-5 bg-slate-50 border border-slate-100 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:border-emerald-200">
                  <div className="flex gap-4 items-start">
                    <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${rem.priority === 'HIGH' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      {rem.priority === 'HIGH' ? <AlertCircle size={16} /> : <Info size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{rem.title}</p>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">{rem.description}</p>
                      <div className="flex items-center gap-3 mt-3 text-[10px] font-black uppercase text-slate-400">
                        <span className="flex items-center gap-1"><CalendarIcon size={12}/> {rem.date}</span>
                        <span className="flex items-center gap-1"><Clock size={12}/> {rem.time}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-center">
                    <button onClick={() => updateReminderStatus(rem.id, 'COMPLETED')} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110">Complete</button>
                    <button onClick={() => updateReminderStatus(rem.id, 'SNOOZED')} className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-200">Snooze</button>
                  </div>
                </div>
              ))}
              {reminders.filter(r => r.status !== 'COMPLETED').length === 0 && (
                <p className="text-center py-10 text-slate-300 text-sm italic">All tasks completed. Good job!</p>
              )}
            </div>
          </div>

          {/* Assets Quick View */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">My Inventory</h2>
              <Link to="/portal/assets" className="text-[10px] font-black text-brand-primary uppercase tracking-widest hover:underline">View All</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myAssets.slice(0, 4).map(asset => (
                <div 
                  key={asset.id} 
                  onClick={() => setShowAssetQuickView(asset)}
                  className="p-5 bg-slate-50 rounded-3xl border border-transparent hover:border-brand-primary/20 hover:bg-white transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-brand-primary transition-all shadow-sm">
                      {asset.inventoryCategory === 'MOUSE' ? <MousePointer2 size={24} /> : asset.inventoryCategory === 'ACCESSORY' ? <Briefcase size={24} /> : <HardDrive size={24} />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 uppercase leading-none truncate w-32">{asset.model}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{asset.assetCode}</p>
                    </div>
                  </div>
                </div>
              ))}
              {myAssets.length === 0 && (
                <div className="col-span-2 py-10 text-center text-slate-300 italic text-sm">No assets linked to your profile.</div>
              )}
            </div>
          </div>

          {/* Support Ticket Snapshot */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Recent Tickets</h2>
              <Link to="/portal/complaints" className="text-[10px] font-black text-brand-primary uppercase tracking-widest hover:underline">Support Hub</Link>
            </div>
            <div className="space-y-4">
              {myComplaints.slice(0, 5).map(comp => (
                <div key={comp.id} className="flex items-center justify-between p-5 border border-slate-100 rounded-[2rem] hover:bg-slate-50 transition-all">
                  <div className="flex gap-4 items-center">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${comp.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-primary/5 text-brand-primary'}`}>
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-tight">{comp.subject}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{comp.assetCode} • Updated {new Date(comp.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${comp.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {comp.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          <div className="bg-brand-primary p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <CalendarIcon size={24} />
                <ArrowRight size={18} className="opacity-40 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Corporate Schedule</p>
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-6">Timeline</h3>
              <div className="space-y-4">
                <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Today</p>
                  <p className="text-sm font-bold mt-1 truncate">{db.isHolidayActive() ? 'Public Holiday' : 'Business Day'}</p>
                </div>
                <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Maintenance Window</p>
                  <p className="text-sm font-bold mt-1">{settings.maintenanceMode ? 'ACTIVE NOW' : 'None Scheduled'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Quick View Modal */}
      {showAssetQuickView && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowAssetQuickView(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 border border-white/20 animate-in zoom-in">
            <div className="flex justify-between items-start mb-8">
              <div className="w-16 h-16 bg-brand-primary/10 text-brand-primary rounded-3xl flex items-center justify-center">
                {showAssetQuickView.inventoryCategory === 'MOUSE' ? <MousePointer2 size={32} /> : showAssetQuickView.inventoryCategory === 'ACCESSORY' ? <Briefcase size={32} /> : <HardDrive size={32} />}
              </div>
              <button onClick={() => setShowAssetQuickView(null)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24} /></button>
            </div>
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{showAssetQuickView.model}</h3>
                <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mt-3">Tag: {showAssetQuickView.assetCode}</p>
              </div>
              <div className="grid grid-cols-2 gap-8 border-t border-slate-100 pt-8">
                <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Brand</p><p className="text-sm font-bold text-slate-900">{showAssetQuickView.brand}</p></div>
                <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Category</p><p className="text-sm font-bold text-slate-900">{showAssetQuickView.assetType}</p></div>
                <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Serial Identity</p><p className="text-sm font-mono font-medium text-slate-900 truncate">{showAssetQuickView.serialNumber || 'N/A'}</p></div>
                <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned On</p><p className="text-sm font-bold text-slate-900">{showAssetQuickView.purchaseDate}</p></div>
              </div>
            </div>
            <button onClick={() => setShowAssetQuickView(null)} className="w-full mt-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95">Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalOverview;
