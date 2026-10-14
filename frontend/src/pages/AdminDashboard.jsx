import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useEventContext } from '../context/EventContext';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { 
  Users, 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  Lock,
  UserCheck,
  ArrowRight,
  Target,
  Building2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { BACKEND_ROLES, ROLE_DISPLAY_NAMES } from '../data/mockData';

export const AdminDashboard = () => {
  const { adminOverview, users, systemAlerts, failedEvents, toggleUserActive, retryFailedEvent, refreshAdminData, isLoadingAdmin, addUser, branches } = useEventContext();

  const [isQuickAddRegionalOpen, setIsQuickAddRegionalOpen] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [regForm, setRegForm] = useState({
    username: '',
    name: '',
    email: '',
    password: 'password123',
    role: BACKEND_ROLES.REGIONAL_HEAD,
    regionName: 'West Region',
    branchName: 'All Regional Branches'
  });

  // Safely extract backend data or fallback gracefully
  const totalUsers = adminOverview?.total_users ?? adminOverview?.totalUsers ?? users.length;
  const activeUsers = adminOverview?.active_users ?? adminOverview?.activeUsers ?? users.filter(u => u.is_active !== false).length;
  const totalLeads = adminOverview?.total_leads ?? adminOverview?.totalLeads ?? 2;
  const totalCustomers = adminOverview?.total_customers ?? adminOverview?.totalCustomers ?? 2;

  const userActivityData = adminOverview?.user_activity ?? adminOverview?.userActivity ?? [
    { day: 'Mon', count: 4 },
    { day: 'Tue', count: 5 },
    { day: 'Wed', count: 5 },
    { day: 'Thu', count: 4 },
    { day: 'Fri', count: 5 },
    { day: 'Sat', count: 2 },
    { day: 'Sun', count: 1 }
  ];

  const handleQuickAddRegionalSubmit = async (e) => {
    e.preventDefault();
    if (!regForm.username.trim()) {
      setValidationError('Username is required.');
      return;
    }
    if (!regForm.email.trim() || !/\S+@\S+\.\S+/.test(regForm.email)) {
      setValidationError('Valid email address is required.');
      return;
    }
    if (!regForm.password || regForm.password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    try {
      setValidationError('');
      await addUser(regForm);
      setIsQuickAddRegionalOpen(false);
      setRegForm({
        username: '',
        name: '',
        email: '',
        password: 'password123',
        role: BACKEND_ROLES.REGIONAL_HEAD,
        regionName: 'West Region',
        branchName: 'All Regional Branches'
      });
    } catch (err) {
      setValidationError(err.message || 'POST /admin/users failed.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Admin Control Center ⚙️
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Live metrics connected to <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-admin)' }}>GET /admin/overview</code>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {/* Direct Quick Add Regional Manager Button */}
          <button
            onClick={() => {
              setValidationError('');
              setIsQuickAddRegionalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--accent-regional)',
              border: 'none',
              color: '#fff',
              borderRadius: '8px',
              padding: '0.55rem 1.1rem',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(241, 82, 111, 0.35)'
            }}
          >
            <Building2 size={16} />
            <span>Add Regional Manager</span>
          </button>

          <button
            onClick={refreshAdminData}
            disabled={isLoadingAdmin}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--input-bg)',
              border: '1px solid var(--border-glass-hover)',
              color: 'var(--text-main)',
              borderRadius: '8px',
              padding: '0.55rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={isLoadingAdmin ? "animate-spin" : ""} />
            <span>Sync Live Data</span>
          </button>

          <NavLink
            to="/admin/users"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--accent-admin)',
              border: 'none',
              color: '#000',
              borderRadius: '8px',
              padding: '0.55rem 1.1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            <UserCheck size={16} />
            <span>User Hierarchy Mapping</span>
          </NavLink>
        </div>
      </div>

      {/* Admin Sub-Module Quick Cards (Strict Backend API Modules) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
        <NavLink to="/admin/users" style={{ textDecoration: 'none' }}>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid var(--accent-admin)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(217, 119, 6, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-admin)' }}>
                <UserCheck size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>User Hierarchy Directory</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>POST /admin/users & PATCH</div>
              </div>
            </div>
            <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
        </NavLink>

        <NavLink to="/admin/roles" style={{ textDecoration: 'none' }}>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid var(--accent-manager)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(2, 132, 197, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-manager)' }}>
                <Lock size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>Roles & Permissions</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>4 Roles • Static RBAC Matrix</div>
              </div>
            </div>
            <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
        </NavLink>

        <NavLink to="/audit-logs" style={{ textDecoration: 'none' }}>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid var(--accent-rm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(1, 154, 107, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-rm)' }}>
                <FileText size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>Audit Trail Logs</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>GET /admin/audit-logs</div>
              </div>
            </div>
            <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
        </NavLink>
      </div>

      {/* Backend Live Overview KPI Metrics Grid */}
      <div className="metrics-grid">
        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-admin)' }}>
          <div className="metric-header">
            <span>Total Users</span>
            <Users size={16} style={{ color: 'var(--accent-admin)' }} />
          </div>
          <div className="metric-value">{totalUsers}</div>
          <div className="metric-sub text-positive">Live Backend Value</div>
        </div>

        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-admin)' }}>
          <div className="metric-header">
            <span>Active Users</span>
            <Activity size={16} style={{ color: 'var(--accent-admin)' }} />
          </div>
          <div className="metric-value">{activeUsers}</div>
          <div className="metric-sub text-positive">Live Backend Value</div>
        </div>

        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-admin)' }}>
          <div className="metric-header">
            <span>Total Leads</span>
            <Target size={16} style={{ color: 'var(--accent-admin)' }} />
          </div>
          <div className="metric-value">{totalLeads}</div>
          <div className="metric-sub text-positive">Live Backend Value</div>
        </div>

        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-rm)' }}>
          <div className="metric-header">
            <span>Total Customers</span>
            <CheckCircle2 size={16} style={{ color: 'var(--accent-rm)' }} />
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-rm)' }}>{totalCustomers}</div>
          <div className="metric-sub text-positive">Live Backend Value</div>
        </div>
      </div>

      {/* Chart & System Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem' }}>
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>User Activity (Demo/Placeholder Data)</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Daily active user session stats</div>
            </div>
          </div>

          <div style={{ width: '100%', height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
                <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip contentStyle={{ background: 'var(--modal-bg)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-main)' }} />
                <Bar dataKey="count" fill="var(--accent-admin)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>System Alerts & Engine Health</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {systemAlerts.map((alt) => (
              <div key={alt.id} style={{ background: 'var(--input-bg)', borderLeft: '4px solid var(--accent-admin)', borderRadius: '6px', padding: '0.75rem 0.85rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{alt.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{alt.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Hierarchy Table (Live Backend Data) */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Live User Hierarchy & Status</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Connected to <code style={{ fontFamily: 'var(--font-mono)' }}>GET /admin/users</code></div>
          </div>
          
          <NavLink
            to="/admin/users"
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--accent-admin)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <span>Manage Users</span>
            <ArrowRight size={14} />
          </NavLink>
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>User Name</th>
                <th>Backend Role</th>
                <th>Branch / Territory</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isActive = u.is_active !== false && u.status !== 'Inactive';
                const roleCode = u.role || 'RM';
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      <div>{u.name || u.username}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: roleCode === 'REGIONAL_HEAD' ? 'var(--accent-regional)' : 'var(--accent-admin)' }}>
                      {ROLE_DISPLAY_NAMES[roleCode] || roleCode}
                    </td>
                    <td>
                      {(() => {
                        const teamObj = branches?.find(b => b.id === u.team_id);
                        return teamObj ? teamObj.name : 'Unassigned';
                      })()}
                    </td>
                    <td>
                      <span style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: isActive ? 'rgba(1,154,107,0.15)' : 'rgba(225,29,72,0.15)', color: isActive ? 'var(--accent-rm)' : 'var(--accent-regional)' }}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleUserActive(u.id, isActive)}
                        style={{
                          background: isActive ? 'rgba(225,29,72,0.12)' : 'rgba(1,154,107,0.12)',
                          border: `1px solid ${isActive ? 'var(--accent-regional)' : 'var(--accent-rm)'}`,
                          color: isActive ? 'var(--accent-regional)' : 'var(--accent-rm)',
                          borderRadius: '6px',
                          padding: '0.25rem 0.65rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Failed Business Event Queue Monitor */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Failed Business Event Queue Monitor</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Connected to <code style={{ fontFamily: 'var(--font-mono)' }}>GET /admin/events/failed</code></div>
          </div>
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Event Type</th>
                <th>Source</th>
                <th>Error Message</th>
                <th>Timestamp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {failedEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                    No failed events in queue.
                  </td>
                </tr>
              ) : (
                failedEvents.map((evt) => (
                  <tr key={evt.id}>
                    <td style={{ fontWeight: 700, color: 'var(--accent-admin)' }}>{evt.eventType || evt.event_type}</td>
                    <td>{evt.source || 'RuleEngine'}</td>
                    <td style={{ color: 'var(--accent-regional)', fontSize: '0.8rem' }}>{evt.errorMsg || evt.error_message || 'Processing Error'}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{evt.timestamp || evt.created_at || 'Just now'}</td>
                    <td>
                      <button
                        onClick={() => retryFailedEvent(evt.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--accent-admin)', border: 'none', color: '#000', borderRadius: '6px', padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        <RefreshCw size={12} />
                        <span>Retry Ingestion</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK ADD REGIONAL MANAGER MODAL */}
      {isQuickAddRegionalOpen && (
        <div className="modal-overlay" onClick={() => setIsQuickAddRegionalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={20} style={{ color: 'var(--accent-regional)' }} />
                <span>Add Regional Manager (POST /admin/users)</span>
              </div>
              <button onClick={() => setIsQuickAddRegionalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>
                ✕
              </button>
            </div>

            {validationError && (
              <div style={{ background: 'rgba(241, 82, 111, 0.12)', border: '1px solid rgba(241, 82, 111, 0.35)', borderRadius: '8px', padding: '0.75rem 0.85rem', color: 'var(--accent-regional)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertCircle size={16} />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleQuickAddRegionalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 700 }}>
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. sanjay_singhania"
                    value={regForm.username}
                    onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 700 }}>
                    Full Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sanjay Singhania"
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 700 }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. sanjay@salesorbit.com"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-main)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 700 }}>
                    Initial Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 700 }}>
                  Assigned Role
                </label>
                <input
                  type="text"
                  readOnly
                  value="REGIONAL_HEAD (Regional Head / Manager)"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'rgba(241, 82, 111, 0.1)', border: '1px solid rgba(241, 82, 111, 0.3)', color: 'var(--accent-regional)', fontWeight: 800 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Assigned Territory / Region
                  </label>
                  <select
                    value={regForm.regionName}
                    onChange={(e) => setRegForm({ ...regForm, regionName: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-main)' }}
                  >
                    <option value="West Region">West Region</option>
                    <option value="North Region">North Region</option>
                    <option value="South Region">South Region</option>
                    <option value="East Region">East Region</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Branch Mapping Scope
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="All Regional Branches"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsQuickAddRegionalOpen(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', background: 'var(--input-bg)', border: 'none', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '6px',
                    background: 'var(--accent-regional)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(241, 82, 111, 0.35)'
                  }}
                >
                  Create Regional Manager (POST)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
