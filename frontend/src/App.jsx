import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, getRoleDefaultPath } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { EventProvider } from './context/EventContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { EventSimulatorModal } from './components/EventSimulatorModal';
import { SalesOrbitAIChatbot } from './components/SalesOrbitAIChatbot';
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
  const { isAuthenticated, authInitializing, currentUser } = useAuth();

  if (authInitializing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', color: 'var(--text-main)', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(1, 197, 138, 0.2)', borderTopColor: 'var(--accent-rm)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)' }}>Initializing SalesOrbit Portal...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const defaultPath = getRoleDefaultPath(currentUser?.role);

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <Header />
        <main className="dashboard-content">
          <Routes>
            <Route path="/" element={<Navigate to={defaultPath} replace />} />
            <Route path="/rm" element={<RmDashboard />} />
            <Route path="/manager" element={<ManagerDashboard />} />
            <Route path="/regional" element={<RegionalDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/roles" element={<RolesPermissionsPage />} />
            <Route path="/admin/users" element={<UserHierarchyPage />} />
            <Route path="/events" element={<LiveEventsPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="*" element={<Navigate to={defaultPath} replace />} />
          </Routes>
        </main>
      </div>
      <EventSimulatorModal />
      <SalesOrbitAIChatbot />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}

export default App;
