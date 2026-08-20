import React from 'react';
import { useEventContext } from '../context/EventContext';
import { FileText, Shield } from 'lucide-react';

export const AuditLogsPage = () => {
  const { auditLogs } = useEventContext();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
          System Audit Logs & Compliance Trail 📜
        </div>
        <div style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '0.2rem' }}>
          Immutable log of all user actions, rule modifications, and state updates
        </div>
      </div>

      <div className="glass-card">
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Action Performed</th>
                <th>Performed By</th>
                <th>Module</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#9ca3af' }}>
                    {log.id}
                  </td>
                  <td style={{ fontWeight: 700, color: '#fff' }}>{log.action}</td>
                  <td style={{ color: '#fca004', fontWeight: 600 }}>{log.performedBy}</td>
                  <td>{log.module}</td>
                  <td style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
