
import React, { useState, useMemo } from 'react';
import { db } from '../../db/mockDb';
import { useAuth } from '../../context/AuthContext';
import { Complaint, ComplaintStatus } from '../../types';
import { Calendar as CalendarIcon, Clock, HardDrive, Info, ShieldAlert, ArrowRight, User as UserIcon, CheckCircle2, ListFilter } from 'lucide-react';

const MyAppointments: React.FC = () => {
  const { user } = useAuth();
  const complaints = db.getComplaints();
  const users = db.getUsers();
  const [activeTab, setActiveTab] = useState<'MY' | 'GLOBAL'>('MY');

  const myAppointments = useMemo(() => {
    return complaints
      .filter(c => c.userId === user?.id && c.appointmentStart && (c.status === ComplaintStatus.IN_PROCESS || c.status === ComplaintStatus.PENDING))
      .sort((a, b) => new Date(a.appointmentStart!).getTime() - new Date(b.appointmentStart!).getTime());
  }, [complaints, user]);

  const globalAppointments = useMemo(() => {
    return complaints
      .filter(c => c.appointmentStart && (c.status === ComplaintStatus.IN_PROCESS || c.status === ComplaintStatus.PENDING))
      .sort((a, b) => new Date(a.appointmentStart!).getTime() - new Date(b.appointmentStart!).getTime());
  }, [complaints]);

  const AppointmentCard = ({ appt, isMyView }: { appt: Complaint, isMyView: boolean }) => {
    const apptUser = users.find(u => u.id === appt.userId);
    const dateObj = new Date(appt.appointmentStart!);
    
    return (
      <div className={`bg-white rounded-[2rem] border transition-all group overflow-hidden ${isMyView ? 'border-brand-primary shadow-xl shadow-indigo-100/50' : 'border-slate-200 hover:border-brand-primary shadow-sm'}`}>
        <div className="flex flex-col md:flex-row">
          <div className={`md:w-32 flex flex-col items-center justify-center p-6 shrink-0 transition-all ${isMyView ? 'bg-brand-primary text-white' : 'bg-slate-50 text-slate-500 group-hover:bg-indigo-50'}`}>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
              {dateObj.toLocaleString('default', { month: 'short' })}
            </span>
            <span className="text-4xl font-black my-1">
              {dateObj.getDate()}
            </span>
            <span className="text-[10px] font-black uppercase tracking-tight flex items-center gap-1">
              <Clock size={10} /> {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          
          <div className="flex-1 p-8 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  {isMyView ? 'My Technical Visit' : `Visit: ${apptUser?.name.split(' ')[0]}`}
                </h3>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="text-brand-primary">#{appt.id}</span>
                  <span>•</span>
                  <span>{appt.assetCode}</span>
                </div>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${appt.status === ComplaintStatus.IN_PROCESS ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                {appt.status.replace('_', ' ')}
              </span>
            </div>
            
            <p className="text-sm text-slate-600 font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100 line-clamp-2 italic">
               "{appt.subject}"
            </p>
            
            <div className="flex flex-wrap items-center gap-6 pt-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <div className="flex items-center gap-2">
                    <UserIcon size={14} className="text-slate-300" />
                    <span>Location: {apptUser?.location || 'Main Office'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-300" />
                    <span>Est. End: {appt.appointmentEnd ? new Date(appt.appointmentEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}</span>
                </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Timeline Console</h1>
          <p className="text-slate-500 font-medium mt-1">Technical availability and scheduled service visits.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-inner w-fit">
          <button 
            onClick={() => setActiveTab('MY')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'MY' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <CalendarIcon size={14}/> My Schedule
          </button>
          <button 
            onClick={() => setActiveTab('GLOBAL')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'GLOBAL' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <ListFilter size={14}/> Global Timeline
          </button>
        </div>
      </div>

      {activeTab === 'MY' && (
        <div className="space-y-8">
          {myAppointments.length > 0 && (
            <div className="bg-indigo-600 text-white p-6 rounded-[2.5rem] flex items-center gap-6 shadow-2xl shadow-indigo-200 animate-in slide-in-from-top-4">
                <div className="w-14 h-14 bg-white/20 rounded-3xl flex items-center justify-center shrink-0">
                    <Info size={28} />
                </div>
                <div>
                    <h2 className="text-lg font-black uppercase tracking-tighter leading-none">Upcoming Appointment Detected</h2>
                    <p className="text-[11px] font-bold opacity-80 mt-2 uppercase tracking-widest">Please ensure your device is available during the scheduled window.</p>
                </div>
                <div className="hidden sm:flex ml-auto items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/10">
                    <Clock size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">On-Time Attendance Required</span>
                </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            {myAppointments.map(appt => (
              <AppointmentCard key={appt.id} appt={appt} isMyView={true} />
            ))}
            {myAppointments.length === 0 && (
              <div className="py-32 text-center bg-white border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-8 text-slate-200">
                  <CalendarIcon size={40} />
                </div>
                <p className="text-slate-500 font-black uppercase tracking-[0.2em]">Zero Scheduled Visits</p>
                <p className="text-sm text-slate-400 mt-4 max-w-sm font-medium leading-relaxed">Appointments will appear here once IT schedules a technician to address your active support tickets.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'GLOBAL' && (
        <div className="space-y-8">
          <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 p-10 opacity-10">
                  <ShieldAlert size={120} />
              </div>
              <div className="relative z-10 max-w-lg">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-2">Technical Awareness</p>
                <h2 className="text-2xl font-black uppercase tracking-tighter mb-4">Organization-wide Timeline</h2>
                <p className="text-sm font-medium opacity-60 leading-relaxed">This view shows the master schedule for the IT technical team. Use this to gauge availability before raising urgent tickets.</p>
              </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {globalAppointments.map(appt => (
              <AppointmentCard key={appt.id} appt={appt} isMyView={false} />
            ))}
            {globalAppointments.length === 0 && (
              <div className="py-24 text-center bg-white border border-slate-200 rounded-[3rem]">
                 <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">System Timeline Clear</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAppointments;
