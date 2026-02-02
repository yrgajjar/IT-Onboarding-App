
import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../../db/mockDb';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, HardDrive, MessageSquare, CheckCircle2, AlertCircle, 
  Clock, ArrowRight, Plus, UserPlus, Settings2, ShieldAlert, 
  Archive, Calendar as CalendarIcon, Hammer, Info, Power, 
  AlertTriangle, MousePointer2, Briefcase, Bell, CheckSquare, Monitor
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from 'recharts';
import { ComplaintStatus, AssetStatus, UserRole, AdminRole, ByodStatus } from '../../types';

const AdminOverview: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const users = db.getUsers();
  const assets = db.getAssets();
  const complaints = db.getComplaints();
  const settings = db.getSettings();
  const auditLogs = db.getAuditLogs();
  const byod = db.getByodEntries();
  
  const permissions = user?.permissions || {};
  const hasPermission = (module: string, type: 'read' | 'write' | 'update') => permissions[module]?.[type] === true;

  const stats = useMemo(() => {
    const employeeCount = users.filter(u => u.role === UserRole.EMPLOYEE).length;
    const activeAssets = assets.filter(a => a.status !== AssetStatus.REMOVED);
    const assignedAssets = activeAssets.filter(a => a.status === AssetStatus.ASSIGNED).length;
    const repairingAssets = activeAssets.filter(a => a.status === AssetStatus.UNDER_REPAIR).length;
    
    const now = new Date().toISOString();
    const activeAlerts = db.getAlerts().filter(a => a.validFrom <= now && a.validTill >= now).length;
    const pendingReminders = db.getReminders().filter(r => r.status === 'PENDING').length;

    const activeByod = byod.filter(e => e.status === ByodStatus.ACTIVE).length;
    const retrievedByod = byod.filter(e => e.status === ByodStatus.RETRIEVED_BY_EMPLOYEE || e.status === ByodStatus.RETRIEVED_BY_ADMIN).length;

    return {
      employees: { total: employeeCount },
      hardware: activeAssets.filter(a => a.inventoryCategory === 'ASSET').length,
      mouse: activeAssets.filter(a => a.inventoryCategory === 'MOUSE').length,
      accessories: activeAssets.filter(a => a.inventoryCategory === 'ACCESSORY').length,
      assigned: assignedAssets,
      repairing: repairingAssets,
      activeAlerts,
      pendingReminders,
      activeByod,
      retrievedByod,
      complaints: {
        new: complaints.filter(c => c.status === ComplaintStatus.NEW).length,
        pending: complaints.filter(c => c.status === ComplaintStatus.PENDING).length,
        inProcess: complaints.filter(c => c.status === ComplaintStatus.IN_PROCESS).length,
        closed: complaints.filter(c => c.status === ComplaintStatus.CLOSED).length,
      }
    };
  }, [users, assets, complaints, byod]);

  const alerts = useMemo(() => {
    const list = [];
    if (stats.complaints.new > 0) {
      list.push({ 
        type: 'error', 
        message: `${stats.complaints.new} New support tickets require immediate attention.`,
        icon: AlertCircle,
        path: '/admin/complaints?status=NEW'
      });
    }
    
    const longRepairs = assets.filter(a => a.status === AssetStatus.UNDER_REPAIR).length;
    if (longRepairs > 0) {
        list.push({ 
          type: 'warning', 
          message: `${longRepairs} units are currently undergoing technical servicing.`,
          icon: Hammer,
          path: '/admin/assets'
        });
    }

    if (settings.maintenanceMode) {
      list.push({ type: 'info', message: 'System Maintenance Mode is currently active.', icon: Power });
    }
    if (db.isHolidayActive()) {
      list.push({ type: 'success', message: 'System is currently in Holiday Mode.', icon: Info });
    }
    return list;
  }, [stats, settings, assets]);

  const StatCard = ({ label, val, icon: Icon, path, color }: any) => (
    <Link 
      to={path}
      className="bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-md transition-all group shrink-0"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-2xl font-black text-slate-900 leading-none">{val}</p>
        </div>
        <div className={`p-2 rounded-xl bg-slate-50 ${color} shadow-inner`}>
          <Icon size={18} />
        </div>
      </div>
    </Link>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">System Dashboard</h1>
          <p className="text-slate-600 text-sm font-medium">Infrastructure pulse and technical oversight.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-100">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider">Cloud Connected</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 overflow-x-auto no-scrollbar pb-2">
        <StatCard label="Employees" val={stats.employees.total} icon={Users} path="/admin/employees" color="text-indigo-600" />
        <StatCard label="Hardware" val={stats.hardware} icon={HardDrive} path="/admin/assets" color="text-brand-primary" />
        <StatCard label="BYOD Actv" val={stats.activeByod} icon={Monitor} path="/admin/byod" color="text-emerald-600" />
        <StatCard label="Alerts" val={stats.activeAlerts} icon={Bell} path="/admin/alerts" color="text-amber-600" />
        <StatCard label="Tasks" val={stats.pendingReminders} icon={CheckSquare} path="/admin/reminders" color="text-indigo-600" />
        <StatCard label="Tickets" val={stats.complaints.new} icon={AlertCircle} path="/admin/complaints" color="text-red-600" />
        <StatCard label="Resolved" val={stats.complaints.closed} icon={CheckCircle2} path="/admin/complaints" color="text-emerald-500" />
      </div>

      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, i) => (
            <div 
              key={i} 
              className={`flex items-center gap-3 p-4 text-[13px] font-bold border rounded-2xl ${
                alert.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' :
                alert.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800' :
                'bg-blue-50 border-blue-100 text-blue-800'
              }`}
            >
              <alert.icon size={18} className="shrink-0" />
              <p className="flex-1 text-slate-900 uppercase tracking-tight">{alert.message}</p>
              {alert.path && (
                <button 
                  onClick={() => navigate(alert.path)}
                  className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest text-slate-700 shadow-sm"
                >
                  Inspect
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-6 border-b pb-4">Inventory Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'TMA Hardware', value: stats.hardware, color: '#7635f8' },
                      { name: 'Active BYOD', value: stats.activeByod, color: '#10b981' },
                      { name: 'Addons', value: stats.accessories, color: '#f59e0b' },
                    ]}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                  >
                    {[0, 1, 2].map((i) => (
                      <Cell key={i} fill={['#7635f8', '#10b981', '#f59e0b'][i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" align="center" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-6 border-b pb-4">Ticket Flow Stats</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'New', count: stats.complaints.new },
                  { name: 'Pending', count: stats.complaints.pending },
                  { name: 'Active', count: stats.complaints.inProcess },
                  { name: 'Closed', count: stats.complaints.closed },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F4" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontBold: 'bold', fill: '#5F6368' }} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: '#F8F9FA' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={32}>
                    <Cell fill="#EA4335" /><Cell fill="#FBBC04" /><Cell fill="#4285F4" /><Cell fill="#34A853" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[550px]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Clock size={16} className="text-brand-primary" /> Active Audit
              </h3>
              <Link to="/admin/hub" className="text-[9px] font-black text-brand-primary uppercase hover:underline tracking-widest">Registry</Link>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {auditLogs.slice(0, 15).map((log) => (
                <div key={log.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all text-[13px]">
                  <p className="font-black text-slate-900 mb-1 leading-tight uppercase tracking-tight">{log.action.replace(/_/g, ' ')}</p>
                  <p className="text-slate-500 font-medium line-clamp-2 leading-relaxed mb-3">{log.details}</p>
                  <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-700">{log.performedByName.split(' ')[0]}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
