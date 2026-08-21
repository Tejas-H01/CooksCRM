import React, { useState } from 'react';
import { useEventContext } from '../context/EventContext';
import { apiService } from '../services/api';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Briefcase,
  Target,
  Clock,
  Layers,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  BarChart3,
  UserCheck,
  Zap,
  ArrowRightLeft,
  FileCheck,
  Info
} from 'lucide-react';

const fmt = (val, divisor = 100000, decimals = 1) => {
  if (val === null || val === undefined) return '--';
  const num = parseFloat(val);
  if (isNaN(num)) return '--';
  return `\u20b9${(num / divisor).toFixed(decimals)}L`;
};

export const ManagerDashboard = () => {
  const { 
    managerPerformance, 
    managerLeads, 
    managerBranch, 
    systemAlerts, 
    rms,
    actions,
    currentUser,
    reassignManagerLead,
    reassignManagerAction,
    resolveManagerAction
  } = useEventContext();

  const [selectedRm, setSelectedRm] = useState(null);
  const [rmDetail, setRmDetail] = useState(null);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);
  const [isLoadingDrilldown, setIsLoadingDrilldown] = useState(false);

  // Reassignment Modal State
  const [reassignTarget, setReassignTarget] = useState(null); // { type: 'LEAD'|'ACTION', item: obj }
  const [selectedNewRmId, setSelectedNewRmId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [isSubmittingReassign, setIsSubmittingReassign] = useState(false);

  // Action Resolution State
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  const handleRowClick = async (rm) => {
    setSelectedRm(rm);
    setIsDrilldownOpen(true);
    setIsLoadingDrilldown(true);
    try {
      const data = await apiService.fetchManagerRmDetail(rm.rm_id || rm.id);
      setRmDetail(data);
    } catch (err) {
      console.error("Failed to fetch RM detail:", err);
      setRmDetail(null);
    } finally {
      setIsLoadingDrilldown(false);
    }
  };

  const openReassignModal = (type, item) => {
    setReassignTarget({ type, item });
    setSelectedNewRmId('');
    setReassignReason('');
  };

  const handleConfirmReassign = async (e) => {
    e.preventDefault();
    if (!selectedNewRmId) return;
    setIsSubmittingReassign(true);
    try {
      if (reassignTarget.type === 'LEAD') {
        await reassignManagerLead(reassignTarget.item.id, parseInt(selectedNewRmId), reassignReason);
      } else {
        await reassignManagerAction(reassignTarget.item.id, parseInt(selectedNewRmId), reassignReason);
      }
      setReassignTarget(null);
    } catch (err) {
      console.error("Reassignment failed:", err);
    } finally {
      setIsSubmittingReassign(false);
    }
  };

  const handleConfirmResolve = async (e) => {
    e.preventDefault();
    if (!resolveTarget) return;
    setIsSubmittingResolve(true);
    try {
      await resolveManagerAction(resolveTarget.id, resolutionNotes);
      setResolveTarget(null);
    } catch (err) {
      console.error("Resolution failed:", err);
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  const rmRankings = managerPerformance?.rm_rankings || [];
  const atRiskRms = managerPerformance?.at_risk_rms || [];
  const branchActions = actions || [];
  const highValueLeads = (managerLeads || []).filter(l => (l.potential_value || 0) >= 100000);

  // Calculate dynamic executive summary text
  const achievementPct = managerPerformance?.team_achievement_percentage ? managerPerformance.team_achievement_percentage.toFixed(1) : '0.0';
  const expectedRunRate = managerPerformance?.expected_run_rate ? managerPerformance.expected_run_rate.toFixed(1) : '0.0';
  const riskCount = atRiskRms.length;

  let briefText = `Branch is performing at ${achievementPct}% achievement against an expected month run-rate of ${expectedRunRate}%. `;
  if (riskCount > 0) {
    briefText += `Attention required: ${riskCount} RM${riskCount > 1 ? 's' : ''} currently lagging behind target or triggering SLA risk signals.`;
  } else {
    briefText += `All subordinate RMs are currently operating on or above expected target run-rates.`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Good morning, {currentUser?.username || 'Branch Manager'}! 👋
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Branch Overview & Operational Intelligence — {managerBranch?.name || 'Wealth Branch Alpha'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.78rem', background: 'rgba(245, 166, 35, 0.15)', color: '#f5a623', padding: '0.35rem 0.75rem', borderRadius: '20px', fontWeight: 700, border: '1px solid rgba(245, 166, 35, 0.4)' }}>
            Manager Workspace • 3s Live Polling
          </span>
        </div>
      </div>

      {/* Dynamic Executive Brief */}
      <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-manager)', background: 'linear-gradient(135deg, rgba(245, 166, 35, 0.05) 0%, rgba(2, 132, 197, 0.03) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
          <Zap size={18} style={{ color: 'var(--accent-manager)' }} />
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
            Executive Operational Brief
          </span>
        </div>
        <div style={{ fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: '1.5', fontWeight: 500 }}>
          {briefText}
        </div>
      </div>

      {/* 1. Branch Overview KPI Cards Grid */}
      <div id="team-metrics" className="metrics-grid">
        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-manager)' }}>
          <div className="metric-header">
            <span>Branch Target & Achievement</span>
            <Target size={16} style={{ color: 'var(--accent-manager)' }} />
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-manager)' }}>
            {managerPerformance ? `${managerPerformance.team_achievement_percentage.toFixed(1)}%` : '--'}
          </div>
          <div className="metric-sub" style={{ color: 'var(--text-muted)' }}>
            Target: <strong style={{ color: 'var(--text-main)' }}>{managerPerformance ? fmt(managerPerformance.team_target) : '--'}</strong> • Achieved: <strong style={{ color: 'var(--accent-rm)' }}>{managerPerformance ? fmt(managerPerformance.team_achievement) : '--'}</strong>
          </div>
        </div>

        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-manager)' }}>
          <div className="metric-header">
            <span>Total Branch Pipeline</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-manager)', fontWeight: 700 }}>Value</span>
          </div>
          <div className="metric-value">
            {managerPerformance ? fmt(managerPerformance.total_pipeline) : '--'}
          </div>
          <div className="metric-sub text-positive">
            Weighted Pipeline: <strong style={{ color: 'var(--text-main)' }}>{managerPerformance ? fmt(managerPerformance.total_weighted_pipeline) : '--'}</strong>
          </div>
        </div>

        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-manager)' }}>
          <div className="metric-header">
            <span>Avg Conversion Rate</span>
            <TrendingUp size={16} style={{ color: 'var(--accent-manager)' }} />
          </div>
          <div className="metric-value">
            {managerPerformance ? `${managerPerformance.average_conversion.toFixed(1)}%` : '--'}
          </div>
          <div className="metric-sub text-positive">
            Expected Run-Rate: <strong style={{ color: 'var(--text-main)' }}>{managerPerformance ? `${managerPerformance.expected_run_rate}%` : '--'}</strong>
          </div>
        </div>

        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-regional)' }}>
          <div className="metric-header">
            <span>SLA Breaches & Overdue</span>
            <ShieldAlert size={16} style={{ color: 'var(--accent-regional)' }} />
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-regional)' }}>
            {managerPerformance ? `${managerPerformance.sla_breach_count} Breaches` : '--'}
          </div>
          <div className="metric-sub text-negative">
            Overdue Follow-ups: <strong style={{ color: 'var(--accent-regional)' }}>{managerPerformance ? managerPerformance.overdue_follow_ups : '--'}</strong>
          </div>
        </div>
      </div>

      {/* Target vs Achievement Visualizations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="glass-card">
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} style={{ color: 'var(--accent-manager)' }} />
            <span>Target vs Achievement Comparison</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Branch Target Progress</span>
                <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                  {managerPerformance ? `${managerPerformance.team_achievement_percentage.toFixed(1)}%` : '0%'}
                </span>
              </div>
              <div style={{ height: '10px', background: 'var(--input-bg)', borderRadius: '6px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: `${Math.min(100, managerPerformance?.team_achievement_percentage || 0)}%`, 
                    background: 'linear-gradient(90deg, var(--accent-manager) 0%, var(--accent-rm) 100%)',
                    borderRadius: '6px',
                    transition: 'width 0.5s ease'
                  }} 
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Expected Run-Rate Benchmark</span>
                <span style={{ fontWeight: 800, color: 'var(--accent-manager)' }}>
                  {managerPerformance ? `${managerPerformance.expected_run_rate}%` : '0%'}
                </span>
              </div>
              <div style={{ height: '10px', background: 'var(--input-bg)', borderRadius: '6px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: `${Math.min(100, managerPerformance?.expected_run_rate || 0)}%`, 
                    background: 'rgba(245, 166, 35, 0.6)',
                    borderRadius: '6px',
                    transition: 'width 0.5s ease'
                  }} 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} style={{ color: 'var(--accent-manager)' }} />
            <span>RM Target Achievement Distribution</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {rmRankings.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No RM data available.</div>
            ) : (
              rmRankings.map((rm) => (
                <div key={rm.rm_id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{rm.rm_name}</span>
                    <span style={{ fontWeight: 700, color: rm.achievement_percentage >= (managerPerformance?.expected_run_rate || 60) ? 'var(--accent-rm)' : 'var(--accent-regional)' }}>
                      {rm.achievement_percentage.toFixed(1)}% ({fmt(rm.achieved)} / {fmt(rm.target)})
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--input-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${Math.min(100, rm.achievement_percentage)}%`, 
                        background: rm.achievement_percentage >= (managerPerformance?.expected_run_rate || 60) ? 'var(--accent-rm)' : 'var(--accent-regional)',
                        borderRadius: '4px'
                      }} 
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 2. Split Grid: At-Risk RMs & Detection Feed */}
      <div id="misses-risk" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.5rem' }}>
        
        {/* At-Risk / Critical RMs Highlight */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid var(--accent-regional)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertTriangle size={18} color="var(--accent-regional)" />
              <span>At-Risk / Critical RMs ({atRiskRms.length})</span>
            </div>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Target Run-Rate Lag</span>
          </div>

          {atRiskRms.length === 0 ? (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
              No RMs currently at risk. All team members are performing at or above expected run-rate.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {atRiskRms.map((rmName, idx) => {
                const ranking = rmRankings.find(r => r.rm_name === rmName);
                return (
                  <div key={idx} style={{ background: 'var(--input-bg)', border: '1px solid rgba(241, 82, 111, 0.3)', borderRadius: '8px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>{rmName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-regional)', marginTop: '0.15rem' }}>
                        Achievement: {ranking ? `${ranking.achievement_percentage}%` : 'Below Target'} • Exp. {managerPerformance?.expected_run_rate}%
                      </div>
                    </div>
                    {ranking && (
                      <button
                        onClick={() => handleRowClick(ranking)}
                        style={{ background: 'rgba(241, 82, 111, 0.15)', border: '1px solid rgba(241, 82, 111, 0.4)', color: 'var(--accent-regional)', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Inspect RM
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Manager Alerts Feed */}
        <div id="alerts-feed" className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Operational Risk Alerts & Intent Signals ({systemAlerts ? systemAlerts.length : 0})
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Real-time Intelligence</span>
          </div>

          {!systemAlerts || systemAlerts.length === 0 ? (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
              No operational alerts currently pending for this branch.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '220px', overflowY: 'auto' }}>
              {systemAlerts.map((alt, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--input-bg)',
                    borderLeft: `4px solid ${
                      alt.severity === 'HIGH' ? 'var(--accent-regional)' : 'var(--accent-admin)'
                    }`,
                    borderRadius: '6px',
                    padding: '0.75rem 0.85rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {alt.rm_name} — {alt.type}
                    </div>
                    <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: alt.severity === 'HIGH' ? 'rgba(241, 82, 111, 0.15)' : 'rgba(245, 166, 35, 0.15)', color: alt.severity === 'HIGH' ? 'var(--accent-regional)' : '#f5a623', fontWeight: 700 }}>
                      {alt.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{alt.reason}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-rm)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                    Focus: {alt.recommended_focus}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. RM Performance Breakdown Table */}
      <div id="team-table" className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              RM Performance & Pipeline Breakdown ({rmRankings.length})
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              Real-time target achievement, pipeline volume, and risk status per Relationship Manager
            </div>
          </div>
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>RM Name</th>
                <th>Target</th>
                <th>Achieved</th>
                <th>Remaining Target</th>
                <th>Achievement %</th>
                <th>Open Pipeline</th>
                <th>Weighted Pipeline</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rmRankings.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1.5rem' }}>
                    No subordinate Relationship Managers found assigned to this branch team.
                  </td>
                </tr>
              ) : (
                rmRankings.map((rm) => (
                  <tr key={rm.rm_id} onClick={() => handleRowClick(rm)} style={{ cursor: 'pointer' }}>
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
                          {rm.rm_name ? rm.rm_name.substring(0, 2).toUpperCase() : 'RM'}
                        </div>
                        <div>
                          <div>{rm.rm_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Relationship Manager</div>
                        </div>
                      </div>
                    </td>
                    <td>{fmt(rm.target)}</td>
                    <td style={{ color: 'var(--accent-rm)', fontWeight: 700 }}>{fmt(rm.achieved)}</td>
                    <td>{fmt(rm.remaining_target)}</td>
                    <td style={{ fontWeight: 800, color: rm.achievement_percentage >= (managerPerformance?.expected_run_rate || 60) ? 'var(--accent-rm)' : 'var(--accent-regional)' }}>
                      {rm.achievement_percentage.toFixed(1)}%
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{fmt(rm.pipeline_value)}</td>
                    <td style={{ fontWeight: 600 }}>{fmt(rm.weighted_pipeline)}</td>
                    <td>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: rm.status === 'On Track' ? 'rgba(1, 197, 138, 0.15)' : 'rgba(241, 82, 111, 0.15)',
                          color: rm.status === 'On Track' ? 'var(--accent-rm)' : 'var(--accent-regional)',
                          border: `1px solid ${rm.status === 'On Track' ? 'rgba(1, 197, 138, 0.4)' : 'rgba(241, 82, 111, 0.4)'}`
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
                          background: 'rgba(245, 166, 35, 0.15)',
                          border: '1px solid rgba(245, 166, 35, 0.4)',
                          color: '#f5a623',
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. High-Value Opportunities Section */}
      <div id="high-value-opportunities" className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Briefcase size={18} style={{ color: 'var(--accent-manager)' }} />
              <span>High-Value Opportunities at Risk ({highValueLeads.length})</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Active branch opportunities exceeding ₹1.0L requiring manager tracking or reassignment
            </div>
          </div>
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Assigned RM</th>
                <th>Opportunity</th>
                <th>Potential Value</th>
                <th>Win Prob</th>
                <th>Stage</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {highValueLeads.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1.5rem' }}>
                    No high-value opportunities currently active in this branch.
                  </td>
                </tr>
              ) : (
                highValueLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {lead.customer_name || `Customer #${lead.customer_id || '--'}`}
                    </td>
                    <td style={{ fontWeight: 600 }}>{lead.rm_name || `RM #${lead.assigned_rm_id}`}</td>
                    <td>{lead.name}</td>
                    <td style={{ fontWeight: 800, color: 'var(--accent-rm)' }}>{fmt(lead.potential_value)}</td>
                    <td style={{ fontWeight: 700, color: '#f5a623' }}>{lead.probability}%</td>
                    <td>
                      <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'var(--input-bg)', border: '1px solid var(--border-glass-hover)', fontWeight: 600 }}>
                        {lead.stage}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: 700,
                        background: lead.status === 'OPEN' ? 'rgba(1, 197, 138, 0.15)' : 'rgba(245, 166, 35, 0.15)',
                        color: lead.status === 'OPEN' ? 'var(--accent-rm)' : '#f5a623'
                      }}>
                        {lead.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => openReassignModal('LEAD', lead)}
                        style={{
                          background: 'rgba(245, 166, 35, 0.15)',
                          border: '1px solid rgba(245, 166, 35, 0.4)',
                          color: '#f5a623',
                          borderRadius: '6px',
                          padding: '0.3rem 0.65rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <ArrowRightLeft size={14} />
                        Reassign
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Branch Action Center Section */}
      <div id="action-center" className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileCheck size={18} style={{ color: 'var(--accent-manager)' }} />
              <span>Branch Operational Action Center ({branchActions.length})</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Pending operational tasks generated by the intelligence engine for branch RMs
            </div>
          </div>
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Title / Type</th>
                <th>RM</th>
                <th>Reason / Description</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {branchActions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1.5rem' }}>
                    No pending operational actions currently require branch manager attention.
                  </td>
                </tr>
              ) : (
                branchActions.map((act) => {
                  const rmObj = rms.find(r => r.id === act.rm_id);
                  return (
                    <tr key={act.id}>
                      <td>
                        <span style={{
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: act.priority === 'CRITICAL' || act.priority === 'HIGH' ? 'rgba(241, 82, 111, 0.15)' : 'rgba(245, 166, 35, 0.15)',
                          color: act.priority === 'CRITICAL' || act.priority === 'HIGH' ? 'var(--accent-regional)' : '#f5a623'
                        }}>
                          {act.priority}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        {act.title || act.action_type}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {act.rm_name || (rmObj ? rmObj.username : (act.rm_id ? `RM #${act.rm_id}` : 'RM #N/A'))}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {act.description || act.reason || 'Operational action generated by event engine.'}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'var(--input-bg)', fontWeight: 600 }}>
                          {act.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => openReassignModal('ACTION', act)}
                            style={{
                              background: 'rgba(245, 166, 35, 0.15)',
                              border: '1px solid rgba(245, 166, 35, 0.4)',
                              color: '#f5a623',
                              borderRadius: '4px',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Reassign
                          </button>
                          <button
                            onClick={() => setResolveTarget(act)}
                            style={{
                              background: 'rgba(1, 197, 138, 0.15)',
                              border: '1px solid rgba(1, 197, 138, 0.4)',
                              color: 'var(--accent-rm)',
                              borderRadius: '4px',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Resolve
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. RM Workload Drilldown Modal */}
      {isDrilldownOpen && selectedRm && (
        <div className="modal-overlay" onClick={() => setIsDrilldownOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-manager)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.2rem' }}>
                  {selectedRm.rm_name ? selectedRm.rm_name.substring(0, 2).toUpperCase() : 'RM'}
                </div>
                <div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {selectedRm.rm_name} — Workload & Intervention
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Relationship Manager • {managerBranch?.name || 'Branch Team'}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsDrilldownOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>

            {isLoadingDrilldown ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading live performance, opportunities, and pending actions from backend...
              </div>
            ) : (
              <div>
                {/* Metrics Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'var(--input-bg)', padding: '0.85rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Achievement</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: (rmDetail?.performance?.achievement_percentage || 0) < 60 ? 'var(--accent-regional)' : 'var(--accent-rm)' }}>
                      {rmDetail?.performance ? `${rmDetail.performance.achievement_percentage}%` : '--'}
                    </div>
                  </div>
                  <div style={{ background: 'var(--input-bg)', padding: '0.85rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Open Pipeline</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {rmDetail?.performance ? fmt(rmDetail.performance.pipeline_value) : '--'}
                    </div>
                  </div>
                  <div style={{ background: 'var(--input-bg)', padding: '0.85rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Conversion Rate</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-manager)' }}>
                      {rmDetail?.performance ? `${rmDetail.performance.conversion_rate}%` : '--'}
                    </div>
                  </div>
                  <div style={{ background: 'var(--input-bg)', padding: '0.85rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Overdue Follow-ups</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: (rmDetail?.performance?.overdue_followups || 0) > 0 ? 'var(--accent-regional)' : 'var(--text-main)' }}>
                      {rmDetail?.performance ? rmDetail.performance.overdue_followups : '--'}
                    </div>
                  </div>
                </div>

                {/* RM Open Leads */}
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                  RM Opportunities ({rmDetail?.leads ? rmDetail.leads.length : 0})
                </div>
                <div style={{ marginBottom: '1.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {!rmDetail?.leads || rmDetail.leads.length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No active opportunities assigned to this RM.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {rmDetail.leads.map((l) => (
                        <div key={l.id} style={{ background: 'var(--input-bg)', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{l.name} — {l.customer_name || `Customer #${l.customer_id}`}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Value: {fmt(l.potential_value)} • Prob: {l.probability}% • Stage: {l.stage}</div>
                          </div>
                          <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(1, 197, 138, 0.15)', color: 'var(--accent-rm)', fontWeight: 700 }}>{l.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending Actions & Intervention Queue */}
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                  Intervention Queue & Pending Actions ({rmDetail?.actions ? rmDetail.actions.length : 0})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {!rmDetail?.actions || rmDetail.actions.length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No pending intervention actions for this RM.</div>
                  ) : (
                    rmDetail.actions.map((act) => (
                      <div key={act.id} style={{ background: 'var(--input-bg)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>{act.title || act.action_type}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Priority: {act.priority} • Status: {act.status}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. Reassign Modal */}
      {reassignTarget && (
        <div className="modal-overlay" onClick={() => setReassignTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Reassign {reassignTarget.type === 'LEAD' ? 'Opportunity' : 'Action'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Reassign item to another Relationship Manager within your branch team.
            </div>

            <form onSubmit={handleConfirmReassign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Select Target Branch RM *
                </label>
                <select
                  required
                  value={selectedNewRmId}
                  onChange={(e) => setSelectedNewRmId(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                >
                  <option value="">-- Choose Subordinate RM --</option>
                  {rms.map((rm) => (
                    <option key={rm.id} value={rm.id}>
                      {rm.username} (RM #{rm.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Reassignment Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Workload balancing / Specialized product focus"
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setReassignTarget(null)}
                  style={{ background: 'none', border: '1px solid var(--border-glass)', color: 'var(--text-muted)', padding: '0.55rem 1rem', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReassign || !selectedNewRmId}
                  style={{ background: 'var(--accent-manager)', border: 'none', color: '#fff', padding: '0.55rem 1.2rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isSubmittingReassign ? 'Reassigning...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Resolve Action Modal */}
      {resolveTarget && (
        <div className="modal-overlay" onClick={() => setResolveTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Resolve Action
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Mark this operational action as resolved by Branch Manager.
            </div>

            <form onSubmit={handleConfirmResolve} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Resolution Notes
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Reviewed with RM, customer follow-up completed."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setResolveTarget(null)}
                  style={{ background: 'none', border: '1px solid var(--border-glass)', color: 'var(--text-muted)', padding: '0.55rem 1rem', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResolve}
                  style={{ background: 'var(--accent-rm)', border: 'none', color: '#fff', padding: '0.55rem 1.2rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isSubmittingResolve ? 'Resolving...' : 'Mark Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
