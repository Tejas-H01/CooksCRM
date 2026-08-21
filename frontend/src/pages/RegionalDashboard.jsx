import React, { useState, useEffect } from 'react';
import { useEventContext } from '../context/EventContext';
import { apiService } from '../services/api';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Cell
} from 'recharts';
import { 
  Building2, 
  TrendingUp, 
  AlertTriangle, 
  Award, 
  Target, 
  MapPin, 
  Users, 
  CheckCircle2, 
  ShieldAlert, 
  Zap,
  ChevronRight,
  BarChart3,
  FileCheck,
  Briefcase,
  XCircle,
  Layers,
  ArrowRight
} from 'lucide-react';

const fmt = (val, divisor = 100000, decimals = 1) => {
  if (val === null || val === undefined) return '--';
  const num = parseFloat(val);
  if (isNaN(num)) return '--';
  return `\u20b9${(num / divisor).toFixed(decimals)}L`;
};

export const RegionalDashboard = () => {
  const { regionalDashboard, resolveRegionalAction, currentUser, eventLog } = useEventContext();

  const [sortField, setSortField] = useState('achievement'); // 'achievement' | 'pipeline' | 'sla'
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [branchDetail, setBranchDetail] = useState(null);
  const [isLoadingBranch, setIsLoadingBranch] = useState(false);

  // Action Resolution Modal
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  const openBranchDetail = async (branchId) => {
    setSelectedBranchId(branchId);
    setIsLoadingBranch(true);
    try {
      const data = await apiService.fetchRegionalBranchDetail(branchId);
      setBranchDetail(data);
    } catch (err) {
      console.error("Failed to fetch branch detail:", err);
      setBranchDetail(null);
    } finally {
      setIsLoadingBranch(false);
    }
  };

  const handleConfirmResolve = async (e) => {
    e.preventDefault();
    if (!resolveTarget) return;
    setIsSubmittingResolve(true);
    try {
      await resolveRegionalAction(resolveTarget.id, resolutionNotes);
      setResolveTarget(null);
      setResolutionNotes('');
    } catch (err) {
      console.error("Regional action resolution failed:", err);
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  const branchesData = regionalDashboard?.branch_performance || [];
  const sortedBranches = [...branchesData].sort((a, b) => {
    if (sortField === 'achievement') return b.achievement_percentage - a.achievement_percentage;
    if (sortField === 'pipeline') return b.pipeline - a.pipeline;
    if (sortField === 'sla') return b.sla_breaches - a.sla_breaches;
    return 0;
  });

  const chartBranchData = branchesData.map(b => ({
    name: b.branch_name.replace('Wealth Management ', '').replace('Branch ', ''),
    achievementPct: b.achievement_percentage,
    target: b.target / 100000,
    achieved: b.achieved / 100000,
    pipeline: b.pipeline / 100000
  }));

  const pipelineStageData = regionalDashboard?.pipeline_by_stage || [];
  const highValueOpps = regionalDashboard?.high_value_opportunities || [];
  const regionalActions = regionalDashboard?.actions || [];
  const risksList = regionalDashboard?.risks || [];
  const recognitionList = regionalDashboard?.recognition || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Good morning, {currentUser?.username || 'Regional Head'}! 👋
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Regional Dashboard — Multi-Branch Oversight & Strategic Operational Intelligence ({regionalDashboard?.region_name || 'Northern Region'})
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ 
            fontSize: '0.78rem', 
            background: 'rgba(241, 82, 111, 0.15)', 
            color: 'var(--accent-regional)', 
            padding: '0.35rem 0.75rem', 
            borderRadius: '20px', 
            fontWeight: 700, 
            border: '1px solid rgba(241, 82, 111, 0.4)' 
          }}>
            Regional Workspace • 3s Live Polling
          </span>
        </div>
      </div>

      {/* Dynamic Regional Executive Brief */}
      <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-regional)', background: 'linear-gradient(135deg, rgba(241, 82, 111, 0.06) 0%, rgba(62, 164, 245, 0.03) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
          <Zap size={18} style={{ color: 'var(--accent-regional)' }} />
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
            Regional Executive Operational Brief
          </span>
        </div>
        <div style={{ fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: '1.5', fontWeight: 500 }}>
          {regionalDashboard?.executive_brief || 'Loading live regional performance telemetry from PostgreSQL...'}
        </div>
      </div>

      {/* 8 Regional Executive KPI Cards */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        
        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-regional)' }}>
          <div className="metric-header">
            <span>Regional Target</span>
            <Target size={16} style={{ color: 'var(--accent-regional)' }} />
          </div>
          <div className="metric-value" style={{ color: 'var(--text-main)' }}>
            {regionalDashboard ? fmt(regionalDashboard.regional_target) : '--'}
          </div>
          <div className="metric-sub" style={{ color: 'var(--text-muted)' }}>
            Total Allocated Target
          </div>
        </div>

        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-regional)' }}>
          <div className="metric-header">
            <span>Achieved Revenue</span>
            <TrendingUp size={16} style={{ color: 'var(--accent-rm)' }} />
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-rm)' }}>
            {regionalDashboard ? fmt(regionalDashboard.regional_achieved) : '--'}
          </div>
          <div className="metric-sub text-positive">
            PostgreSQL Settled Total
          </div>
        </div>

        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-regional)' }}>
          <div className="metric-header">
            <span>Regional Achievement %</span>
            <Award size={16} style={{ color: 'var(--accent-regional)' }} />
          </div>
          <div className="metric-value" style={{ color: (regionalDashboard?.regional_achievement_percentage || 0) >= (regionalDashboard?.expected_run_rate || 67.74) ? 'var(--accent-rm)' : 'var(--accent-regional)' }}>
            {regionalDashboard ? `${regionalDashboard.regional_achievement_percentage.toFixed(1)}%` : '--'}
          </div>
          <div className="metric-sub" style={{ color: 'var(--text-muted)' }}>
            vs Expected Run-Rate: <strong style={{ color: 'var(--text-main)' }}>{regionalDashboard?.expected_run_rate}%</strong>
          </div>
        </div>

        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-regional)' }}>
          <div className="metric-header">
            <span>Total Regional Pipeline</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-regional)', fontWeight: 700 }}>Value</span>
          </div>
          <div className="metric-value">
            {regionalDashboard ? fmt(regionalDashboard.total_pipeline) : '--'}
          </div>
          <div className="metric-sub text-positive">
            Weighted: <strong style={{ color: 'var(--text-main)' }}>{regionalDashboard ? fmt(regionalDashboard.total_weighted_pipeline) : '--'}</strong>
          </div>
        </div>

        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-regional)' }}>
          <div className="metric-header">
            <span>Active Branches</span>
            <Building2 size={16} style={{ color: 'var(--accent-regional)' }} />
          </div>
          <div className="metric-value">
            {regionalDashboard ? regionalDashboard.active_branches_count : '--'}
          </div>
          <div className="metric-sub" style={{ color: 'var(--text-muted)' }}>
            Operational Branches
          </div>
        </div>

        <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-regional)' }}>
          <div className="metric-header">
            <span>Branches At Risk</span>
            <AlertTriangle size={16} style={{ color: 'var(--accent-regional)' }} />
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-regional)' }}>
            {regionalDashboard ? `${regionalDashboard.at_risk_branches_count} Branches` : '--'}
          </div>
          <div className="metric-sub text-negative">
            Lagging or SLA Breach
          </div>
        </div>
      </div>

      {/* Target vs Achievement & Branch Comparison Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.5rem' }}>
        
        {/* Regional Target Progress Bar */}
        <div className="glass-card">
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} style={{ color: 'var(--accent-regional)' }} />
            <span>Regional Target vs Achievement</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Overall Regional Achievement</span>
                <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                  {regionalDashboard ? `${regionalDashboard.regional_achievement_percentage.toFixed(1)}%` : '0%'}
                </span>
              </div>
              <div style={{ height: '12px', background: 'var(--input-bg)', borderRadius: '6px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: `${Math.min(100, regionalDashboard?.regional_achievement_percentage || 0)}%`, 
                    background: (regionalDashboard?.regional_achievement_percentage || 0) >= (regionalDashboard?.expected_run_rate || 67.74) 
                      ? 'linear-gradient(90deg, var(--accent-rm), #22c55e)' 
                      : 'linear-gradient(90deg, var(--accent-regional), #f5a623)',
                    transition: 'width 0.5s ease'
                  }} 
                />
              </div>
            </div>

            <div style={{ background: 'var(--input-bg)', padding: '1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Target Revenue:</span>
                <strong style={{ color: 'var(--text-main)' }}>{fmt(regionalDashboard?.regional_target)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Settled Revenue:</span>
                <strong style={{ color: 'var(--accent-rm)' }}>{fmt(regionalDashboard?.regional_achieved)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Expected Run-Rate Benchmark:</span>
                <strong style={{ color: '#f5a623' }}>{regionalDashboard?.expected_run_rate}%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Branch Performance Bar Chart */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} style={{ color: 'var(--accent-regional)' }} />
              <span>Branch Achievement % Comparison</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PostgreSQL Live Data</span>
          </div>

          <div style={{ height: '200px', width: '100%' }}>
            {chartBranchData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No branch data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartBranchData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 200]} unit="%" />
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass-hover)', borderRadius: '8px' }} 
                    formatter={(val) => [`${val}%`, 'Achievement']}
                  />
                  <Bar dataKey="achievementPct" radius={[6, 6, 0, 0]}>
                    {chartBranchData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.achievementPct >= (regionalDashboard?.expected_run_rate || 67.74) ? '#01c58a' : '#f1526f'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Branch Performance Table */}
      <div id="branch-performance" className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} style={{ color: 'var(--accent-regional)' }} />
              <span>Branch Performance Oversight ({sortedBranches.length} Branches)</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Real-time branch rankings, target achievement, pipeline, and SLA risk monitoring
            </div>
          </div>

          {/* Sort Control */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sort by:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--border-glass-hover)',
                color: 'var(--text-main)',
                borderRadius: '6px',
                padding: '0.3rem 0.6rem',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            >
              <option value="achievement">Target Achievement %</option>
              <option value="pipeline">Total Pipeline Value</option>
              <option value="sla">SLA Breaches</option>
            </select>
          </div>
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Branch Name</th>
                <th>Branch Manager</th>
                <th>Target</th>
                <th>Achieved</th>
                <th>Achievement %</th>
                <th>Target Gap</th>
                <th>Pipeline</th>
                <th>SLA Breaches</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedBranches.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1.5rem' }}>
                    No branches currently assigned to this region.
                  </td>
                </tr>
              ) : (
                sortedBranches.map((b) => (
                  <tr key={b.branch_id} style={{ cursor: 'pointer' }} onClick={() => openBranchDetail(b.branch_id)}>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Building2 size={15} style={{ color: 'var(--accent-regional)' }} />
                        <span>{b.branch_name}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{b.manager_name}</td>
                    <td>{fmt(b.target)}</td>
                    <td style={{ color: 'var(--accent-rm)', fontWeight: 700 }}>{fmt(b.achieved)}</td>
                    <td style={{ fontWeight: 800, color: b.achievement_percentage >= (regionalDashboard?.expected_run_rate || 67.74) ? 'var(--accent-rm)' : 'var(--accent-regional)' }}>
                      {b.achievement_percentage}%
                    </td>
                    <td>{fmt(b.target_gap)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{fmt(b.pipeline)}</td>
                    <td style={{ fontWeight: 700, color: b.sla_breaches > 0 ? 'var(--accent-regional)' : 'var(--text-muted)' }}>
                      {b.sla_breaches}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: b.status === 'On Track' ? 'rgba(1, 197, 138, 0.15)' : 'rgba(241, 82, 111, 0.15)',
                          color: b.status === 'On Track' ? 'var(--accent-rm)' : 'var(--accent-regional)',
                          border: `1px solid ${b.status === 'On Track' ? 'rgba(1, 197, 138, 0.4)' : 'rgba(241, 82, 111, 0.4)'}`
                        }}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openBranchDetail(b.branch_id);
                        }}
                        style={{
                          background: 'rgba(241, 82, 111, 0.15)',
                          border: '1px solid rgba(241, 82, 111, 0.4)',
                          color: 'var(--accent-regional)',
                          borderRadius: '6px',
                          padding: '0.3rem 0.65rem',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Inspect Branch
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Split Grid: Regional Risk & Recognition Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr', gap: '1.5rem' }}>
        
        {/* Regional Risk & Escalations */}
        <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-regional)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldAlert size={18} color="var(--accent-regional)" />
              <span>Regional Risks & Escalations ({risksList.length})</span>
            </div>
          </div>

          {risksList.length === 0 ? (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
              No active operational risks detected across regional branches.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto' }}>
              {risksList.map((r, idx) => (
                <div key={idx} style={{ background: 'var(--input-bg)', borderLeft: '4px solid var(--accent-regional)', borderRadius: '6px', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {r.branch_name} ({r.manager_name})
                    </span>
                    <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(241, 82, 111, 0.15)', color: 'var(--accent-regional)', fontWeight: 800 }}>
                      {r.severity} • {r.category}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{r.reason}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--accent-rm)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                    Focus: {r.recommended_action}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Regional Recognition & Highlights */}
        <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-rm)' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Award size={18} color="var(--accent-rm)" />
            <span>Regional Highlights & Recognition</span>
          </div>

          {recognitionList.length === 0 ? (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
              No branch milestones detected yet for the current period.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recognitionList.map((rec, idx) => (
                <div key={idx} style={{ background: 'var(--input-bg)', border: '1px solid rgba(1, 197, 138, 0.3)', borderRadius: '8px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      🏆 {rec.title}: {rec.branch_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      Branch Manager: {rec.manager_name}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-rm)', background: 'rgba(1, 197, 138, 0.15)', padding: '0.25rem 0.65rem', borderRadius: '6px' }}>
                    {rec.metric}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* High-Value Regional Opportunities Table */}
      <div id="regional-opportunities" className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Briefcase size={18} style={{ color: 'var(--accent-regional)' }} />
              <span>High-Value Regional Opportunities (&ge; ₹1.0L)</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Top active opportunities across all regional branches
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
              </tr>
            </thead>
            <tbody>
              {highValueOpps.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1.5rem' }}>
                    No high-value opportunities currently active in this region.
                  </td>
                </tr>
              ) : (
                highValueOpps.map((lead) => (
                  <tr key={lead.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {lead.customer_name || `Customer #${lead.customer_id}`}
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regional Action Center */}
      <div id="regional-actions" className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileCheck size={18} style={{ color: 'var(--accent-regional)' }} />
              <span>Regional Action Center ({regionalActions.length})</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Operational actions across regional branches requiring strategic oversight
            </div>
          </div>
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Title / Type</th>
                <th>Assigned RM</th>
                <th>Description</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {regionalActions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1.5rem' }}>
                    No actions currently pending across regional branches.
                  </td>
                </tr>
              ) : (
                regionalActions.map((act) => (
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
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{act.title || act.action_type}</td>
                    <td style={{ fontWeight: 600 }}>{act.rm_name || `RM #${act.rm_id}`}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{act.description || act.reason || 'Operational action'}</td>
                    <td>
                      <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'var(--input-bg)', fontWeight: 600 }}>
                        {act.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setResolveTarget(act)}
                        style={{
                          background: 'rgba(241, 82, 111, 0.15)',
                          border: '1px solid rgba(241, 82, 111, 0.4)',
                          color: 'var(--accent-regional)',
                          borderRadius: '6px',
                          padding: '0.3rem 0.65rem',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Resolve Action
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Branch Detail Modal */}
      {selectedBranchId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '750px', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.85rem' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={20} style={{ color: 'var(--accent-regional)' }} />
                <span>{branchDetail?.branch_name || 'Branch Detail Inspection'}</span>
              </div>
              <button onClick={() => setSelectedBranchId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <XCircle size={20} />
              </button>
            </div>

            {isLoadingBranch ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading branch telemetry...</div>
            ) : branchDetail ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div style={{ background: 'var(--input-bg)', padding: '1rem', borderRadius: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Branch Manager</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>{branchDetail.manager?.username || 'Unassigned'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Branch Target / Achieved</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-rm)' }}>{fmt(branchDetail.performance?.team_achievement)} / {fmt(branchDetail.performance?.team_target)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Achievement %</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-regional)' }}>{branchDetail.performance?.team_achievement_percentage?.toFixed(1)}%</div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    Subordinate RMs ({branchDetail.subordinate_rms?.length || 0})
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {branchDetail.subordinate_rms?.map(rm => (
                      <span key={rm.id} style={{ background: 'var(--input-bg)', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                        👤 {rm.username}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    Active Branch Opportunities ({branchDetail.leads?.length || 0})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '150px', overflowY: 'auto' }}>
                    {branchDetail.leads?.map(l => (
                      <div key={l.id} style={{ background: 'var(--input-bg)', padding: '0.5rem 0.75rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span>{l.name} ({l.customer_name})</span>
                        <strong style={{ color: 'var(--accent-rm)' }}>{fmt(l.potential_value)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>Unable to load branch details.</div>
            )}
          </div>
        </div>
      )}

      {/* Resolve Action Modal */}
      {resolveTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>Resolve Regional Action</div>
              <button onClick={() => setResolveTarget(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmResolve} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}>
                  Action Title
                </label>
                <input type="text" readOnly value={resolveTarget.title || resolveTarget.action_type} style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', fontSize: '0.88rem' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}>
                  Resolution Notes / Management Action
                </label>
                <textarea rows={3} required value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="Enter resolution notes..." style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', fontSize: '0.88rem' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setResolveTarget(null)} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmittingResolve} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'var(--accent-regional)', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                  {isSubmittingResolve ? 'Saving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
