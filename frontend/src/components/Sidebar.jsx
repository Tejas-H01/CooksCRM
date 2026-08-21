import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEventContext } from '../context/EventContext';
import { 
  TrendingUp, 
  Briefcase, 
  Building2, 
  ShieldCheck, 
  Zap, 
  Activity, 
  Lock,
  UserCheck,
  FileText,
  Target,
  ListTodo,
  Calendar,
  AlertTriangle,
  Users,
  MapPin,
  Flame,
  Award,
  BarChart3,
  PieChart,
  CheckSquare
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export const Sidebar = () => {
  const { actions, currentUser: eventUser } = useEventContext();
  const { currentUser: authUser } = useAuth();
  const currentUser = authUser || eventUser;
  const location = useLocation();
  const navigate = useNavigate();

  // Determine current active workspace theme & role based on route
  const isRmRoute = location.pathname === '/rm';
  const isManagerRoute = location.pathname === '/manager';
  const isRegionalRoute = location.pathname === '/regional';
  const isAdminRoute = location.pathname.startsWith('/admin');

  const userDisplayName = currentUser?.username || 'Authenticated User';

  // Active role config object
  const currentWorkspace = isAdminRoute
    ? { key: 'admin', title: 'ADMIN WORKSPACE', name: userDisplayName, role: 'Overall Admin', accent: 'var(--accent-admin)' }
    : isRegionalRoute
    ? { key: 'regional', title: 'REGIONAL WORKSPACE', name: userDisplayName, role: 'Regional Head', accent: 'var(--accent-regional)' }
    : isManagerRoute
    ? { key: 'manager', title: 'MANAGER WORKSPACE', name: userDisplayName, role: 'Branch Manager', accent: 'var(--accent-manager)' }
    : { key: 'rm', title: 'RM WORKSPACE', name: userDisplayName, role: 'Relationship Manager', accent: 'var(--accent-rm)' };

  return (
    <aside className="sidebar">
      <div>
        {/* Brand Header */}
        <div className="brand-logo">
          <div className="brand-icon">
            <Zap size={20} />
          </div>
          <div>
            <span>FINFLOW</span>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>
              {currentWorkspace.title}
            </div>
          </div>
        </div>

        {/* ROLE-SPECIFIC SIDEBAR FUNCTIONALITIES */}
        <div className="nav-section">
          <div className="nav-label">{currentWorkspace.role} Navigation</div>

          {/* 1. RM Workspace Nav Items */}
          {isRmRoute && (
            <>
              <a href="#actions-section" className="nav-item active-rm">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <ListTodo size={18} />
                  <span>Priority Action Feed</span>
                </div>
                {actions.length > 0 && <span className="nav-badge">{actions.length}</span>}
              </a>

              <a href="#metrics-section" className="nav-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Target size={18} />
                  <span>Target & Pipeline</span>
                </div>
              </a>

              <a href="#schedule-section" className="nav-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Calendar size={18} />
                  <span>Today's Schedule</span>
                </div>
              </a>

              <NavLink to="/events" className="nav-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Activity size={18} />
                  <span>Live Event Stream</span>
                </div>
              </NavLink>
            </>
          )}

          {/* 2. Branch Manager Workspace Nav Items */}
          {isManagerRoute && (
            <>
              <a href="#team-metrics" className="nav-item active-manager">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <TrendingUp size={18} />
                  <span>Team KPI Overview</span>
                </div>
              </a>

              <a href="#trend-chart" className="nav-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Briefcase size={18} />
                  <span>Run-Rate Trends</span>
                </div>
              </a>

              <a href="#alerts-feed" className="nav-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <AlertTriangle size={18} />
                  <span>Miss & Achievement Alerts</span>
                </div>
              </a>

              <a href="#team-table" className="nav-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Users size={18} />
                  <span>RM Workload Queue</span>
                </div>
              </a>

              <NavLink to="/events" className="nav-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Activity size={18} />
                  <span>Live Event Stream</span>
                </div>
              </NavLink>
            </>
          )}

          {/* 3. Regional Head Workspace Nav Items */}
          {isRegionalRoute && (
            <>
              <a href="#regional-overview" className="nav-item active-regional">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Building2 size={18} />
                  <span>Regional Overview</span>
                </div>
              </a>

              <a href="#teams-branches" className="nav-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <MapPin size={18} />
                  <span>Teams & Branches</span>
                </div>
              </a>

              <a href="#performance-trends" className="nav-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <BarChart3 size={18} />
                  <span>Performance Trends</span>
                </div>
              </a>

              <a href="#misses-risks" className="nav-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <AlertTriangle size={18} />
                  <span>Misses & Risk Alerts</span>
                </div>
              </a>

              <a href="#opportunities" className="nav-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Target size={18} />
                  <span>High-Value Opportunities</span>
                </div>
              </a>

              <a href="#recognition-feed" className="nav-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Award size={18} />
                  <span>Recognition & Victories</span>
                </div>
              </a>

              <a href="#benchmarking" className="nav-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <TrendingUp size={18} />
                  <span>Benchmarking Matrix</span>
                </div>
              </a>

              <a href="#product-intelligence" className="nav-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <PieChart size={18} />
                  <span>Product Intelligence</span>
                </div>
              </a>

              <a href="#action-center" className="nav-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <CheckSquare size={18} />
                  <span>Regional Action Center</span>
                </div>
              </a>

              <NavLink to="/events" className="nav-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Activity size={18} />
                  <span>Live Event Stream</span>
                </div>
              </NavLink>
            </>
          )}

          {/* 4. Admin Workspace Nav Items */}
          {isAdminRoute && (
            <>
              <NavLink to="/admin" end className={({ isActive }) => `nav-item ${isActive ? 'active-admin' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <ShieldCheck size={18} />
                  <span>System Overview</span>
                </div>
              </NavLink>

              <NavLink to="/admin/users" className={({ isActive }) => `nav-item ${isActive ? 'active-admin' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <UserCheck size={18} />
                  <span>User Hierarchy Mapping</span>
                </div>
              </NavLink>

              <NavLink to="/admin/roles" className={({ isActive }) => `nav-item ${isActive ? 'active-admin' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Lock size={18} />
                  <span>Roles & Permissions</span>
                </div>
              </NavLink>

              <NavLink to="/events" className="nav-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Activity size={18} />
                  <span>Live Event Stream</span>
                </div>
              </NavLink>

              <NavLink to="/audit-logs" className="nav-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <FileText size={18} />
                  <span>Audit Trail Logs</span>
                </div>
              </NavLink>
            </>
          )}
        </div>
      </div>

      {/* User Profile Badge at sidebar bottom */}
      <div
        style={{
          background: 'var(--input-bg)',
          border: '1px solid var(--border-glass)',
          borderRadius: '10px',
          padding: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem'
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: currentWorkspace.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            color: '#fff'
          }}
        >
          {currentWorkspace.key.substring(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
            {currentWorkspace.name}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {currentWorkspace.role}
          </div>
        </div>
      </div>
    </aside>
  );
};
