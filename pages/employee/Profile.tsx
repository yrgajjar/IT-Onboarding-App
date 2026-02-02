
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db/mockDb';
import { User, Key, User as UserIcon, CheckCircle2, ShieldAlert, Lock, Mail, AlertTriangle, ShieldCheck, Camera, Upload, Trash2, Building2, MapPin, BadgeInfo, Laptop } from 'lucide-react';
import { AppSettings, AssetUsage } from '../../types';

const Profile: React.FC = () => {
  const { user, updateCurrentUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSettings(db.getSettings());
  }, []);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const allUsers = db.getUsers();
    
    if (name !== user?.name && !settings.allowNameChange) {
      alert('Name change is restricted by IT policy.');
      setName(user?.name || '');
      return;
    }

    const isEmailChanged = email !== user?.email;
    if (isEmailChanged && !settings.allowEmployeeEmailChange) {
      alert('Email change is restricted by IT policy.');
      setEmail(user?.email || '');
      return;
    }

    const updated = allUsers.map(u => u.id === user?.id ? { 
      ...u, 
      name: settings.allowNameChange ? name : u.name, 
      email: settings.allowEmployeeEmailChange ? email : u.email,
      lastUpdated: new Date().toISOString() 
    } : u);
    
    db.saveUsers(updated);
    updateCurrentUser({ name: settings.allowNameChange ? name : user?.name, email: settings.allowEmployeeEmailChange ? email : user?.email });
    setSuccessMsg('Global Profile Synchronized!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings.allowEmployeePasswordChange) return;

    if (passwords.new !== passwords.confirm) {
      alert('New passwords do not match!');
      return;
    }
    const allUsers = db.getUsers();
    const userInDb = allUsers.find(u => u.id === user?.id);
    if (userInDb?.password !== passwords.current) {
      alert('Current password incorrect!');
      return;
    }
    
    const updated = allUsers.map(u => u.id === user?.id ? { ...u, password: passwords.new, lastUpdated: new Date().toISOString() } : u);
    db.saveUsers(updated);
    setPasswords({ current: '', new: '', confirm: '' });
    setSuccessMsg('Security Credentials Updated!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings.allowProfilePictureUpdate) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('Unsupported format. Please upload JPG or PNG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('File too large. Max size is 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const allUsers = db.getUsers();
      const updated = allUsers.map(u => u.id === user?.id ? { ...u, profilePicture: base64String, lastUpdated: new Date().toISOString() } : u);
      db.saveUsers(updated);
      updateCurrentUser({ profilePicture: base64String });
      setSuccessMsg('Avatar updated!');
      setTimeout(() => setSuccessMsg(''), 3000);
    };
    reader.readAsDataURL(file);
  };

  const removeProfilePic = () => {
    if (!settings.allowProfilePictureUpdate) return;
    const allUsers = db.getUsers();
    const updated = allUsers.map(u => u.id === user?.id ? { ...u, profilePicture: undefined, lastUpdated: new Date().toISOString() } : u);
    db.saveUsers(updated);
    updateCurrentUser({ profilePicture: undefined });
    setSuccessMsg('Avatar removed!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const RestrictionAlert = () => (
    <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4 items-center animate-in slide-in-from-top-2">
      <ShieldAlert size={18} className="text-amber-600 shrink-0" />
      <p className="text-[10px] font-black text-amber-700 leading-tight uppercase tracking-widest">
        Settings have been disabled by Admin. Please contact Admin or raise a complaint.
      </p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Identity & Security</h1>
          <p className="text-slate-500 font-medium mt-1">Manage portal credentials and profile visualization.</p>
        </div>
      </div>

      {successMsg && (
        <div className="p-6 bg-emerald-600 text-white rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top-4 shadow-2xl shadow-emerald-200">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <p className="font-black uppercase text-xs tracking-widest leading-none">{successMsg}</p>
        </div>
      )}

      {/* Profile Visualization */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10">
        <div className="flex flex-col sm:flex-row items-center gap-10">
          <div className="relative group">
            <div className="w-40 h-40 rounded-[3rem] bg-slate-50 border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden ring-1 ring-slate-100">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={64} className="text-slate-200" />
              )}
            </div>
            {settings.allowProfilePictureUpdate && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 bg-brand-primary text-white p-4 rounded-2xl shadow-xl hover:scale-110 transition-transform active:scale-95"
              >
                <Camera size={20} />
              </button>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Avatar Control</h3>
            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">Identity visualization across technical dashboard.</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-6">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={!settings.allowProfilePictureUpdate}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${settings.allowProfilePictureUpdate ? 'bg-brand-primary text-white hover:bg-brand-primary/90' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
                <Upload size={16} /> Choose Frame
              </button>
              {user?.profilePicture && settings.allowProfilePictureUpdate && (
                <button 
                  onClick={removeProfilePic}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                >
                  <Trash2 size={16} /> Reset
                </button>
              )}
            </div>
            {!settings.allowProfilePictureUpdate && <RestrictionAlert />}
          </div>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/jpeg,image/png" />
      </div>

      {/* Employment Details (Read Only) */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-2xl">
              <BadgeInfo size={20} />
            </div>
            <h2 className="font-black text-slate-900 uppercase tracking-tighter">Employment Assignment</h2>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1.5"><Lock size={10} /> Read Only</span>
        </div>
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Department</p>
              <div className="flex items-center gap-3 p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] shadow-inner">
                <Building2 size={20} className="text-slate-300" />
                <span className="text-base font-black text-slate-900 uppercase tracking-tight">{user?.department || 'Not Registered'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Location</p>
              <div className="flex items-center gap-3 p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] shadow-inner">
                <MapPin size={20} className="text-slate-300" />
                <span className="text-base font-black text-slate-900 uppercase tracking-tight">{user?.location || 'Not Registered'}</span>
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Inventory Utilization Mode</p>
              <div className={`flex items-center gap-3 p-5 rounded-[1.5rem] shadow-inner border ${user?.assetUsage === AssetUsage.PERSONAL ? 'bg-amber-50 border-amber-100' : 'bg-indigo-50 border-indigo-100'}`}>
                {user?.assetUsage === AssetUsage.PERSONAL ? <Laptop size={20} className="text-amber-500" /> : <Building2 size={20} className="text-indigo-500" />}
                <span className={`text-base font-black uppercase tracking-tight ${user?.assetUsage === AssetUsage.PERSONAL ? 'text-amber-700' : 'text-indigo-700'}`}>{user?.assetUsage}</span>
              </div>
            </div>
        </div>
      </div>

      {/* Personal Identity Fields */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-2xl">
              <UserIcon size={20} />
            </div>
            <h2 className="font-black text-slate-900 uppercase tracking-tighter">Identity Details</h2>
          </div>
        </div>
        <form onSubmit={handleUpdateProfile} className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">Full Legal Name</label>
              <input 
                type="text" 
                value={name}
                disabled={!settings.allowNameChange}
                onChange={e => setName(e.target.value)}
                className={`w-full px-6 py-4 rounded-2xl border outline-none transition-all text-sm font-bold shadow-inner ${!settings.allowNameChange ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed' : 'border-slate-200 focus:ring-2 focus:ring-brand-primary'}`}
              />
              {!settings.allowNameChange && <RestrictionAlert />}
            </div>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">Corporate Identity (Email)</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="email" 
                  value={email}
                  disabled={!settings.allowEmployeeEmailChange}
                  onChange={e => setEmail(e.target.value)}
                  className={`w-full pl-14 pr-6 py-4 rounded-2xl border outline-none transition-all text-sm font-bold shadow-inner ${!settings.allowEmployeeEmailChange ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed' : 'border-slate-200 focus:ring-2 focus:ring-brand-primary'}`}
                />
              </div>
              {!settings.allowEmployeeEmailChange && <RestrictionAlert />}
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={!settings.allowNameChange && !settings.allowEmployeeEmailChange}
              className="bg-brand-primary hover:bg-brand-primary/90 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-brand-primary/30 active:scale-95 disabled:opacity-40"
            >
              Commit Changes
            </button>
          </div>
        </form>
      </div>

      {/* Security Credentials */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-2xl">
              <Key size={20} />
            </div>
            <h2 className="font-black text-slate-900 uppercase tracking-tighter">Credential Update</h2>
          </div>
        </div>
        
        <div className="p-10">
          {settings.allowEmployeePasswordChange ? (
            <form onSubmit={handleChangePassword} className="space-y-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">Active System Password</label>
                <input 
                  required
                  type="password" 
                  value={passwords.current}
                  onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary text-sm font-bold shadow-inner"
                  placeholder="Verify your existing credential"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">New Secure String</label>
                  <input 
                    required
                    type="password" 
                    value={passwords.new}
                    onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary text-sm font-bold shadow-inner"
                    placeholder="New password"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">Repeat String</label>
                  <input 
                    required
                    type="password" 
                    value={passwords.confirm}
                    onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary text-sm font-bold shadow-inner"
                    placeholder="Confirm password"
                  />
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" className="bg-slate-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl active:scale-95">
                  Update Authorization
                </button>
              </div>
            </form>
          ) : (
            <div className="py-10 text-center space-y-8">
              <div className="w-24 h-24 bg-brand-primary/5 rounded-[2rem] flex items-center justify-center mx-auto ring-1 ring-brand-primary/10">
                <Lock size={40} className="text-brand-primary" />
              </div>
              <div className="space-y-4">
                <p className="text-xl font-black text-brand-primary uppercase tracking-tighter">Credential Lock Active</p>
                <p className="text-sm text-slate-500 max-w-sm mx-auto font-medium">
                  Manual password modification is restricted by global IT policy. Please raise a ticket for assistance.
                </p>
              </div>
              <RestrictionAlert />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
