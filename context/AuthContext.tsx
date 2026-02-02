
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { db } from '../db/mockDb';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<UserRole | null>;
  logout: () => void;
  updateCurrentUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = sessionStorage.getItem('it_current_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email: string, password: string): Promise<UserRole | null> => {
    const users = db.getUsers();
    // Prevent deleted users from logging in
    const found = users.find(u => u.email === email && u.password === password && !u.isDeleted);
    
    if (found && found.isActive) {
      const sessionUser = { ...found };
      delete sessionUser.password;
      setUser(sessionUser);
      sessionStorage.setItem('it_current_user', JSON.stringify(sessionUser));
      return found.role;
    }
    return null;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('it_current_user');
  };

  const updateCurrentUser = (updates: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updates };
      setUser(newUser);
      sessionStorage.setItem('it_current_user', JSON.stringify(newUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
