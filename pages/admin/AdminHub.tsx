
import React from 'react';
import { Link } from 'react-router-dom';
import { Archive, ShieldAlert, ArrowRight, Users, Cog, Monitor } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AdminHub: React.FC = () => {
  const { user } = useAuth();
  const permissions = user?.permissions || {};

  const hasReadPermission = (module: string) => permissions[module]?.read === true;

  const modules = [
    {
      id: 'admins',
      title: "Admin Management",
      subtitle: "Provision and manage system roles",
      icon: Users,
      path: "/admin/admins",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      visible: hasReadPermission('admin')
    },
    {
      id: 'settings',
      title: "System Settings",
      subtitle: "Configure workflow and security logic",
      icon: Cog,
      path: "/admin/settings",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      visible: hasReadPermission('settings')
    },
    {
      id: 'byod',
      title: "BYOD Oversight",
      subtitle: "Manage personal device utilization",
      icon: Monitor,
      path: "/admin/byod",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      visible: hasReadPermission('byod')
    },
    {
      id: 'rar',
      title: "Archived Assets",
      subtitle: "Formal decommissioned audit register",
      icon: Archive,
      path: "/admin/rar",
      color: "text-brand-primary",
      bgColor: "bg-indigo-50",
      visible: hasReadPermission('rar')
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-slate-900 text-white rounded-lg">
            <ShieldAlert size={20} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tighter">Admin Hub</h1>
        </div>
        <p className="text-slate-500 text-sm max-w-2xl font-medium">
          Advanced system configuration, audit registers, and decommissioning workflows.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {modules.filter(m => m.visible).map((module) => (
          <Link
            key={module.id}
            to={module.path}
            className="group bg-white p-8 rounded-[2rem] border border-slate-200 hover:border-brand-primary hover:shadow-lg transition-all duration-200 flex flex-col items-start"
          >
            <div className={`w-12 h-12 ${module.bgColor} ${module.color} rounded-2xl flex items-center justify-center mb-6 shadow-inner`}>
              <module.icon size={24} />
            </div>
            
            <h3 className="text-lg font-black text-slate-900 mb-2 uppercase tracking-tight">
              {module.title}
            </h3>
            
            <p className="text-[13px] text-slate-500 mb-8 leading-relaxed font-medium">
              {module.subtitle}
            </p>

            <div className="mt-auto flex items-center gap-2 text-brand-primary font-black uppercase text-[10px] tracking-widest">
              Open Module <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminHub;
