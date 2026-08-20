import React from 'react';
import { useEventContext } from '../context/EventContext';
import { RefreshCw, Info } from 'lucide-react';

export const ApiIntegrationsPage = () => {
  const { integrations, retryIntegration } = useEventContext();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          API & Integration Health Monitoring 🔌
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
          Integration Health Monitor (Demo / Offline Interface)
        </div>
      </div>

      {/* Scope Disclaimer Banner as required by spec */}
      <div style={{ background: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.3)', borderRadius: '10px', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <Info size={18} style={{ color: 'var(--accent-admin)' }} />
        <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
          <strong>Notice:</strong> Backend integration-health API is out of scope. This screen displays a frontend demo/mock experience until explicit backend health endpoints are implemented.
        </div>
      </div>

      <div className="glass-card">
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
          Configured Integration Services (Demo View)
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Protocol / Type</th>
                <th>Status</th>
                <th>Latency (ms)</th>
                <th>Success Rate</th>
                <th>Last Sync</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    <div>{item.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.endpoint}</div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.type}</td>
                  <td>
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: `${item.statusColor}20`,
                        color: item.statusColor,
                        border: `1px solid ${item.statusColor}50`
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{item.latencyMs} ms</td>
                  <td style={{ fontWeight: 700, color: item.successRate > 98 ? 'var(--accent-rm)' : 'var(--accent-admin)' }}>
                    {item.successRate}%
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.lastSync}</td>
                  <td>
                    <button
                      onClick={() => retryIntegration(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: 'var(--accent-manager)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '6px',
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <RefreshCw size={12} />
                      <span>Re-test</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
