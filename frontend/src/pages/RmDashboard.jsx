import React, { useState } from 'react';
import { useEventContext } from '../context/EventContext';
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  PhoneCall, 
  MessageSquare, 
  Send, 
  AlertCircle, 
  Calendar, 
  Sparkles, 
  ArrowRight
} from 'lucide-react';

export const RmDashboard = () => {
  const { actions, leads, completeAction, snoozeAction, reassignAction, selectedLead, setSelectedLead, rmPerformance } = useEventContext();
  const [activeTab, setActiveTab] = useState('overview');
  const [editableMsg, setEditableMsg] = useState('');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeActionForDetail, setActiveActionForDetail] = useState(null);

  const openActionDetail = (act) => {
    setActiveActionForDetail(act);
    const leadObj = leads.find((l) => l.name === act.leadName) || leads[0];
    setSelectedLead(leadObj);
    setEditableMsg(act.suggestedMessage || `Hi ${leadObj.name}, following up on our wealth management solutions.`);
    setIsDetailOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Greeting Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Good morning, Rahul! 👋
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            You have <strong style={{ color: 'var(--accent-rm)' }}>{actions.length} actions</strong> requiring your attention today.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              background: 'rgba(1, 154, 107, 0.15)',
              color: 'var(--accent-rm)',
              border: '1px solid rgba(1, 154, 107, 0.3)'
            }}
          >
            ● Active Shift - Relationship Manager
          </span>
        </div>
      </div>

      {/* Metrics Cards Row */}
      <div id="metrics-section" className="metrics-grid">
        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-rm)' }}>
          <div className="metric-header">
            <span>Today's Target</span>
            <TrendingUp size={16} style={{ color: 'var(--accent-rm)' }} />
          </div>
          <div className="metric-value">{rmPerformance ? `${rmPerformance.achievement_percentage}%` : "68%"}</div>
          <div className="metric-sub" style={{ color: 'var(--text-muted)' }}>
            Expected: <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{rmPerformance ? `${rmPerformance.expected_run_rate}%` : "74%"}</span>
          </div>
        </div>

        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-rm)' }}>
          <div className="metric-header">
            <span>Pipeline Value</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-rm)', fontWeight: 700 }}>
              {rmPerformance ? `${rmPerformance.pipeline_coverage.toFixed(1)}x SLA` : "+12.5%"}
            </span>
          </div>
          <div className="metric-value">{rmPerformance ? `₹${(rmPerformance.pipeline_value / 100000).toFixed(1)}L` : "₹82.4L"}</div>
          <div className="metric-sub text-positive">
            {rmPerformance ? `Pipeline coverage: ${rmPerformance.pipeline_coverage.toFixed(2)}x` : "+12.5% from last month"}
          </div>
        </div>

        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-rm)' }}>
          <div className="metric-header">
            <span>Conversions</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-rm)', fontWeight: 700 }}>Rate</span>
          </div>
          <div className="metric-value">{rmPerformance ? `${rmPerformance.conversion_rate.toFixed(1)}%` : "12%"}</div>
          <div className="metric-sub text-positive">
            Target conversions: active
          </div>
        </div>

        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-regional)' }}>
          <div className="metric-header">
            <span>Follow-ups Due</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-regional)', fontWeight: 700 }}>
              {rmPerformance ? `${rmPerformance.overdue_followups} Overdue` : "3 Overdue"}
            </span>
          </div>
          <div className="metric-value">{rmPerformance ? rmPerformance.followups_completed : "7"}</div>
          <div className="metric-sub text-negative">
            {rmPerformance && rmPerformance.overdue_followups > 0 ? "Requires immediate contact" : "All scheduled followups"}
          </div>
        </div>
      </div>

      {/* Main Split Grid: Priority Actions (Left) vs AI Insight & Schedule (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem' }}>
        
        {/* Left Column: Priority Actions Feed */}
        <div id="actions-section" className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Priority Actions</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Ranked by real-time urgency, SLA breach window, and intent score
              </div>
            </div>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-rm)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              View All
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {actions.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                🎉 All priority actions for today have been completed!
              </div>
            ) : (
              actions.map((act) => (
                <div
                  key={act.id}
                  className="action-card"
                  onClick={() => openActionDetail(act)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border-glass)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: 'var(--accent-rm)'
                      }}
                    >
                      {act.leadName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {act.leadName}
                        </span>
                        <span
                          className={`action-badge ${
                            act.urgencyScore > 90
                              ? 'badge-high'
                              : act.urgencyScore > 75
                              ? 'badge-medium'
                              : 'badge-low'
                          }`}
                        >
                          {act.priority}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginTop: '0.2rem', fontWeight: 600 }}>
                        {act.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {act.description}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-regional)', fontWeight: 700 }}>
                      {act.dueText}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openActionDetail(act);
                      }}
                      style={{
                        background: 'rgba(1, 154, 107, 0.15)',
                        border: '1px solid rgba(1, 154, 107, 0.4)',
                        color: 'var(--accent-rm)',
                        borderRadius: '6px',
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        cursor: 'pointer'
                      }}
                    >
                      <span>Action</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: AI Insight & Today's Schedule */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* AI Insight Box (Fixed Text Visibility in Light & Dark Mode) */}
          <div id="ai-section" className="ai-insight-box">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-rm)', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                <Sparkles size={18} />
                <span>AI Insight</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.45, fontWeight: 500 }}>
                You can recover approximately <strong>₹14L</strong> of pipeline by completing these 3 overdue actions today.
              </div>
              <button
                onClick={() => {
                  if (actions.length > 0) openActionDetail(actions[0]);
                }}
                style={{
                  marginTop: '0.85rem',
                  background: 'var(--accent-rm)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Start My Day
              </button>
            </div>
          </div>

          {/* Today's Schedule Card */}
          <div id="schedule-section" className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} style={{ color: 'var(--accent-rm)' }} />
                <span>Today's Schedule</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>2 Events</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem'
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-rm)', width: '65px' }}>
                  11:30 AM
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Meeting with Neha Shah
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    SIP vs Fixed Deposit Portfolio Review
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem'
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-manager)', width: '65px' }}>
                  12:30 PM
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Follow-up with Aarav Mehta
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    High Value Lead ₹18L Wealth Investment
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Action Detail Modal */}
      {isDetailOpen && activeActionForDetail && (
        <div className="modal-overlay" onClick={() => setIsDetailOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--accent-rm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>
                  {selectedLead.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedLead.name}</span>
                    {selectedLead.tags.map((t, idx) => (
                      <span key={idx} className="action-badge badge-high" style={{ fontSize: '0.68rem' }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    ₹{(selectedLead.potentialValue / 100000).toFixed(1)}L Potential Value • Last contact {selectedLead.lastContactDaysAgo} days ago
                  </div>
                </div>
              </div>

              <button onClick={() => setIsDetailOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Recommended Action Card */}
            <div style={{ background: 'rgba(1, 154, 107, 0.08)', border: '1px solid rgba(1, 154, 107, 0.3)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-rm)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>
                Recommended Action
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Follow up with {selectedLead.name} today
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                Best Time to contact: <strong style={{ color: 'var(--text-main)' }}>{selectedLead.bestContactTime}</strong>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Outbound Communication Template</label>
                <textarea
                  rows={3}
                  value={editableMsg}
                  onChange={(e) => setEditableMsg(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-glass-hover)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    completeAction(activeActionForDetail.id, "Follow-up message sent & call completed");
                    setIsDetailOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'var(--accent-rm)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    borderRadius: '8px',
                    padding: '0.55rem 1.1rem',
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  <Send size={15} />
                  <span>Send Now & Complete</span>
                </button>

                <button
                  onClick={() => {
                    snoozeAction(activeActionForDetail.id, 24);
                    setIsDetailOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-glass-hover)',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    borderRadius: '8px',
                    padding: '0.55rem 1rem',
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  <Clock size={15} />
                  <span>Snooze (24h)</span>
                </button>

                <button
                  onClick={() => {
                    reassignAction(activeActionForDetail.id, "Neha Iyer");
                    setIsDetailOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-glass-hover)',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    borderRadius: '8px',
                    padding: '0.55rem 1rem',
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  <span>Reassign to Neha</span>
                </button>
              </div>
            </div>

            {/* AI Insights Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: 'var(--input-bg)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Conversion Probability</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-rm)', marginTop: '0.2rem' }}>
                  {selectedLead.conversionProbability}%
                </div>
              </div>

              <div style={{ background: 'var(--input-bg)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Next Follow-up SLA</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-manager)', marginTop: '0.2rem' }}>
                  {selectedLead.nextFollowup}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
