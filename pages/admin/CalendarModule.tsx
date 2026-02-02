
import React, { useMemo } from 'react';
import { db } from '../../db/mockDb';
import { Complaint, ComplaintStatus } from '../../types';
// Add CheckCircle2 to the imports
import { Calendar as CalendarIcon, Clock, User, HardDrive, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';

const CalendarModule: React.FC = () => {
  const complaints = db.getComplaints();
  const settings = db.getSettings();
  const users = db.getUsers();
  
  const appointments = useMemo(() => {
    return complaints
      .filter(c => c.appointmentStart && (c.status === ComplaintStatus.IN_PROCESS || c.status === ComplaintStatus.PENDING))
      .sort((a, b) => new Date(a.appointmentStart!).getTime() - new Date(b.appointmentStart!).getTime());
  }, [complaints]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Technical Timeline</h1>
        <p className="text-slate-600 text-sm">Real-time schedule for technical visits and active resolution windows.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarIcon size={18} className="text-brand-primary" />
            <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Active Schedule</h2>
          </div>
          
          {appointments.length > 0 ? appointments.map(appt => (
            <div key={appt.id} className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col sm:flex-row gap-6 hover:shadow-md transition-all group">
              <div className="sm:w-28 flex flex-col items-center justify-center bg-slate-50 border border-slate-100 rounded-lg p-4 shrink-0 transition-all">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  {new Date(appt.appointmentStart!).toLocaleString('default', { month: 'short' })}
                </span>
                <span className="text-3xl font-bold text-slate-900 my-0.5">
                  {new Date(appt.appointmentStart!).getDate()}
                </span>
                <span className="text-[10px] font-bold text-brand-primary uppercase tracking-tight">
                  {new Date(appt.appointmentStart!).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
              
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-lg group-hover:text-brand-primary transition-colors">
                    Complaint In Process – {users.find(u => u.id === appt.userId)?.name}
                  </h3>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${appt.status === ComplaintStatus.IN_PROCESS ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                    {appt.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <HardDrive size={12} className="text-slate-300" /> Inventory Unit
                      </p>
                      <p className="text-slate-900 text-sm font-semibold">{appt.assetCode}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Clock size={12} className="text-slate-300" /> Expected End
                      </p>
                      <p className="text-slate-900 text-sm font-semibold">
                        {appt.appointmentEnd ? new Date(appt.appointmentEnd).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : 'TBD'}
                      </p>
                   </div>
                </div>
                <div className="pt-2 border-t border-slate-100">
                   <p className="text-[11px] text-slate-500 font-medium">Subject: <span className="text-slate-800">{appt.subject}</span></p>
                </div>
              </div>
            </div>
          )) : (
            <div className="p-20 text-center bg-white rounded-xl border border-dashed border-slate-200">
              <CalendarIcon size={40} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">No active technical windows scheduled.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden relative">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Shield size={18} className="text-brand-primary" /> System Blockers
            </h3>
            <div className="space-y-4">
              {settings.holidaySettings.enabled ? (
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-red-600 mb-1">Holiday Locked</p>
                  <p className="text-sm font-bold text-slate-900 leading-tight">
                    {settings.holidaySettings.startDate} — {settings.holidaySettings.endDate}
                  </p>
                  <p className="text-[11px] text-red-500 mt-2 font-medium italic">"{settings.holidaySettings.message}"</p>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-xs font-bold uppercase tracking-tight flex items-center gap-2">
                  <CheckCircle2 size={16} /> All systems operational
                </div>
              )}
              
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Service Statistics</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-2xl font-bold text-slate-900 leading-none">{appointments.length}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight mt-1">Pending Visits</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-2xl font-bold text-slate-900 leading-none">
                      {complaints.filter(c => c.status === ComplaintStatus.CLOSED).length}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight mt-1">Total Resolved</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarModule;
