import React from 'react';
import { useEventContext } from '../context/EventContext';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { ROLE_DISPLAY_NAMES } from '../data/mockData';

export const RolesPermissionsPage = () => {
  const { rolesPermissions } = useEventContext();

  const permissionLabels = {
    viewSystemOverview: "View System Overview & Health",
    manageUsers: "Create, Edit & Map Users",
    manageRoles: "Access Role Definitions",
    configureRules: "Configure Event Engine Rules",
    viewAuditLogs: "Access Audit Trail Logs",
    retryFailedEvents: "Retry Failed Queue Events",
    reassignActions: "Reassign Team Actions & Leads",
    viewTeamMetrics: "View Team & Branch Benchmarks",
    completeActions: "Execute & Complete RM Actions"
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Roles & Permissions Matrix 🔒
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
          Connected to <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-admin)' }}>GET /admin/roles</code> & <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-admin)' }}>GET /admin/permissions</code> (Static RBAC Configuration)
        </div>
      </div>

      {/* Scope Info Badge */}
      <div style={{ background: 'rgba(2, 132, 197, 0.1)', border: '1px solid rgba(2, 132, 197, 0.3)', borderRadius: '10px', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <Info size={18} style={{ color: 'var(--accent-manager)' }} />
        <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
          <strong>Static RBAC Matrix:</strong> Displaying backend authoritative role definitions for <code>ADMIN</code>, <code>REGIONAL_HEAD</code>, <code>BRANCH_MANAGER</code>, and <code>RM</code>. Dynamic permission mutation is intentionally out of scope.
        </div>
      </div>

      <div className="glass-card">
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
          Backend Authoritative Role Matrix
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Permission Capability</th>
                {rolesPermissions.map((role) => {
                  const roleCode = role.name || role.role || 'RM';
                  return (
                    <th key={role.id || roleCode} style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--accent-admin)', fontWeight: 700 }}>
                        {ROLE_DISPLAY_NAMES[roleCode] || roleCode}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {roleCode}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Object.keys(permissionLabels).map((permKey) => (
                <tr key={permKey}>
                  <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {permissionLabels[permKey]}
                  </td>
                  {rolesPermissions.map((role) => {
                    const isEnabled = role.permissions ? role.permissions[permKey] : true;
                    return (
                      <td key={`${role.id || role.name}-${permKey}`} style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            background: isEnabled ? 'rgba(1, 154, 107, 0.15)' : 'rgba(225, 29, 72, 0.12)',
                            border: `1px solid ${isEnabled ? 'var(--accent-rm)' : 'var(--accent-regional)'}`,
                            color: isEnabled ? 'var(--accent-rm)' : 'var(--accent-regional)',
                            borderRadius: '6px',
                            padding: '0.25rem 0.65rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          {isEnabled ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                          <span>{isEnabled ? 'ALLOWED' : 'DENIED'}</span>
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
