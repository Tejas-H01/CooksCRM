import React, { useState } from 'react';
import { useEventContext } from '../context/EventContext';
import { apiService } from '../services/api';
import { 
  TrendingUp, 
  Clock, 
  Send, 
  Calendar, 
  Sparkles, 
  ArrowRight,
  Target,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Plus,
  Check,
  X,
  Lightbulb,
  Cpu
} from 'lucide-react';

const fmt = (val, divisor = 100000, decimals = 1) => {
  if (val === null || val === undefined) return '--';
  const num = parseFloat(val);
  if (isNaN(num)) return '--';
  return `\u20b9${(num / divisor).toFixed(decimals)}L`;
};

const fmtPct = (val, decimals = 1) => {
  if (val === null || val === undefined) return '--';
  return `${parseFloat(val).toFixed(decimals)}%`;
};

export const RmDashboard = () => {
  const { 
    actions, 
    leads, 
    schedule, 
    completeAction, 
    snoozeAction, 
    reassignAction, 
    selectedLead, 
    setSelectedLead, 
    rmPerformance,
    opportunitySuggestions,
    customers,
    acceptOpportunitySuggestion,
    dismissOpportunitySuggestion,
    createRmOpportunity,
    createRmCustomer,
    currentUser
  } = useEventContext();

  const [editableMsg, setEditableMsg] = useState('');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeActionForDetail, setActiveActionForDetail] = useState(null);
  const [showOpportunities, setShowOpportunities] = useState(true);

  // Add Opportunity Modal state
  const [isAddOppModalOpen, setIsAddOppModalOpen] = useState(false);
  const [oppCustomers, setOppCustomers] = useState([]);
  const [customerMode, setCustomerMode] = useState('select'); // 'select' | 'create'
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    segment: 'Retail'
  });
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState('');
  const [isProbManuallySet, setIsProbManuallySet] = useState(false);

  const [newOppData, setNewOppData] = useState({
    customer_id: '',
    name: '',
    potential_value: '100000',
    probability: 40,
    stage: 'QUALIFIED',
    expected_close_date: '',
    notes: ''
  });
  const [oppError, setOppError] = useState('');
  const [isSubmittingOpp, setIsSubmittingOpp] = useState(false);

  const STAGE_PROBABILITIES = {
    NEW: 20,
    QUALIFIED: 40,
    PROPOSAL: 70,
    NEGOTIATION: 90
  };

  const handleStageChange = (newStage) => {
    setNewOppData((prev) => {
      const updated = { ...prev, stage: newStage };
      if (!isProbManuallySet && STAGE_PROBABILITIES[newStage] !== undefined) {
        updated.probability = STAGE_PROBABILITIES[newStage];
      }
      return updated;
    });
  };

  const handleCreateCustomerSubmit = async (e) => {
    e.preventDefault();
    setCustomerError('');
    if (!newCustomerData.name.trim()) {
      setCustomerError('Customer name is required.');
      return;
    }

    try {
      setIsSubmittingCustomer(true);
      const created = await createRmCustomer({
        name: newCustomerData.name.trim(),
        phone: newCustomerData.phone ? newCustomerData.phone.trim() : null,
        email: newCustomerData.email ? newCustomerData.email.trim() : null,
        segment: newCustomerData.segment || 'Retail'
      });
      if (created && created.id) {
        setOppCustomers((prev) => {
          const exists = prev.some((c) => c.id === created.id);
          return exists ? prev : [...prev, created];
        });
        setNewOppData((prev) => ({ ...prev, customer_id: created.id }));
        setCustomerMode('select');
        setNewCustomerData({ name: '', phone: '', email: '', segment: 'Retail' });
      }
    } catch (err) {
      setCustomerError(err.message || 'Failed to create customer.');
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

  const handleOpenAddOppModal = async () => {
    setOppError('');
    setCustomerError('');
    setCustomerMode('select');
    setIsProbManuallySet(false);
    let activeCusts = customers;
    if (!Array.isArray(activeCusts) || activeCusts.length === 0) {
      try {
        activeCusts = await apiService.fetchRmCustomers();
      } catch (e) {
        console.warn("Failed to load customers for opportunity modal:", e);
      }
    }
    if (Array.isArray(activeCusts) && activeCusts.length > 0) {
      setOppCustomers(activeCusts);
      setNewOppData((prev) => ({
        ...prev,
        customer_id: activeCusts[0].id
      }));
    }
    setIsAddOppModalOpen(true);
  };

  const handleCreateOppSubmit = async (e) => {
    e.preventDefault();
    setOppError('');

    const potentialVal = parseFloat(newOppData.potential_value);
    const prob = parseInt(newOppData.probability, 10);
    const custId = parseInt(newOppData.customer_id, 10);

    if (!custId || isNaN(custId)) {
      setOppError('Please select a valid customer.');
      return;
    }
    if (!newOppData.name.trim()) {
      setOppError('Please enter an opportunity name.');
      return;
    }
    if (isNaN(potentialVal) || potentialVal < 0) {
      setOppError('Expected potential value must be greater than or equal to 0.');
      return;
    }
    if (isNaN(prob) || prob < 0 || prob > 100) {
      setOppError('Probability must be between 0 and 100.');
      return;
    }

    try {
      setIsSubmittingOpp(true);
      await createRmOpportunity({
        customer_id: custId,
        name: newOppData.name.trim(),
        potential_value: potentialVal,
        probability: prob,
        stage: newOppData.stage,
        expected_close_date: newOppData.expected_close_date ? new Date(newOppData.expected_close_date).toISOString() : null,
        notes: newOppData.notes ? newOppData.notes.trim() : null
      });
      setIsAddOppModalOpen(false);
      setNewOppData({
        customer_id: '',
        name: '',
        potential_value: '100000',
        probability: 50,
        stage: 'QUALIFIED',
        expected_close_date: '',
        notes: ''
      });
    } catch (err) {
      setOppError(err.message || 'Failed to create opportunity.');
    } finally {
      setIsSubmittingOpp(false);
    }
  };

  const openActionDetail = (act) => {
    setActiveActionForDetail(act);
    const leadObj = leads.find((l) => l.id === act.lead_id || l.name === act.leadName || l.name === act.lead_name || l.name === act.customer_name) || leads[0];
    if (!leadObj) return;
    setSelectedLead(leadObj);
    setEditableMsg(act.suggestedMessage || act.description || `Hi ${leadObj.name}, following up on our recent communication.`);
    setIsDetailOpen(true);
  };

  const aiInsightText = (() => {
    if (!rmPerformance) return 'Loading intelligence...';
    const overdue = rmPerformance.overdue_followups || 0;
    const remTarget = rmPerformance.remaining_target || 0;
    const weightedPipeline = rmPerformance.weighted_pipeline || 0;
    if (overdue > 0 && remTarget > 0) {
      return `You have ${overdue} overdue action${overdue > 1 ? 's' : ''}. Weighted pipeline of ${fmt(weightedPipeline)} vs remaining target of ${fmt(remTarget)}.`;
    }
    if (weightedPipeline > remTarget && remTarget > 0) {
      return `Pipeline coverage is ${rmPerformance.pipeline_coverage.toFixed(1)}x your remaining target. Focus on converting high-probability opportunities.`;
    }
    return `Achievement is at ${fmtPct(rmPerformance.achievement_percentage)} vs expected ${fmtPct(rmPerformance.expected_run_rate)} run rate.`;
  })();

  const openLeads = leads.filter(l => l.status === 'OPEN');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Good morning, {currentUser?.username || 'Relationship Manager'}! 👋
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            You have <strong style={{ color: 'var(--accent-rm)' }}>{actions.length} actions</strong> requiring your attention today.
          </div>
        </div>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '0.35rem 0.75rem', borderRadius: '9999px', background: 'rgba(1, 154, 107, 0.15)', color: 'var(--accent-rm)', border: '1px solid rgba(1, 154, 107, 0.3)' }}>
          ● Active Shift - Relationship Manager
        </span>
      </div>

      {/* TARGET AND PIPELINE SECTION */}
      <div id="metrics-section">
        <div className="metrics-grid" style={{ marginBottom: '1.25rem' }}>
          <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-rm)' }}>
            <div className="metric-header"><span>Achievement</span><TrendingUp size={16} style={{ color: 'var(--accent-rm)' }} /></div>
            <div className="metric-value">{rmPerformance ? fmtPct(rmPerformance.achievement_percentage) : '--'}</div>
            <div className="metric-sub" style={{ color: 'var(--text-muted)' }}>
              Run Rate: <span style={{ color: rmPerformance && rmPerformance.target_gap >= 0 ? 'var(--accent-rm)' : 'var(--accent-regional)', fontWeight: 700 }}>{rmPerformance ? fmtPct(rmPerformance.expected_run_rate) : '--'}</span>
            </div>
          </div>
          <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-rm)' }}>
            <div className="metric-header"><span>Weighted Pipeline</span><span style={{ fontSize: '0.8rem', color: 'var(--accent-rm)', fontWeight: 700 }}>{rmPerformance ? `${rmPerformance.pipeline_coverage.toFixed(1)}x` : '--'}</span></div>
            <div className="metric-value">{rmPerformance ? fmt(rmPerformance.weighted_pipeline) : '--'}</div>
            <div className="metric-sub" style={{ color: 'var(--text-muted)' }}>Coverage vs remaining target</div>
          </div>
          <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-rm)' }}>
            <div className="metric-header"><span>Conversion Rate</span><span style={{ fontSize: '0.8rem', color: 'var(--accent-rm)', fontWeight: 700 }}>Rate</span></div>
            <div className="metric-value">{rmPerformance ? fmtPct(rmPerformance.conversion_rate) : '--'}</div>
            <div className="metric-sub" style={{ color: 'var(--text-muted)' }}>Leads converted to closed</div>
          </div>
          <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-regional)' }}>
            <div className="metric-header"><span>Overdue Follow-ups</span><span style={{ fontSize: '0.75rem', color: 'var(--accent-regional)', fontWeight: 700 }}>Requires Action</span></div>
            <div className="metric-value" style={{ color: rmPerformance && rmPerformance.overdue_followups > 0 ? 'var(--accent-regional)' : 'var(--text-main)' }}>{rmPerformance ? rmPerformance.overdue_followups : '--'}</div>
            <div className="metric-sub" style={{ color: 'var(--text-muted)' }}>{rmPerformance && rmPerformance.overdue_followups > 0 ? 'Immediate contact required' : 'All follow-ups on track'}</div>
          </div>
        </div>

        {/* SMART RULE ENGINE RECOMMENDATIONS CARD */}
        <div className="glass-card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', borderLeft: '4px solid var(--accent-rm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-rm)', fontWeight: 800, fontSize: '0.95rem' }}>
              <Cpu size={18} />
              <span>Smart Rule Engine Recommendations ({opportunitySuggestions ? opportunitySuggestions.length : 0})</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Real-time Event Processing & Intent Decision Engine (Accept / Reject)</span>
          </div>

          {!opportunitySuggestions || opportunitySuggestions.length === 0 ? (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.4rem 0' }}>
              Smart Rule Engine active. Customer events are evaluated in real-time — high-intent buying signals & opportunity recommendations will appear here for RM approval.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.85rem' }}>
              {opportunitySuggestions.map((sugg) => (
                <div key={sugg.id} style={{ background: 'var(--input-bg)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.85rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.65rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>{sugg.name}</div>
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(1, 154, 107, 0.15)', color: 'var(--accent-rm)', fontWeight: 700 }}>{sugg.stage}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Customer: <strong style={{ color: 'var(--text-main)' }}>{sugg.customer_name || `Customer #${sugg.customer_id}`}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.4rem', fontSize: '0.8rem' }}>
                      <div>Value: <strong style={{ color: 'var(--accent-rm)' }}>{fmt(sugg.potential_value)}</strong></div>
                      <div>Prob: <strong style={{ color: '#f5a623' }}>{sugg.probability}%</strong></div>
                    </div>
                    {sugg.reason && (
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontStyle: 'italic' }}>
                        Rule Engine Match: "{sugg.reason}"
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-glass)', paddingTop: '0.5rem' }}>
                    <button
                      onClick={() => acceptOpportunitySuggestion(sugg.id)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: 'var(--accent-rm)', border: 'none', color: '#fff', fontSize: '0.78rem', fontWeight: 700, padding: '0.4rem 0.5rem', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      <Check size={14} /> Accept
                    </button>
                    <button
                      onClick={() => dismissOpportunitySuggestion(sugg.id)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: 'var(--input-bg)', border: '1px solid var(--border-glass-hover)', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, padding: '0.4rem 0.5rem', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showOpportunities ? '1rem' : 0 }}>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowOpportunities(v => !v)}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Target size={16} style={{ color: 'var(--accent-rm)' }} />
                  Open Opportunities
                  <span style={{ fontSize: '0.75rem', background: 'rgba(1,154,107,0.15)', color: 'var(--accent-rm)', padding: '0.15rem 0.5rem', borderRadius: '99px', fontWeight: 700 }}>{openLeads.length}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Expected close dates, probabilities, and remaining values</div>
              </div>
              {showOpportunities ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
            </div>
            <button
              onClick={handleOpenAddOppModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'var(--accent-rm)',
                border: 'none',
                color: '#fff',
                borderRadius: '6px',
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Plus size={14} /> Add Opportunity
            </button>
          </div>
          {showOpportunities && (
            <div style={{ overflowX: 'auto' }}>
              {openLeads.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No open opportunities. Trigger the simulator to generate leads or click "+ Add Opportunity".</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}><th style={{ padding: '0.65rem 0.75rem' }}>Lead</th><th style={{ padding: '0.65rem 0.75rem' }}>Expected</th><th style={{ padding: '0.65rem 0.75rem' }}>Actual</th><th style={{ padding: '0.65rem 0.75rem' }}>Remaining</th><th style={{ padding: '0.65rem 0.75rem' }}>Probability</th><th style={{ padding: '0.65rem 0.75rem' }}>Close Date</th><th style={{ padding: '0.65rem 0.75rem' }}>Stage</th></tr></thead>
                  <tbody>
                    {openLeads.map(lead => {
                      const expected = parseFloat(lead.potential_value || lead.potentialValue || 0);
                      const actual = parseFloat(lead.actual_value || 0);
                      const remaining = Math.max(0, expected - actual);
                      const prob = lead.probability || 50;
                      return (
                        <tr key={lead.id} style={{ borderBottom: '1px solid var(--border-glass-hover)', fontSize: '0.88rem' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>{lead.name}</td>
                          <td style={{ padding: '0.75rem' }}>{fmt(expected)}</td>
                          <td style={{ padding: '0.75rem', color: actual > 0 ? 'var(--accent-rm)' : 'var(--text-muted)' }}>{fmt(actual)}</td>
                          <td style={{ padding: '0.75rem', fontWeight: 600 }}>{fmt(remaining)}</td>
                          <td style={{ padding: '0.75rem' }}><span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, background: prob >= 70 ? 'rgba(1,154,107,0.15)' : prob >= 40 ? 'rgba(255,180,0,0.15)' : 'rgba(220,50,50,0.15)', color: prob >= 70 ? 'var(--accent-rm)' : prob >= 40 ? '#f5a623' : 'var(--accent-regional)' }}>{prob}%</span></td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{lead.expected_close_date ? new Date(lead.expected_close_date).toLocaleDateString() : 'TBD'}</td>
                          <td style={{ padding: '0.75rem' }}><span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-rm)' }}>{lead.stage}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PRIORITY ACTIONS + AI INSIGHT + SCHEDULE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem' }}>
        <div id="actions-section" className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Priority Actions</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ranked by real-time urgency, SLA breach window, and intent score</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {actions.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>🎉 All priority actions for today have been completed!</div>
            ) : (
              actions.map((act) => (
                <div key={act.id} className="action-card" onClick={() => openActionDetail(act)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justify: 'center', fontWeight: 700, color: 'var(--accent-rm)', flexShrink: 0 }}>{(act.leadName || act.customer_name || 'UN').substring(0, 2).toUpperCase()}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{act.leadName || act.customer_name}</span>
                        <span className={`action-badge ${act.urgencyScore > 90 || act.priority === 'HIGH' ? 'badge-high' : 'badge-medium'}`}>{act.priority}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginTop: '0.2rem', fontWeight: 600 }}>{act.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{act.description}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-regional)', fontWeight: 700 }}>{act.dueText || act.formatted_time}</span>
                    <button onClick={(e) => { e.stopPropagation(); openActionDetail(act); }} style={{ background: 'rgba(1, 154, 107, 0.15)', border: '1px solid rgba(1, 154, 107, 0.4)', color: 'var(--accent-rm)', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                      <span>Action</span><ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div id="ai-section" className="ai-insight-box">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-rm)', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                <Sparkles size={18} /><span>AI Insight</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.45, fontWeight: 500 }}>{aiInsightText}</div>
              <button onClick={() => { if (actions.length > 0) openActionDetail(actions[0]); }} style={{ marginTop: '0.85rem', background: 'var(--accent-rm)', border: 'none', color: '#fff', borderRadius: '6px', padding: '0.45rem 0.95rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>Start My Day</button>
            </div>
          </div>

          {/* DYNAMIC TODAY'S SCHEDULE SECTION */}
          <div id="schedule-section" className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} style={{ color: 'var(--accent-rm)' }} /><span>Today's Schedule</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{schedule ? schedule.length : 0} Activities</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(!schedule || schedule.length === 0) ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  📅 No activities scheduled for today!
                </div>
              ) : (
                schedule.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openActionDetail(item)}
                    style={{
                      background: 'var(--input-bg)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      opacity: item.status === 'COMPLETED' ? 0.65 : 1
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: item.status === 'COMPLETED' ? 'var(--text-muted)' : 'var(--accent-rm)', width: '75px', flexShrink: 0 }}>
                        {item.formatted_time || 'Today'}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {item.title}
                          {item.status === 'COMPLETED' ? (
                            <span style={{ fontSize: '0.65rem', background: 'rgba(1,154,107,0.2)', color: 'var(--accent-rm)', padding: '0.1rem 0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <CheckCircle size={10} /> DONE
                            </span>
                          ) : (
                            <span className={`action-badge ${item.priority === 'HIGH' || item.priority === 'CRITICAL' ? 'badge-high' : 'badge-medium'}`} style={{ fontSize: '0.65rem' }}>
                              {item.priority}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {item.description || item.customer_name || 'Scheduled Activity'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); openActionDetail(item); }}
                      style={{
                        background: 'rgba(1, 154, 107, 0.15)',
                        border: '1px solid rgba(1, 154, 107, 0.4)',
                        color: 'var(--accent-rm)',
                        borderRadius: '6px',
                        padding: '0.3rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      View
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ACTION DETAIL MODAL */}
      {isDetailOpen && activeActionForDetail && selectedLead && (
        <div className="modal-overlay" onClick={() => setIsDetailOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--accent-rm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>{(selectedLead.name || 'UN').substring(0, 2).toUpperCase()}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedLead.name}</span>
                    {(selectedLead.tags || [selectedLead.stage || 'LEAD']).map((t, idx) => (<span key={idx} className="action-badge badge-high" style={{ fontSize: '0.68rem' }}>{t}</span>))}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{fmt(selectedLead.potential_value || selectedLead.potentialValue)} Potential Value</div>
                </div>
              </div>
              <button onClick={() => setIsDetailOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>x</button>
            </div>

            <div style={{ background: 'rgba(1, 154, 107, 0.08)', border: '1px solid rgba(1, 154, 107, 0.3)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-rm)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>Recommended Action</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>{activeActionForDetail.title || `Follow up with ${selectedLead.name} today`}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>Best time to contact: <strong style={{ color: 'var(--text-main)' }}>{selectedLead.bestContactTime || 'Afternoon'}</strong></div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Outbound Communication Template</label>
                <textarea rows={3} value={editableMsg} onChange={(e) => setEditableMsg(e.target.value)} style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border-glass-hover)', borderRadius: '8px', padding: '0.75rem', color: 'var(--text-main)', fontSize: '0.85rem' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button onClick={() => { completeAction(activeActionForDetail.id, { notes: editableMsg || 'Follow-up completed' }); setIsDetailOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--accent-rm)', border: 'none', color: '#fff', fontWeight: 700, borderRadius: '8px', padding: '0.55rem 1.1rem', fontSize: '0.82rem', cursor: 'pointer' }}><Send size={15} /><span>Send Now and Complete</span></button>
                <button onClick={() => { snoozeAction(activeActionForDetail.id, 24); setIsDetailOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--input-bg)', border: '1px solid var(--border-glass-hover)', color: 'var(--text-main)', fontWeight: 600, borderRadius: '8px', padding: '0.55rem 1rem', fontSize: '0.82rem', cursor: 'pointer' }}><Clock size={15} /><span>Snooze (24h)</span></button>
                <button onClick={() => { reassignAction(activeActionForDetail.id, 'Neha Iyer'); setIsDetailOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--input-bg)', border: '1px solid var(--border-glass-hover)', color: 'var(--text-main)', fontWeight: 600, borderRadius: '8px', padding: '0.55rem 1rem', fontSize: '0.82rem', cursor: 'pointer' }}><span>Reassign to Neha</span></button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: 'var(--input-bg)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Conversion Probability</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-rm)', marginTop: '0.2rem' }}>{selectedLead.probability || selectedLead.conversionProbability || 50}%</div>
              </div>
              <div style={{ background: 'var(--input-bg)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Next Follow-up SLA</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-manager)', marginTop: '0.2rem' }}>{selectedLead.nextFollowup || 'Tomorrow'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD OPPORTUNITY MODAL */}
      {isAddOppModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddOppModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} style={{ color: 'var(--accent-rm)' }} />
                <span>Add Opportunity</span>
              </div>
              <button onClick={() => setIsAddOppModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>×</button>
            </div>

            {oppError && (
              <div style={{ background: 'rgba(220, 50, 50, 0.15)', border: '1px solid rgba(220, 50, 50, 0.4)', color: 'var(--accent-regional)', padding: '0.65rem', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '1rem' }}>
                {oppError}
              </div>
            )}

            <form onSubmit={handleCreateOppSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* CUSTOMER SECTION WITH ADD NEW CUSTOMER TOGGLE */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {customerMode === 'select' ? 'Select Customer' : 'Create New Customer'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerError('');
                      setCustomerMode(customerMode === 'select' ? 'create' : 'select');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-rm)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    {customerMode === 'select' ? (
                      <>
                        <Plus size={14} /> Add New Customer
                      </>
                    ) : (
                      <>
                        ← Select Existing Customer
                      </>
                    )}
                  </button>
                </div>

                {customerError && (
                  <div style={{ background: 'rgba(220, 50, 50, 0.15)', border: '1px solid rgba(220, 50, 50, 0.4)', color: 'var(--accent-regional)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.78rem', marginBottom: '0.65rem' }}>
                    {customerError}
                  </div>
                )}

                {customerMode === 'select' ? (
                  <select
                    value={newOppData.customer_id}
                    onChange={(e) => setNewOppData({ ...newOppData, customer_id: e.target.value })}
                    style={{
                      width: '100%',
                      height: '38px',
                      background: 'var(--input-bg)',
                      border: '1px solid var(--border-glass-hover)',
                      borderRadius: '6px',
                      padding: '0.45rem 0.75rem',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                    required
                  >
                    {oppCustomers.length === 0 ? (
                      <option value="" disabled style={{ background: '#1a1f2c', color: 'var(--text-muted)' }}>
                        Loading customers...
                      </option>
                    ) : (
                      oppCustomers.map((c) => (
                        <option key={c.id} value={c.id} style={{ background: '#1a1f2c', color: '#ffffff' }}>
                          {c.name} ({c.segment || 'Customer'})
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div>
                      <input
                        type="text"
                        placeholder="Customer Full Name *"
                        value={newCustomerData.name}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                        style={{ width: '100%', height: '36px', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border-glass-hover)', borderRadius: '6px', padding: '0.45rem 0.75rem', color: 'var(--text-main)', fontSize: '0.82rem', outline: 'none' }}
                        required
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Phone (optional)"
                        value={newCustomerData.phone}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                        style={{ width: '100%', height: '36px', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border-glass-hover)', borderRadius: '6px', padding: '0.45rem 0.75rem', color: 'var(--text-main)', fontSize: '0.82rem', outline: 'none' }}
                      />
                      <input
                        type="email"
                        placeholder="Email (optional)"
                        value={newCustomerData.email}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                        style={{ width: '100%', height: '36px', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border-glass-hover)', borderRadius: '6px', padding: '0.45rem 0.75rem', color: 'var(--text-main)', fontSize: '0.82rem', outline: 'none' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <select
                        value={newCustomerData.segment}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, segment: e.target.value })}
                        style={{ height: '34px', background: 'var(--input-bg)', border: '1px solid var(--border-glass-hover)', borderRadius: '6px', padding: '0.35rem 0.5rem', color: 'var(--text-main)', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        <option value="Retail" style={{ background: '#1a1f2c' }}>Retail</option>
                        <option value="HNW" style={{ background: '#1a1f2c' }}>HNW</option>
                        <option value="Corporate" style={{ background: '#1a1f2c' }}>Corporate</option>
                      </select>
                      <button
                        type="button"
                        disabled={isSubmittingCustomer}
                        onClick={handleCreateCustomerSubmit}
                        style={{ background: 'var(--accent-rm)', border: 'none', color: '#fff', padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', opacity: isSubmittingCustomer ? 0.6 : 1 }}
                      >
                        {isSubmittingCustomer ? 'Saving...' : 'Save & Select Customer'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Opportunity / Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. Wealth Portfolio Expansion"
                  value={newOppData.name}
                  onChange={(e) => setNewOppData({ ...newOppData, name: e.target.value })}
                  style={{ width: '100%', height: '38px', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border-glass-hover)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Potential Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={newOppData.potential_value}
                    onChange={(e) => setNewOppData({ ...newOppData, potential_value: e.target.value })}
                    style={{ width: '100%', height: '38px', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border-glass-hover)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Sales Stage</label>
                  <select
                    value={newOppData.stage}
                    onChange={(e) => handleStageChange(e.target.value)}
                    style={{ width: '100%', height: '38px', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border-glass-hover)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="NEW" style={{ background: '#1a1f2c', color: '#ffffff' }}>NEW (20%)</option>
                    <option value="QUALIFIED" style={{ background: '#1a1f2c', color: '#ffffff' }}>QUALIFIED (40%)</option>
                    <option value="PROPOSAL" style={{ background: '#1a1f2c', color: '#ffffff' }}>PROPOSAL (70%)</option>
                    <option value="NEGOTIATION" style={{ background: '#1a1f2c', color: '#ffffff' }}>NEGOTIATION (90%)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Probability (0-100%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newOppData.probability}
                    onChange={(e) => {
                      setIsProbManuallySet(true);
                      setNewOppData({ ...newOppData, probability: e.target.value });
                    }}
                    style={{ width: '100%', height: '38px', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border-glass-hover)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Expected Close Date</label>
                  <input
                    type="date"
                    value={newOppData.expected_close_date}
                    onChange={(e) => setNewOppData({ ...newOppData, expected_close_date: e.target.value })}
                    style={{ width: '100%', height: '38px', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border-glass-hover)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Notes / Context</label>
                <textarea
                  rows={2}
                  placeholder="Add optional opportunity context..."
                  value={newOppData.notes}
                  onChange={(e) => setNewOppData({ ...newOppData, notes: e.target.value })}
                  style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border-glass-hover)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: 'var(--text-main)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddOppModalOpen(false)}
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--border-glass-hover)', color: 'var(--text-muted)', padding: '0.45rem 1rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOpp}
                  style={{ background: 'var(--accent-rm)', border: 'none', color: '#fff', padding: '0.45rem 1.1rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', opacity: isSubmittingOpp ? 0.6 : 1 }}
                >
                  {isSubmittingOpp ? 'Creating...' : 'Create Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
