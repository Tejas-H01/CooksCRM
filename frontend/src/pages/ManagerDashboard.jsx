import React, { useState } from 'react';
import { useEventContext } from '../context/EventContext';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Briefcase
} from 'lucide-react';

export const ManagerDashboard = () => {
  const { rms, actions, snoozeAction, reassignAction, managerPerformance } = useEventContext();
  const [selectedRm, setSelectedRm] = useState(rms[0]);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);

  // Enrich RMs list with performance stats from managerPerformance if available
  const enrichedRms = rms.map(rm => {
    const perf = managerPerformance?.rm_rankings?.find(r => r.rm_id === rm.id);
    if (perf) {
      return {
        ...rm,
        name: rm.username || rm.name,
        targetAchievement: perf.achievement_percentage,
        expectedRunRate: managerPerformance.expected_run_rate,
        pipeline: perf.pipeline_value,
        conversionRate: perf.conversion_rate,
        overdueFollowups: 0,
        status: perf.achievement_percentage >= managerPerformance.expected_run_rate ? "On Track" : "At Risk",
        statusColor: perf.achievement_percentage >= managerPerformance.expected_run_rate ? "#01c58a" : "#f1526f"
      };
    }
    return {
      ...rm,
      name: rm.username || rm.name
    };
  });

  const performanceTrendData = [
    { month: 'Jan', actual: 50, expected: 55 },
    { month: 'Feb', actual: 65, expected: 60 },
    { month: 'Mar', actual: 55, expected: 65 },
    { month: 'Apr', actual: 75, expected: 70 },
    { month: 'May', actual: 78, expected: 83 },
    { month: 'Jun', actual: 85, expected: 85 }
  ];

  const managerAlerts = [
    { id: 1, type: 'danger', text: '3 RMs below expected run-rate', detail: 'Needs immediate attention' },
    { id: 2, type: 'warning', text: '17 overdue follow-ups', detail: 'Requires action to prevent loss' },
    { id: 3, type: 'warning', text: '₹72L high-value pipeline at risk', detail: 'SLA breach pending' },
    { id: 4, type: 'success', text: '2 RMs exceeded their targets', detail: 'Great performance!' }
  ];

  const handleRowClick = (rm) => {
    setSelectedRm(rm);
    setIsDrilldownOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Welcome back, Anita! 👋
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Here's what's happening with your branch team today.
          </div>
        </div>

        <select
          style={{
            background: 'var(--input-bg)',
            border: '1px solid var(--border-glass-hover)',
            borderRadius: '8px',
            color: 'var(--text-main)',
            padding: '0.45rem 0.85rem',
            fontSize: '0.82rem',
            fontWeight: 600,
            outline: 'none'
          }}
        >
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Metrics Cards Grid */}
      <div id="team-metrics" className="metrics-grid">
        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-manager)' }}>
          <div className="metric-header">
            <span>Today's Target Achievement</span>
            <Users size={16} style={{ color: 'var(--accent-manager)' }} />
          </div>
          <div className="metric-value">{managerPerformance ? `${managerPerformance.team_achievement_percentage.toFixed(1)}%` : "78%"}</div>
          <div className="metric-sub" style={{ color: 'var(--text-muted)' }}>
            Expected: <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{managerPerformance ? `${managerPerformance.expected_run_rate}%` : "83%"}</span>
          </div>
        </div>

        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-manager)' }}>
          <div className="metric-header">
            <span>Total Pipeline</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-manager)', fontWeight: 700 }}>Value</span>
          </div>
          <div className="metric-value">{managerPerformance ? `₹${(managerPerformance.total_pipeline / 10000000).toFixed(1)}Cr` : "₹4.8Cr"}</div>
          <div className="metric-sub text-positive">
            Branch total active pipeline
          </div>
        </div>

        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-manager)' }}>
          <div className="metric-header">
            <span>Conversion Rate</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-manager)', fontWeight: 700 }}>Average</span>
          </div>
          <div className="metric-value">{managerPerformance ? `${managerPerformance.average_conversion.toFixed(1)}%` : "14.2%"}</div>
          <div className="metric-sub text-positive">
            Branch average conversion rate
          </div>
        </div>

        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-regional)' }}>
          <div className="metric-header">
            <span>At-Risk Pipeline</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-regional)', fontWeight: 700 }}>
              {managerPerformance ? `${managerPerformance.sla_breach_count} Opps` : "8 Opps"}
            </span>
          </div>
          <div className="metric-value">{managerPerformance ? `₹${(managerPerformance.target_gap < 0 ? Math.abs(managerPerformance.target_gap) * 10 : 72).toFixed(0)}L` : "₹72L"}</div>
          <div className="metric-sub text-negative">
            Target lag & SLA breach
          </div>
        </div>
      </div>

      {/* Main Split Grid: Chart + Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem' }}>
        
        {/* Team Performance Trend Chart */}
        <div id="trend-chart" className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Team Performance Trend
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Actual vs Expected target run-rate trajectory
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--accent-manager)', fontWeight: 700 }}>● Actual</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>-- Expected</span>
            </div>
          </div>

          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--modal-bg)',
                    border: '1px solid var(--border-glass-hover)',
                    borderRadius: '8px',
                    color: 'var(--text-main)'
                  }}
                />
                <Line type="monotone" dataKey="actual" stroke="var(--accent-manager)" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="expected" stroke="var(--text-muted)" strokeDasharray="5 5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Manager Alerts */}
        <div id="alerts-feed" className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Alerts & Detection Feed
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {managerAlerts.map((alt) => (
              <div
                key={alt.id}
                style={{
                  background: 'var(--input-bg)',
                  borderLeft: `4px solid ${
                    alt.type === 'danger' ? 'var(--accent-regional)' : alt.type === 'warning' ? 'var(--accent-admin)' : 'var(--accent-rm)'
                  }`,
                  borderRadius: '6px',
                  padding: '0.75rem 0.85rem'
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {alt.text}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{alt.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Breakdown Table */}
      <div id="team-table" className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Team Performance Breakdown
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Click an RM to drill down into workload & intervention queue
          </div>
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>RM Name</th>
                <th>Target Achievement</th>
                <th>Pipeline Value</th>
                <th>Conversion Rate</th>
                <th>Overdue Follow-ups</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {enrichedRms.map((rm) => (
                <tr key={rm.id} onClick={() => handleRowClick(rm)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'var(--accent-manager)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 700
                        }}
                      >
                        {rm.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div>{rm.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{rm.role}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: rm.targetAchievement < 70 ? 'var(--accent-regional)' : 'var(--accent-rm)' }}>
                    {rm.targetAchievement}%
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px' }}>
                      (Exp. {rm.expectedRunRate}%)
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    ₹{(rm.pipeline / 100000).toFixed(1)}L
                  </td>
                  <td>{rm.conversionRate}%</td>
                  <td style={{ color: rm.overdueFollowups > 3 ? 'var(--accent-regional)' : 'var(--text-main)', fontWeight: 600 }}>
                    {rm.overdueFollowups}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: `${rm.statusColor}20`,
                        color: rm.statusColor,
                        border: `1px solid ${rm.statusColor}50`
                      }}
                    >
                      {rm.status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(rm);
                      }}
                      style={{
                        background: 'rgba(2, 132, 197, 0.15)',
                        border: '1px solid rgba(2, 132, 197, 0.4)',
                        color: 'var(--accent-manager)',
                        borderRadius: '6px',
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Drill Down
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RM Workload Drilldown Modal */}
      {isDrilldownOpen && selectedRm && (
        <div className="modal-overlay" onClick={() => setIsDrilldownOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-manager)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.2rem' }}>
                  {selectedRm.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedRm.name} - Performance & Intervention</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{selectedRm.role} • {selectedRm.team} • {selectedRm.branchName}</div>
                </div>
              </div>
              <button onClick={() => setIsDrilldownOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--input-bg)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Achievement</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: selectedRm.targetAchievement < 70 ? 'var(--accent-regional)' : 'var(--accent-rm)' }}>{selectedRm.targetAchievement}%</div>
              </div>
              <div style={{ background: 'var(--input-bg)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pipeline</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>₹{(selectedRm.pipeline / 100000).toFixed(1)}L</div>
              </div>
              <div style={{ background: 'var(--input-bg)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Conversion Rate</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-manager)' }}>{selectedRm.conversionRate}%</div>
              </div>
              <div style={{ background: 'var(--input-bg)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Overdue Follow-ups</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-regional)' }}>{selectedRm.overdueFollowups}</div>
              </div>
            </div>

            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
              Intervention Queue & Pending Actions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {actions.map((act) => (
                <div key={act.id} style={{ background: 'var(--input-bg)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>{act.leadName} - {act.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Potential ₹{(act.potentialValue / 100000).toFixed(1)}L • {act.dueText}</div>
                  </div>
                  <button
                    onClick={() => {
                      reassignAction(act.id, "Neha Iyer");
                      setIsDrilldownOpen(false);
                    }}
                    style={{ background: 'var(--accent-manager)', border: 'none', color: '#fff', borderRadius: '6px', padding: '0.4rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Reassign Lead
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
