
import React from 'react';
// Fix: Use standard v6 named imports from react-router-dom
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserRole } from './types';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import EmployeePortal from './pages/employee/EmployeePortal';

const ProtectedRoute: React.FC<{ children: React.ReactNode; role: UserRole }> = ({ children, role }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute role={UserRole.ADMIN}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/portal/*" 
            element={
              <ProtectedRoute role={UserRole.EMPLOYEE}>
                <EmployeePortal />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
