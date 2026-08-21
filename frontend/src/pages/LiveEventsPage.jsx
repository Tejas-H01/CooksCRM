import React from 'react';
import { useEventContext } from '../context/EventContext';
import { Zap, Info, Play, Square } from 'lucide-react';

export const LiveEventsPage = () => {
  const { 
    eventLog, 
    setIsSimulatorOpen, 
    simulatorStats, 
    startSimulation, 
    stopSimulation, 
    triggerSimulationJourney 
  } = useEventContext();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Live Event Stream & Ingestion Queue ⚡
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Asynchronous event ingestion and customer journey processing
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {simulatorStats.is_simulator_running ? (
            <button
              onClick={stopSimulation}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#ef4444',
                borderRadius: '8px',
                padding: '0.55rem 1.1rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Square size={16} />
              <span>Stop Simulator Loop</span>
            </button>
          ) : (
            <button
              onClick={startSimulation}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#10b981',
                borderRadius: '8px',
                padding: '0.55rem 1.1rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Play size={16} />
              <span>Start Simulator Loop</span>
            </button>
          )}

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
            <span>Simulate Single Event</span>
          </button>
        </div>
      </div>

      {/* Queue Diagnostics Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1rem', borderTop: '3px solid var(--accent-manager)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>QUEUE DEPTH</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.2rem 0' }}>{simulatorStats.queue_depth}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>waiting events</div>
        </div>
        <div className="glass-card" style={{ padding: '1rem', borderTop: '3px solid var(--accent-rm)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ACTIVE PROCESSING</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.2rem 0' }}>{simulatorStats.active_processing}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>worker threads</div>
        </div>
        <div className="glass-card" style={{ padding: '1rem', borderTop: '3px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PROCESSED TOTAL</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', margin: '0.2rem 0' }}>{simulatorStats.processed_count}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>successful tasks</div>
        </div>
        <div className="glass-card" style={{ padding: '1rem', borderTop: '3px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>FAILED TOTAL</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444', margin: '0.2rem 0' }}>{simulatorStats.failed_count}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>aborted runs</div>
        </div>
      </div>

      {/* Blueprint triggers */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
          Trigger Customer Journey Blueprints
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button onClick={() => triggerSimulationJourney('HIGH_INTENT_CUSTOMER', "1")} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem', cursor: 'pointer' }}>
            🔥 High-Intent Lead (John)
          </button>
          <button onClick={() => triggerSimulationJourney('PURCHASING_CUSTOMER', "2")} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem', cursor: 'pointer' }}>
            🛍️ Purchasing Funnel (Jane)
          </button>
          <button onClick={() => triggerSimulationJourney('AT_RISK_CUSTOMER', "1")} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem', cursor: 'pointer' }}>
            ⚠️ Churn / Risk Warning (John)
          </button>
          <button onClick={() => triggerSimulationJourney('REPEAT_CUSTOMER', "2")} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem', cursor: 'pointer' }}>
            🔄 Repeat Customer Loop (Jane)
          </button>
        </div>
      </div>

      <div style={{ background: 'rgba(2, 132, 197, 0.1)', border: '1px solid rgba(2, 132, 197, 0.3)', borderRadius: '10px', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <Info size={18} style={{ color: 'var(--accent-manager)' }} />
        <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
          <strong>Decoupled Ingestion Queue:</strong> Event POST requests write events to DB and return `202 Accepted` immediately without blocking on processing. A background worker loop consumes the queue in the background.
        </div>
      </div>

      <div className="glass-card">
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
          Live Event Ingestion Log (Database persisted)
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
                    {evt.id.substring(0, 8)}...
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-rm)' }}>{evt.eventType}</td>
                  <td style={{ color: 'var(--text-main)' }}>{evt.description}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{evt.timestamp}</td>
                  <td>
                    <span style={{ 
                      background: evt.status === 'processed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', 
                      color: evt.status === 'processed' ? '#10b981' : '#f59e0b', 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.72rem', 
                      fontWeight: 700 
                    }}>
                      {evt.status === 'processed' ? '✓ PROCESSED' : '⌛ PENDING'}
                    </span>
                  </td>
                </tr>
              ))}
              {eventLog.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No events captured in database yet. Try running the simulation loop or triggering a journey.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
