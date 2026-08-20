import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { EventProvider } from './context/EventContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { EventSimulatorModal } from './components/EventSimulatorModal';
import { LoginPage } from './pages/LoginPage';
import { RmDashboard } from './pages/RmDashboard';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { RegionalDashboard } from './pages/RegionalDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { RolesPermissionsPage } from './pages/RolesPermissionsPage';
import { UserHierarchyPage } from './pages/UserHierarchyPage';
import { LiveEventsPage } from './pages/LiveEventsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

function ProtectedLayout() {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <Header />
        <main className="dashboard-content">
          <Routes>
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="/rm" element={<RmDashboard />} />
            <Route path="/manager" element={<ManagerDashboard />} />
            <Route path="/regional" element={<RegionalDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/roles" element={<RolesPermissionsPage />} />
            <Route path="/admin/users" element={<UserHierarchyPage />} />
            <Route path="/events" element={<LiveEventsPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
      <EventSimulatorModal />
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <EventProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </Router>
      </EventProvider>
    </ToastProvider>
  );
}

export default App;
