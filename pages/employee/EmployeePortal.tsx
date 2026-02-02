
import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db/mockDb';
import { LayoutDashboard, HardDrive, MessageSquare, LogOut, Terminal, Menu, X, Settings2, ShieldCheck, Key, Loader2, ShieldAlert, Monitor, Hammer, Calendar, MessageCircle } from 'lucide-react';
import PortalOverview from './PortalOverview';
import MyAssets from './MyAssets';
import MyComplaints from './MyComplaints';
import Profile from './Profile';
import SystemTools from './SystemTools';
import MyServices from './MyServices';
import ByodModule from './ByodModule';
import MyAppointments from './MyAppointments';
import EmployeeChat from './EmployeeChat';
import { AssetUsage, AppSettings } from '../../types';

const EmployeePortal: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  useEffect(() => {
    if (user) db.updateLastActive(user.id);
    const interval = setInterval(() => {
        setSettings(db.getSettings());
        if (user) {
            db.updateLastActive(user.id);
            const count = db.getMessages().filter(m => m.receiverId === user.id && !m.isRead).length;
            setUnreadMsgs(count);
        }
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const navItems = useMemo(() => {
    return [
        { label: 'Overview', icon: LayoutDashboard, path: '/portal' },
        { label: 'My Hardware', icon: HardDrive, path: '/portal/assets' },
        { label: 'Timeline', icon: Calendar, path: '/portal/calendar' },
        { label: 'IT Inbox', icon: MessageCircle, path: '/portal/chat', badge: unreadMsgs },
        { label: 'BYOD', icon: Monitor, path: '/portal/byod' },
        { label: 'Support', icon: MessageSquare, path: '/portal/complaints' },
        { label: 'History', icon: Settings2, path: '/portal/services' },
        { label: 'Resources', icon: Terminal, path: '/portal/tools' },
    ];
  }, [user, unreadMsgs]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const NavItem = ({ item }: { item: any }) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        onClick={() => setIsMobileMenuOpen(false)}
        className={`flex items-center gap-3 px-6 py-2.5 transition-all duration-150 group border-l-4 ${
          isActive 
            ? 'bg-indigo-50 border-brand-primary text-brand-primary font-semibold' 
            : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <item.icon size={18} className={isActive ? 'text-brand-primary' : 'text-slate-400 group-hover:text-slate-600'} />
        <span className="text-[13px] uppercase tracking-wide font-bold flex-1">{item.label}</span>
        {item.badge > 0 && (
          <span className="w-5 h-5 bg-brand-primary text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  const NavContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 shadow-sm">
      <div className="p-6 mb-4 flex items-center gap-3">
        <div className="bg-indigo-50 p-2 rounded-lg">
          <ShieldCheck className="text-brand-primary" size={24} />
        </div>
        <span className="text-lg font-bold text-slate-900 tracking-tight">IT Portal</span>
      </div>
      
      <nav className="flex-1 overflow-y-auto no-scrollbar py-2">
        <p className="px-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">My Account</p>
        {navItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <Link to="/portal/profile" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-all rounded-lg mb-2 group">
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-brand-primary font-bold text-xs uppercase overflow-hidden">
            {user?.profilePicture ? <img src={user.profilePicture} className="w-full h-full object-cover" /> : user?.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate uppercase">{user?.name}</p>
            <p className="text-[10px] text-slate-500 font-medium">Profile Settings</p>
          </div>
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all rounded-lg">
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  );

  // Maintenance Lockdown View
  if (settings.maintenanceMode) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
              <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-200 max-w-lg w-full text-center space-y-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-brand-primary" />
                  <div className="w-24 h-24 bg-indigo-50 text-brand-primary rounded-[2rem] flex items-center justify-center mx-auto shadow-inner group">
                    <Hammer size={48} className="animate-bounce" />
                  </div>
                  <div className="space-y-3">
                      <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Under Maintenance</h1>
                      <p className="text-slate-500 font-medium text-sm leading-relaxed uppercase tracking-tight">The IT Portal is currently undergoing technical optimization. Access is temporarily restricted to ensure data integrity.</p>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 text-left">
                      <ShieldAlert size={20} className="text-indigo-600 shrink-0" />
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-normal">Administrator privileges remain active. Please contact IT Support via corporate email for urgent hardware requests.</p>
                  </div>
                  <button onClick={handleLogout} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all active:scale-95 shadow-xl">
                      Secure Logout
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex bg-brand-surface">
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0">
        <NavContent />
      </aside>

      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-white text-brand-primary rounded-lg shadow-md border border-slate-200">
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64">
            <NavContent />
          </aside>
        </div>
      )}

      <main className="flex-1 overflow-y-auto no-scrollbar relative">
        {/* Persistent Holiday Banner */}
        {settings.holidaySettings.enabled && (
            <div className="sticky top-0 z-[100] w-full bg-indigo-600 text-white py-3 px-6 flex items-center justify-center gap-3 shadow-lg animate-in slide-in-from-top duration-500">
                <Calendar size={18} className="shrink-0" />
                <p className="text-[11px] font-black uppercase tracking-[0.1em]">{settings.holidaySettings.message || "Holiday Mode Active: Technical response times may vary."}</p>
                <div className="hidden sm:block h-4 w-px bg-white/20 mx-2" />
                <span className="hidden sm:block text-[9px] font-bold uppercase opacity-80">Support Limited</span>
            </div>
        )}

        <div className="p-4 lg:p-10 max-w-6xl mx-auto min-h-screen">
          <Routes>
            <Route index element={<PortalOverview />} />
            <Route path="assets" element={<MyAssets />} />
            <Route path="byod" element={<ByodModule />} />
            <Route path="calendar" element={<MyAppointments />} />
            <Route path="chat" element={<EmployeeChat />} />
            <Route path="services" element={<MyServices />} />
            <Route path="complaints" element={<MyComplaints />} />
            <Route path="profile" element={<Profile />} />
            <Route path="tools" element={<SystemTools />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default EmployeePortal;
