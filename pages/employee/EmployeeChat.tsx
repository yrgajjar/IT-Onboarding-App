
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../db/mockDb';
import { useAuth } from '../../context/AuthContext';
import { User, ChatMessage, UserRole } from '../../types';
import { Send, MessageCircle, MoreVertical, Paperclip, Smile, ShieldCheck, Clock, Check, CheckCheck, Loader2 } from 'lucide-react';

const EmployeeChat: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [admins, setAdmins] = useState<User[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const refreshData = () => {
    const allMsgs = db.getMessages();
    const allUsers = db.getUsers();
    setAdmins(allUsers.filter(u => u.role === UserRole.ADMIN));
    
    setMessages(allMsgs);

    if (user) {
      const unread = allMsgs.filter(m => m.receiverId === user.id && !m.isRead);
      if (unread.length > 0) {
        const updated = allMsgs.map(m => m.receiverId === user.id ? { ...m, isRead: true } : m);
        db.saveMessages(updated);
      }
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !user) return;

    // Send to first active super admin by default, or just any admin
    const targetAdmin = admins.find(a => a.id === 'admin-1') || admins[0];

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: user.id,
      receiverId: targetAdmin.id,
      text: inputText.trim(),
      timestamp: new Date().toISOString(),
      isRead: false
    };

    const updated = [...db.getMessages(), newMsg];
    db.saveMessages(updated);
    setMessages(updated);
    setInputText('');
  };

  const chatHistory = useMemo(() => {
    if (!user) return [];
    return messages.filter(m => 
      m.senderId === user.id || m.receiverId === user.id
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, user]);

  const isItTeamOnline = useMemo(() => {
    return admins.some(a => db.isUserOnline(a));
  }, [admins]);

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-10rem)] flex flex-col bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in duration-500">
      {/* Header */}
      <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-50/30">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-[1.5rem] bg-brand-primary text-white flex items-center justify-center shadow-2xl shadow-brand-primary/30 shrink-0">
             <ShieldCheck size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">IT Helpdesk</h2>
            <div className="flex items-center gap-2 mt-2">
               <div className={`w-2.5 h-2.5 rounded-full ${isItTeamOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                 {isItTeamOnline ? 'Team Available' : 'Support Offline'}
               </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end mr-4">
                <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">SLA Priority</p>
                <p className="text-[11px] font-bold text-slate-600 uppercase">Standard Response</p>
            </div>
            <button className="p-4 hover:bg-white rounded-2xl transition-all text-slate-400"><MoreVertical size={24}/></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar bg-slate-50/10">
        {chatHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                <div className="w-20 h-20 bg-indigo-50 text-brand-primary rounded-[2rem] flex items-center justify-center shadow-inner">
                    <MessageCircle size={36} />
                </div>
                <div className="max-w-xs">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Start Consultation</h3>
                    <p className="text-sm text-slate-500 font-medium mt-2">Quickly message the IT team for hardware troubleshooting or account access.</p>
                </div>
            </div>
        )}

        {chatHistory.map((msg, i) => {
          const isMine = msg.senderId === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
              <div className={`max-w-[75%] space-y-1.5 ${isMine ? 'items-end' : 'items-start'}`}>
                <div className={`p-5 rounded-[2rem] text-sm font-bold shadow-md ${isMine ? 'bg-brand-primary text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'}`}>
                  {msg.text}
                </div>
                <div className={`flex items-center gap-3 text-[9px] font-black uppercase text-slate-400 tracking-widest px-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isMine && (msg.isRead ? <CheckCheck size={14} className="text-brand-primary" /> : <Check size={14} />)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-8 border-t border-slate-100 bg-white">
        <div className="flex items-center gap-6 bg-slate-50 rounded-[2.5rem] border border-slate-200 pl-8 pr-3 py-3 shadow-inner focus-within:ring-4 focus-within:ring-brand-primary/5 transition-all">
          <input 
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Describe your technical issue briefly..."
            className="flex-1 bg-transparent border-none outline-none py-4 text-sm font-bold text-slate-900 placeholder:text-slate-300"
          />
          <div className="flex items-center gap-2">
            <button type="button" className="p-3 text-slate-300 hover:text-brand-primary transition-colors"><Smile size={24}/></button>
            <button 
              type="submit" 
              disabled={!inputText.trim()}
              className="bg-brand-primary text-white w-14 h-14 rounded-[1.5rem] flex items-center justify-center hover:brightness-110 active:scale-90 transition-all shadow-2xl shadow-brand-primary/40 disabled:opacity-30"
            >
              <Send size={24} />
            </button>
          </div>
        </div>
        <p className="text-center text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mt-4">Security Encrypted Technical Communications</p>
      </form>
    </div>
  );
};

export default EmployeeChat;
