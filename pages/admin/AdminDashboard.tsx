
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Users, HardDrive, MessageSquare, LogOut, Menu, X, Settings2, ShieldCheck, Calendar, Terminal, ShieldAlert, ChevronRight, Bell, CheckSquare, Monitor, MessageCircle } from 'lucide-react';
import AdminOverview from './AdminOverview';
import EmployeeManagement from './EmployeeManagement';
import AssetManagement from './AssetManagement';
import ComplaintManagement from './ComplaintManagement';
import AssetServices from './AssetServices';
import AdminSettings from './AdminSettings';
import CalendarModule from './CalendarModule';
import HelpToolsManager from './HelpToolsManager'; 
import RemovedAssetsRegister from './RemovedAssetsRegister';
import AdminHub from './AdminHub';
import AdminManagement from './AdminManagement';
import AlertManagement from './AlertManagement';
import ReminderManagement from './ReminderManagement';
import ByodManagement from './ByodManagement';
import AdminChat from './AdminChat';
import { db } from '../../db/mockDb';
import { ComplaintStatus, AdminRole } from '../../types';

const AdminDashboard: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [newComplaintsCount, setNewComplaintsCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    if (user) db.updateLastActive(user.id);
    const interval = setInterval(() => {
      if (user) db.updateLastActive(user.id);
      
      const complaints = db.getComplaints().filter(c => c.status === ComplaintStatus.NEW).length;
      setNewComplaintsCount(complaints);

      const unreadMsgs = db.getMessages().filter(m => m.receiverId === user?.id && !m.isRead).length;
      setUnreadChatCount(unreadMsgs);
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const permissions = user?.permissions || {};
  const hasReadPermission = (module: string) => permissions[module]?.read === true;

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin', visible: hasReadPermission('dashboard') },
    { label: 'Employees', icon: Users, path: '/admin/employees', visible: hasReadPermission('employees') },
    { label: 'Assets', icon: HardDrive, path: '/admin/assets', visible: hasReadPermission('assets') },
    { label: 'Services', icon: Settings2, path: '/admin/services', visible: hasReadPermission('services') },
    { label: 'Complaints', icon: MessageSquare, path: '/admin/complaints', visible: hasReadPermission('complaints') },
    { label: 'Support Chat', icon: MessageCircle, path: '/admin/chat', visible: hasReadPermission('chat') },
    { label: 'Alerts', icon: Bell, path: '/admin/alerts', visible: hasReadPermission('alerts') },
    { label: 'Reminders', icon: CheckSquare, path: '/admin/reminders', visible: hasReadPermission('reminders') },
    { label: 'Calendar', icon: Calendar, path: '/admin/calendar', visible: hasReadPermission('calendar') },
    { label: 'Tools Manager', icon: Terminal, path: '/admin/tools-manager', visible: hasReadPermission('tools_manager') },
  ];

  const adminPortalItem = { label: 'Admin Hub', icon: ShieldAlert, path: '/admin/hub' };
  const canAccessAdminHub = hasReadPermission('admin') || hasReadPermission('rar') || hasReadPermission('settings');

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
        <item.icon size={20} className={isActive ? 'text-brand-primary' : 'text-slate-400 group-hover:text-slate-600'} />
        <span className="text-[14px] flex-1">{item.label}</span>
        {item.label === 'Complaints' && newComplaintsCount > 0 && (
          <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {newComplaintsCount}
          </span>
        )}
        {item.label === 'Support Chat' && unreadChatCount > 0 && (
          <span className="w-5 h-5 bg-brand-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadChatCount}
          </span>
        )}
      </Link>
    );
  };

  const NavContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="p-6 mb-2 flex items-center gap-3">
        <div className="bg-indigo-50 p-2 rounded-lg">
          <ShieldCheck className="text-brand-primary" size={24} />
        </div>
        <span className="text-lg font-bold text-slate-900 tracking-tight">Admin Console</span>
      </div>
      
      <nav className="flex-1 py-4 overflow-y-auto no-scrollbar">
        <p className="px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Navigation</p>
        {navItems.filter(i => i.visible).map((item) => (
          <NavItem key={item.path} item={item} />
        ))}

        {canAccessAdminHub && (
          <div className="mt-8">
            <p className="px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Management</p>
            <NavItem item={adminPortalItem} />
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="px-4 py-3 flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs uppercase overflow-hidden">
            {user?.profilePicture ? <img src={user.profilePicture} className="w-full h-full object-cover" /> : user?.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate uppercase">{user?.name}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.adminRole?.replace('_', ' ')}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all rounded-lg font-medium">
          <LogOut size={18} /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0 shadow-sm">
        <NavContent />
      </aside>

      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white text-brand-primary rounded-lg shadow-md border border-slate-200"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64">
            <NavContent />
          </aside>
        </div>
      )}

      <main className="flex-1 bg-brand-surface overflow-y-auto min-w-0">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <Routes>
            <Route index element={hasReadPermission('dashboard') ? <AdminOverview /> : <Navigate to="/admin/hub" replace />} />
            <Route path="hub" element={canAccessAdminHub ? <AdminHub /> : <Navigate to="/admin" replace />} />
            <Route path="admins" element={hasReadPermission('admin') ? <AdminManagement /> : <Navigate to="/admin/hub" replace />} />
            <Route path="employees" element={hasReadPermission('employees') ? <EmployeeManagement /> : <Navigate to="/admin" replace />} />
            <Route path="assets" element={hasReadPermission('assets') ? <AssetManagement /> : <Navigate to="/admin" replace />} />
            <Route path="rar" element={hasReadPermission('rar') ? <RemovedAssetsRegister /> : <Navigate to="/admin/hub" replace />} />
            <Route path="byod" element={hasReadPermission('byod') ? <ByodManagement /> : <Navigate to="/admin" replace />} />
            <Route path="services" element={hasReadPermission('services') ? <AssetServices /> : <Navigate to="/admin" replace />} />
            <Route path="complaints" element={hasReadPermission('complaints') ? <ComplaintManagement /> : <Navigate to="/admin" replace />} />
            <Route path="chat" element={hasReadPermission('chat') ? <AdminChat /> : <Navigate to="/admin" replace />} />
            <Route path="calendar" element={hasReadPermission('calendar') ? <CalendarModule /> : <Navigate to="/admin" replace />} />
            <Route path="tools-manager" element={hasReadPermission('tools_manager') ? <HelpToolsManager /> : <Navigate to="/admin" replace />} />
            <Route path="settings" element={hasReadPermission('settings') ? <AdminSettings /> : <Navigate to="/admin/hub" replace />} />
            <Route path="alerts" element={hasReadPermission('alerts') ? <AlertManagement /> : <Navigate to="/admin" replace />} />
            <Route path="reminders" element={hasReadPermission('reminders') ? <ReminderManagement /> : <Navigate to="/admin" replace />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
