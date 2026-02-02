
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { ShieldCheck, User as UserIcon, LogIn, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const role = await login(email, password);
    if (role) {
      navigate(role === UserRole.ADMIN ? '/admin' : '/portal');
    } else {
      setError('Invalid email or password');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-brand-primary flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Brand Background */}
      <div className="absolute top-0 left-0 w-full h-1 bg-brand-secondary z-50"></div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 border border-white/5 animate-in fade-in zoom-in duration-500 relative z-10">
        <div className="text-center mb-10">
          <div className="mx-auto w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-brand-primary/20 bg-brand-primary text-white">
            <UserIcon size={36} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Support Central</h1>
          <p className="text-slate-500 mt-2 font-medium">Secure Employee Access</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 animate-in slide-in-from-top-2">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Corporate Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none font-medium text-slate-900 placeholder:text-slate-300 shadow-sm"
              placeholder="name@themediaant.com"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none font-medium text-slate-900 placeholder:text-slate-300 shadow-sm"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-white transition-all shadow-2xl shadow-brand-primary/30 active:scale-[0.97] mt-8 uppercase tracking-widest ${loading ? 'opacity-70 cursor-not-allowed' : 'bg-brand-primary hover:bg-brand-primary/90'}`}
          >
            {loading ? 'Authenticating...' : <><LogIn size={20} /> Authorize Login</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
