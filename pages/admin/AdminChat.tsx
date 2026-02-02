
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../db/mockDb';
import { useAuth } from '../../context/AuthContext';
import { User, ChatMessage, UserRole } from '../../types';
import { Search, Send, User as UserIcon, MessageCircle, MoreVertical, Paperclip, Smile, ShieldCheck, Clock, Check, CheckCheck } from 'lucide-react';

const AdminChat: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedUser]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const refreshData = () => {
    const allUsers = db.getUsers();
    setEmployees(allUsers.filter(u => u.role === UserRole.EMPLOYEE && !u.isDeleted));
    
    const allMsgs = db.getMessages();
    setMessages(allMsgs);

    // Auto-mark as read if a user is selected
    if (selectedUser && currentAdmin) {
      const unreadFromSelection = allMsgs.filter(m => m.senderId === selectedUser.id && m.receiverId === currentAdmin.id && !m.isRead);
      if (unreadFromSelection.length > 0) {
        const updated = allMsgs.map(m => (m.senderId === selectedUser.id && m.receiverId === currentAdmin.id) ? { ...m, isRead: true } : m);
        db.saveMessages(updated);
      }
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !selectedUser || !currentAdmin) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentAdmin.id,
      receiverId: selectedUser.id,
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
    if (!selectedUser || !currentAdmin) return [];
    return messages.filter(m => 
      (m.senderId === currentAdmin.id && m.receiverId === selectedUser.id) ||
      (m.senderId === selectedUser.id && m.receiverId === currentAdmin.id)
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, selectedUser, currentAdmin]);

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUnreadCount = (userId: string) => {
    return messages.filter(m => m.senderId === userId && m.receiverId === currentAdmin?.id && !m.isRead).length;
  };

  const getLastMessage = (userId: string) => {
    const thread = messages.filter(m => 
      (m.senderId === currentAdmin?.id && m.receiverId === userId) ||
      (m.senderId === userId && m.receiverId === currentAdmin?.id)
    ).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return thread[0]?.text || 'Start a technical consultation...';
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/30">
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Support Inbox</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Filter personnel..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-brand-primary shadow-inner"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {filteredEmployees.map(emp => {
            const isOnline = db.isUserOnline(emp);
            const unread = getUnreadCount(emp.id);
            const isSelected = selectedUser?.id === emp.id;

            return (
              <button 
                key={emp.id}
                onClick={() => setSelectedUser(emp)}
                className={`w-full p-4 flex items-center gap-4 transition-all border-l-4 ${isSelected ? 'bg-indigo-50 border-brand-primary' : 'border-transparent hover:bg-slate-50'}`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center font-black text-indigo-600 uppercase text-sm shadow-inner overflow-hidden">
                    {emp.profilePicture ? <img src={emp.profilePicture} className="w-full h-full object-cover" /> : emp.name.charAt(0)}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className={`text-sm font-black uppercase truncate ${isSelected ? 'text-brand-primary' : 'text-slate-900'}`}>{emp.name}</p>
                    {unread > 0 && <span className="bg-brand-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{unread}</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase truncate tracking-tight">{getLastMessage(emp.id)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 uppercase overflow-hidden">
                   {selectedUser.profilePicture ? <img src={selectedUser.profilePicture} className="w-full h-full object-cover" /> : selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">{selectedUser.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={`w-2 h-2 rounded-full ${db.isUserOnline(selectedUser) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {db.isUserOnline(selectedUser) ? 'Live Connection' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className="hidden sm:block text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedUser.employeeId}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">{selectedUser.department}</p>
                 </div>
                 <button className="p-2 text-slate-400 hover:text-slate-600"><MoreVertical size={20}/></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar bg-slate-50/20">
              {chatHistory.map((msg, i) => {
                const isMine = msg.senderId === currentAdmin?.id;
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] space-y-1 ${isMine ? 'items-end' : 'items-start'}`}>
                      <div className={`p-4 rounded-3xl text-sm font-medium shadow-sm ${isMine ? 'bg-brand-primary text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                        {msg.text}
                      </div>
                      <div className={`flex items-center gap-2 text-[9px] font-black uppercase text-slate-400 tracking-tighter ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isMine && (msg.isRead ? <CheckCheck size={12} className="text-brand-primary" /> : <Check size={12} />)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-6 border-t border-slate-100 bg-white">
              <div className="flex items-center gap-4 bg-slate-50 rounded-[1.5rem] border border-slate-200 px-6 py-2 shadow-inner focus-within:ring-2 focus-within:ring-brand-primary/20 transition-all">
                <button type="button" className="text-slate-400 hover:text-brand-primary"><Paperclip size={20}/></button>
                <input 
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Type a technical response..."
                  className="flex-1 bg-transparent border-none outline-none py-3 text-sm font-bold text-slate-900"
                />
                <button type="button" className="text-slate-400 hover:text-amber-500"><Smile size={20}/></button>
                <button 
                  type="submit" 
                  disabled={!inputText.trim()}
                  className="bg-brand-primary text-white p-2.5 rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/10">
            <div className="w-24 h-24 bg-brand-primary/5 rounded-[2.5rem] flex items-center justify-center text-brand-primary mb-8 ring-1 ring-brand-primary/10">
                <MessageCircle size={48} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Support Console</h2>
            <p className="text-sm text-slate-500 max-w-sm mt-2 font-medium leading-relaxed">Select an employee from the registry to initiate a secure technical consultation.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChat;
