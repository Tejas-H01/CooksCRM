import React from 'react';
import { useEventContext } from '../context/EventContext';
import { Zap, Info } from 'lucide-react';

export const LiveEventsPage = () => {
  const { eventLog, setIsSimulatorOpen } = useEventContext();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Live Event Stream & Simulator ⚡
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Operational business event ingestion feed
          </div>
        </div>

        <button
          onClick={() => setIsSimulatorOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'linear-gradient(135deg, var(--accent-rm), var(--accent-manager))',
            border: 'none',
            color: '#fff',
            borderRadius: '8px',
            padding: '0.55rem 1.1rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <Zap size={16} />
          <span>Simulate New Event</span>
        </button>
      </div>

      <div style={{ background: 'rgba(2, 132, 197, 0.1)', border: '1px solid rgba(2, 132, 197, 0.3)', borderRadius: '10px', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <Info size={18} style={{ color: 'var(--accent-manager)' }} />
        <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
          <strong>Notice:</strong> Real-time WebSockets are intentionally out of scope. Event ingestion uses REST triggers and synthetic simulation.
        </div>
      </div>

      <div className="glass-card">
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
          Event Ingestion Log Stream
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Type</th>
                <th>Description</th>
                <th>Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {eventLog.map((evt) => (
                <tr key={evt.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--accent-manager)' }}>
                    {evt.id}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-rm)' }}>{evt.eventType}</td>
                  <td style={{ color: 'var(--text-main)' }}>{evt.description}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{evt.timestamp}</td>
                  <td>
                    <span style={{ background: 'rgba(1, 154, 107, 0.15)', color: 'var(--accent-rm)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                      ✓ {evt.status.toUpperCase()}
                    </span>
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
