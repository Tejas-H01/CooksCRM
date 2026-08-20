import React, { useState, useEffect } from 'react';
import { useEventContext } from '../context/EventContext';
import { useToast } from '../context/ToastContext';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  PieChart as RechartsPie,
  Pie,
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
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldAlert, 
  Zap,
  ChevronRight,
  Filter,
  BarChart3,
  CheckSquare,
  PieChart,
  Activity,
  Send,
  MessageSquare,
  Sparkles,
  Info
} from 'lucide-react';

export const RegionalDashboard = () => {
  const { branches, systemAlerts, eventLog, triggerEvent, regionalPerformance } = useEventContext();
  const { showToast } = useToast();

  const [timePeriod, setTimePeriod] = useState('month'); // 'today' | 'week' | 'month'
  const [sortField, setSortField] = useState('achievement'); // 'achievement' | 'runRate' | 'conversion' | 'sla'
  const [selectedBranchDrill, setSelectedBranchDrill] = useState(null);
  const [actionNotes, setActionNotes] = useState({});

  // Mock regional high-value teams / branches dataset
  const [teamsData, setTeamsData] = useState([
    {
      id: "branch-west",
      name: "West Team / Mumbai Central",
      manager: "Anita Verma",
      target: 35000000, // ₹3.5 Cr
      achieved: 31000000, // ₹3.1 Cr
      achievedPct: 88.5,
      runRate: 91,
      conversion: 24.2,
      pipeline: 18000000,
      overdue: 3,
      slaBreaches: 2,
      riskLevel: "Low",
      riskColor: "#01c58a",
      rms: [
        { name: "Rahul Sharma", target: "₹50L", achieved: "₹48L", conv: "26%", status: "On Track" },
        { name: "Neha Iyer", target: "₹60L", achieved: "₹64L", conv: "28%", status: "Top Performer" }
      ]
    },
    {
      id: "branch-north",
      name: "North Team / Delhi West",
      manager: "Karan Malhotra",
      target: 30000000, // ₹3.0 Cr
      achieved: 26000000, // ₹2.6 Cr
      achievedPct: 86.6,
      runRate: 88,
      conversion: 22.0,
      pipeline: 14000000,
      overdue: 4,
      slaBreaches: 2,
      riskLevel: "Low",
      riskColor: "#01c58a",
      rms: [
        { name: "Vikas Gupta", target: "₹45L", achieved: "₹42L", conv: "23%", status: "On Track" },
        { name: "Pooja Singh", target: "₹50L", achieved: "₹49L", conv: "24%", status: "On Track" }
      ]
    },
    {
      id: "branch-east",
      name: "East Team / Kolkata Central",
      manager: "Subhash Roy",
      target: 30000000, // ₹3.0 Cr
      achieved: 23000000, // ₹2.3 Cr
      achievedPct: 76.6,
      runRate: 82,
      conversion: 19.5,
      pipeline: 11000000,
      overdue: 9,
      slaBreaches: 5,
      riskLevel: "Medium",
      riskColor: "#fca004",
      rms: [
        { name: "Amitav Ghosh", target: "₹40L", achieved: "₹30L", conv: "18%", status: "At Risk" },
        { name: "Rina Das", target: "₹45L", achieved: "₹38L", conv: "20%", status: "On Track" }
      ]
    },
    {
      id: "branch-south",
      name: "South Team / Bangalore South",
      manager: "Priya Reddy",
      target: 30000000, // ₹3.0 Cr
      achieved: 18000000, // ₹1.8 Cr
      achievedPct: 60.0,
      runRate: 75,
      conversion: 14.2,
      pipeline: 9000000,
      overdue: 14,
      slaBreaches: 8,
      riskLevel: "High",
      riskColor: "#f1526f",
      rms: [
        { name: "Siddharth Nair", target: "₹50L", achieved: "₹28L", conv: "13%", status: "Action Required" },
        { name: "Kavita Rao", target: "₹45L", achieved: "₹26L", conv: "15%", status: "Action Required" }
      ]
    }
  ]);

  useEffect(() => {
    if (Array.isArray(regionalPerformance) && regionalPerformance.length > 0) {
      const mapped = regionalPerformance.map(p => {
        const branchObj = branches.find(b => b.id === p.team_id);
        return {
          id: p.team_id,
          name: p.team_name,
          manager: branchObj?.manager_name || "Anita Verma",
          target: p.team_target,
          achieved: p.team_achievement,
          achievedPct: p.team_achievement_percentage,
          runRate: p.expected_run_rate,
          conversion: p.average_conversion,
          pipeline: p.total_pipeline,
          overdue: p.overdue_follow_ups,
          slaBreaches: p.sla_breach_count,
          riskLevel: p.team_achievement_percentage >= p.expected_run_rate ? "Low" : "High",
          riskColor: p.team_achievement_percentage >= p.expected_run_rate ? "#01c58a" : "#f1526f",
          rms: p.rm_rankings.map(r => ({
            name: r.rm_name,
            target: `₹${(p.team_target / (p.rm_rankings.length || 1) / 100000).toFixed(0)}L`,
            achieved: `₹${(r.pipeline_value / 100000).toFixed(0)}L`,
            conv: `${r.conversion_rate.toFixed(1)}%`,
            status: r.achievement_percentage >= p.expected_run_rate ? "On Track" : "At Risk"
          }))
        };
      });
      setTeamsData(mapped);
    }
  }, [regionalPerformance, branches]);

  // High Value Opportunities across region
  const [opportunities, setOpportunities] = useState([
    {
      id: "opp-1",
      title: "₹85L Wealth Mandate",
      customer: "ABC Corp Ltd",
      team: "South Team",
      manager: "Priya Reddy",
      rm: "Siddharth Nair",
      value: 8500000,
      intent: "High (92%)",
      status: "No follow-up for 3 days",
      risk: "HIGH",
      riskColor: "#f1526f"
    },
    {
      id: "opp-2",
      title: "₹50L Equity Mutual Fund Pay-in",
      customer: "Apex Logistics",
      team: "East Team",
      manager: "Subhash Roy",
      rm: "Amitav Ghosh",
      value: 5000000,
      intent: "High (88%)",
      status: "Verification Pending",
      risk: "MEDIUM",
      riskColor: "#fca004"
    },
    {
      id: "opp-3",
      title: "₹40L Treasury Bond Investment",
      customer: "Zenith Enterprises",
      team: "West Team",
      manager: "Anita Verma",
      rm: "Rahul Sharma",
      value: 4000000,
      intent: "Very High (95%)",
      status: "Proposal Sent",
      risk: "LOW",
      riskColor: "#01c58a"
    }
  ]);

  // Regional Action Center items
  const [regionalActions, setRegionalActions] = useState([
    {
      id: "reg-act-1",
      severity: "CRITICAL",
      severityColor: "#f1526f",
      title: "Team South Target SLA Breach",
      team: "South Team / Bangalore South",
      description: "Team is at 60% achievement vs 75% expected. 14 overdue follow-ups and 6 high-value leads uncontacted.",
      time: "10 mins ago",
      assignedManager: "Priya Reddy"
    },
    {
      id: "reg-act-2",
      severity: "HIGH",
      severityColor: "#fca004",
      title: "Insurance Product Contribution Shortfall",
      team: "East Team / Kolkata Central",
      description: "Insurance target gap is -₹1.2 Cr across East and South branches.",
      time: "25 mins ago",
      assignedManager: "Subhash Roy"
    },
    {
      id: "reg-act-3",
      severity: "MEDIUM",
      severityColor: "#3ea4f5",
      title: "Reassign Untouched High-Intent Lead",
      team: "South Team",
      description: "Lead 'Kavita Rao' ₹45L uncontacted for 48h.",
      time: "1 hour ago",
      assignedManager: "Priya Reddy"
    }
  ]);

  // Product Intelligence dataset
  const productIntelligence = [
    { name: "Mutual Funds", target: "₹4.5 Cr", achieved: "₹4.0 Cr", conv: "25%", growth: "+12%", status: "On Track" },
    { name: "Insurance", target: "₹3.0 Cr", achieved: "₹1.8 Cr", conv: "18%", growth: "+4%", status: "Gap Primary Driver" },
    { name: "Bonds & NCDs", target: "₹2.0 Cr", achieved: "₹1.2 Cr", conv: "14%", growth: "-8%", status: "Declining" },
    { name: "Wealth PMS", target: "₹3.0 Cr", achieved: "₹2.8 Cr", conv: "28%", growth: "+18%", status: "Top Performer" }
  ];

  // Sorting logic for teams table
  const sortedTeams = [...teamsData].sort((a, b) => {
    if (sortField === 'achievement') return b.achievedPct - a.achievedPct;
    if (sortField === 'runRate') return b.runRate - a.runRate;
    if (sortField === 'conversion') return b.conversion - a.conversion;
    if (sortField === 'sla') return b.slaBreaches - a.slaBreaches;
    return 0;
  });

  const handleEscalateOpportunity = (opp) => {
    showToast(`🚨 Opportunity escalated to ${opp.manager} (Regional Head Override)!`, 'error');
    setOpportunities(prev => prev.map(o => o.id === opp.id ? { ...o, status: "Escalated to Regional Head", risk: "ESCALATED" } : o));
  };

  const handleActionResolve = (actionId) => {
    setRegionalActions(prev => prev.filter(a => a.id !== actionId));
    showToast(`✅ Action resolved and logged in regional audit trail.`, 'success');
  };

  const handleSendManagerNote = (teamId, managerName) => {
    const note = actionNotes[teamId];
    if (!note) return;
    showToast(`📩 Regional Note sent to Manager ${managerName}: "${note}"`, 'info');
    setActionNotes(prev => ({ ...prev, [teamId]: '' }));
  };

  // Pie chart colors
  const COLORS = ['#01c58a', '#3ea4f5', '#fca004', '#f1526f'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* 1. EXECUTIVE NATURAL-LANGUAGE REGIONAL SUMMARY BANNER */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(241, 82, 111, 0.12), rgba(62, 164, 245, 0.12))',
          border: '1px solid rgba(241, 82, 111, 0.3)',
          padding: '1.25rem 1.5rem',
          borderRadius: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyBetween: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--accent-regional)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 0 15px rgba(241, 82, 111, 0.4)' }}>
              <Sparkles size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Regional Executive Brief & Performance Engine</span>
                <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--accent-regional)', color: '#fff', fontWeight: 700 }}>LIVE ANALYSIS</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '0.4rem', lineHeight: 1.5 }}>
                Region is at <strong>78.4% achievement (₹9.8 Cr)</strong> against an expected <strong>84.0% run-rate</strong>. The primary target gap is driven by <strong>Team South (-₹1.2 Cr)</strong> due to lower conversion (14.2%) and insufficient pipeline. <strong>6 high-value opportunities</strong> require immediate regional intervention.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button
              onClick={() => showToast('⚡ Regional Executive Sync Requested with all 4 Branch Managers', 'info')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'var(--accent-regional)',
                border: 'none',
                color: '#fff',
                borderRadius: '8px',
                padding: '0.55rem 0.95rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Send size={14} />
              <span>Request Managers Sync</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. REGIONAL OVERVIEW LIVE KPIS (12 KEY METRICS) */}
      <div id="regional-overview">
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={20} style={{ color: 'var(--accent-regional)' }} />
          <span>Regional Overview & High-Level KPIs</span>
        </div>

        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-regional)' }}>
            <div className="metric-header">
              <span>Regional Target</span>
              <Target size={16} style={{ color: 'var(--accent-regional)' }} />
            </div>
            <div className="metric-value">₹12.5 Cr</div>
            <div className="metric-sub text-muted">Monthly Target</div>
          </div>

          <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-rm)' }}>
            <div className="metric-header">
              <span>Regional Achievement</span>
              <TrendingUp size={16} style={{ color: 'var(--accent-rm)' }} />
            </div>
            <div className="metric-value" style={{ color: 'var(--accent-rm)' }}>₹9.8 Cr</div>
            <div className="metric-sub text-positive">78.4% Achieved</div>
          </div>

          <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-manager)' }}>
            <div className="metric-header">
              <span>Expected Run-rate</span>
              <BarChart3 size={16} style={{ color: 'var(--accent-manager)' }} />
            </div>
            <div className="metric-value">84.0%</div>
            <div className="metric-sub text-negative">Target Gap: -5.6%</div>
          </div>

          <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-admin)' }}>
            <div className="metric-header">
              <span>Total Pipeline Value</span>
              <Zap size={16} style={{ color: 'var(--accent-admin)' }} />
            </div>
            <div className="metric-value">₹4.2 Cr</div>
            <div className="metric-sub text-positive">Active Deals</div>
          </div>

          <div className="glass-card metric-card">
            <div className="metric-header">
              <span>Conversion Rate</span>
              <Activity size={16} style={{ color: 'var(--accent-rm)' }} />
            </div>
            <div className="metric-value">18.5%</div>
            <div className="metric-sub text-muted">Regional Average</div>
          </div>

          <div className="glass-card metric-card">
            <div className="metric-header">
              <span>Active Customers</span>
              <Users size={16} style={{ color: 'var(--accent-manager)' }} />
            </div>
            <div className="metric-value">450</div>
            <div className="metric-sub text-positive">1,240 Total Leads</div>
          </div>

          <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-regional)' }}>
            <div className="metric-header">
              <span>SLA Breaches</span>
              <AlertTriangle size={16} style={{ color: 'var(--accent-regional)' }} />
            </div>
            <div className="metric-value" style={{ color: 'var(--accent-regional)' }}>17</div>
            <div className="metric-sub text-negative">24 Overdue Follow-ups</div>
          </div>

          <div className="glass-card metric-card" style={{ borderTop: '3px solid var(--accent-regional)' }}>
            <div className="metric-header">
              <span>Opportunities at Risk</span>
              <ShieldAlert size={16} style={{ color: 'var(--accent-regional)' }} />
            </div>
            <div className="metric-value" style={{ color: 'var(--accent-regional)' }}>6</div>
            <div className="metric-sub text-negative">High Value Uncontacted</div>
          </div>
        </div>
      </div>

      {/* 3. TEAM / BRANCH PERFORMANCE COMPARISON TABLE */}
      <div id="teams-branches" className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={20} style={{ color: 'var(--accent-regional)' }} />
              <span>Team & Branch Performance Benchmarking</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Click any team row to launch 4-level drill-down: <strong>Region → Branch Manager → RMs → Customer/Lead</strong>
            </div>
          </div>

          {/* Sort Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sort By:</span>
            {[
              { id: 'achievement', label: '% Achievement' },
              { id: 'runRate', label: 'Run-rate' },
              { id: 'conversion', label: 'Conversion' },
              { id: 'sla', label: 'SLA Breaches' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setSortField(f.id)}
                style={{
                  background: sortField === f.id ? 'var(--accent-regional)' : 'var(--input-bg)',
                  border: `1px solid ${sortField === f.id ? 'var(--accent-regional)' : 'var(--border-glass)'}`,
                  color: sortField === f.id ? '#fff' : 'var(--text-main)',
                  borderRadius: '6px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Team / Branch</th>
                <th>Branch Manager</th>
                <th>Target</th>
                <th>Achieved</th>
                <th>Achievement %</th>
                <th>Run-rate</th>
                <th>Conversion</th>
                <th>SLA / Overdue</th>
                <th>Risk Level</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team) => (
                <tr 
                  key={team.id}
                  onClick={() => setSelectedBranchDrill(team)}
                  style={{ cursor: 'pointer', transition: 'background 0.2s ease' }}
                  className="table-row-hover"
                >
                  <td style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>{team.name}</span>
                      <ChevronRight size={14} style={{ color: 'var(--accent-regional)' }} />
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{team.manager}</td>
                  <td>₹{(team.target / 10000000).toFixed(1)} Cr</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-rm)' }}>₹{(team.achieved / 10000000).toFixed(1)} Cr</td>
                  <td>
                    <span style={{ fontWeight: 800, color: team.achievedPct >= 80 ? 'var(--accent-rm)' : 'var(--accent-regional)' }}>
                      {team.achievedPct}%
                    </span>
                  </td>
                  <td>{team.runRate}%</td>
                  <td>{team.conversion}%</td>
                  <td style={{ color: team.slaBreaches > 3 ? 'var(--accent-regional)' : 'var(--text-main)' }}>
                    {team.slaBreaches} breaches ({team.overdue} overdue)
                  </td>
                  <td>
                    <span style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, background: `${team.riskColor}20`, color: team.riskColor, border: `1px solid ${team.riskColor}50` }}>
                      {team.riskLevel.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBranchDrill(team);
                      }}
                      style={{ background: 'var(--accent-regional)', border: 'none', color: '#fff', borderRadius: '6px', padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
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

      {/* 4. PERFORMANCE TRENDS & CHARTS */}
      <div id="performance-trends" style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem' }}>
        
        {/* Trend Bar Chart */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>Target vs Achievement Trends</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Multi-branch revenue contribution comparison</div>
            </div>

            {/* Time Period Tabs */}
            <div style={{ display: 'flex', background: 'var(--input-bg)', borderRadius: '8px', padding: '0.2rem' }}>
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTimePeriod(t.id)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: timePeriod === t.id ? 'var(--accent-regional)' : 'transparent',
                    color: timePeriod === t.id ? '#fff' : 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: '100%', height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickFormatter={(val) => val.split('/')[0]} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(val) => `₹${val / 10000000}Cr`} />
                <Tooltip contentStyle={{ background: 'var(--modal-bg)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-main)' }} />
                <Bar dataKey="target" name="Target" fill="var(--border-glass-hover)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="achieved" name="Achieved" fill="var(--accent-regional)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Contribution Pie Chart */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
              Team Revenue Contribution
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Proportion of total regional achievement
            </div>

            <div style={{ width: '100%', height: 180, display: 'flex', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={teamsData}
                    dataKey="achieved"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={40}
                  >
                    {teamsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--modal-bg)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-main)' }} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
            {teamsData.map((t, idx) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[idx % COLORS.length] }} />
                <span>{t.name.split('/')[0]} ({((t.achieved / 98000000) * 100).toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. REGIONAL MISS DETECTION & ALERTS */}
      <div id="misses-risks" className="glass-card">
        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={20} style={{ color: 'var(--accent-regional)' }} />
          <span>Regional Miss & Risk Detection Engine</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ background: 'rgba(241, 82, 111, 0.1)', border: '1px solid rgba(241, 82, 111, 0.3)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-regional)' }}>
                ⚠ Team South Performance Shortfall
              </div>
              <span style={{ fontSize: '0.72rem', background: 'var(--accent-regional)', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                CRITICAL GAP
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginBottom: '0.75rem' }}>
              Achievement: <strong>60% (₹1.8 Cr)</strong> vs Expected: <strong>75% (₹2.25 Cr)</strong>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div>• <strong>Conversion down 8%</strong> (currently 14.2% vs 22% regional avg)</div>
              <div>• <strong>₹45L pipeline at risk</strong> across 6 high-value accounts</div>
              <div>• <strong>14 overdue follow-ups</strong> & 6 high-value leads uncontacted</div>
            </div>
          </div>

          <div style={{ background: 'rgba(252, 160, 4, 0.1)', border: '1px solid rgba(252, 160, 4, 0.3)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-admin)' }}>
                ⚠ East Team SLA Breach Spike
              </div>
              <span style={{ fontSize: '0.72rem', background: 'var(--accent-admin)', color: '#000', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                WARNING
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginBottom: '0.75rem' }}>
              5 SLA breaches recorded in Kolkata Central branch in last 24 hours.
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div>• <strong>Primary Driver:</strong> RM Amitav Ghosh overdue on 4 wealth inquiries</div>
              <div>• <strong>Action Required:</strong> Reassign high-intent accounts to Rina Das</div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. REGIONAL OPPORTUNITY MONITOR */}
      <div id="opportunities" className="glass-card">
        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Target size={20} style={{ color: 'var(--accent-rm)' }} />
          <span>Regional High-Value Opportunity Monitor</span>
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Opportunity</th>
                <th>Customer Name</th>
                <th>Team / Branch</th>
                <th>Assigned RM</th>
                <th>Potential Value</th>
                <th>Status / SLA Risk</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp) => (
                <tr key={opp.id}>
                  <td style={{ fontWeight: 800, color: 'var(--text-main)' }}>{opp.title}</td>
                  <td>{opp.customer}</td>
                  <td>{opp.team}</td>
                  <td style={{ fontWeight: 600 }}>{opp.rm} ({opp.manager})</td>
                  <td style={{ fontWeight: 800, color: 'var(--accent-rm)' }}>₹{(opp.value / 100000).toFixed(1)} Lakhs</td>
                  <td style={{ color: opp.riskColor, fontWeight: 700 }}>{opp.status}</td>
                  <td>
                    <button
                      onClick={() => handleEscalateOpportunity(opp)}
                      style={{ background: 'var(--accent-regional)', border: 'none', color: '#fff', borderRadius: '6px', padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Escalate to Manager
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. REGIONAL RECOGNITION & BENCHMARKING MATRIX */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Recognition Feed */}
        <div id="recognition-feed" className="glass-card">
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={20} style={{ color: '#fca004' }} />
            <span>Regional Recognition & Victories 🏆</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ background: 'rgba(1, 197, 138, 0.1)', border: '1px solid rgba(1, 197, 138, 0.3)', borderRadius: '10px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-rm)' }}>
                🏆 Team North crossed 120% monthly target!
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
                Conversion: <strong>28% (Regional Best)</strong> led by Manager Karan Malhotra.
              </div>
            </div>

            <div style={{ background: 'rgba(62, 164, 245, 0.1)', border: '1px solid rgba(62, 164, 245, 0.3)', borderRadius: '10px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-manager)' }}>
                🎉 Dormant Customer Recovery Win
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
                RM Neha Iyer (Mumbai Central) recovered ₹35L SIP from high-net-worth client.
              </div>
            </div>
          </div>
        </div>

        {/* Benchmarking Matrix */}
        <div id="benchmarking" className="glass-card">
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} style={{ color: 'var(--accent-manager)' }} />
            <span>Regional Benchmarking vs Median</span>
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', background: 'var(--input-bg)', borderRadius: '8px', padding: '0.85rem', lineHeight: 1.5 }}>
            <div style={{ fontWeight: 800, color: 'var(--accent-regional)', marginBottom: '0.3rem' }}>
              Team South vs Regional Median Breakdown
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <div>Achievement: <strong style={{ color: 'var(--accent-regional)' }}>↓ 18%</strong></div>
              <div>Conversion: <strong style={{ color: 'var(--accent-regional)' }}>↓ 6%</strong></div>
              <div>Pipeline: <strong style={{ color: 'var(--accent-regional)' }}>↓ 12%</strong></div>
              <div>Activity: <strong style={{ color: 'var(--accent-rm)' }}>↑ 4%</strong></div>
            </div>
            <div style={{ fontSize: '0.78rem', marginTop: '0.5rem', color: 'var(--text-main)', fontStyle: 'italic' }}>
              Primary issue: High activity with weak conversion + insufficient pipeline.
            </div>
          </div>
        </div>
      </div>

      {/* 8. REGIONAL ACTION CENTER ("REQUIRES REGIONAL ATTENTION") */}
      <div id="action-center" className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckSquare size={20} style={{ color: 'var(--accent-regional)' }} />
              <span>Regional Action Center — Requires Regional Attention</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', fontSize: '0.78rem', fontWeight: 800 }}>
            <span style={{ background: 'rgba(241, 82, 111, 0.2)', color: 'var(--accent-regional)', padding: '0.35rem 0.75rem', borderRadius: '6px' }}>
              🔴 6 Critical
            </span>
            <span style={{ background: 'rgba(252, 160, 4, 0.2)', color: 'var(--accent-admin)', padding: '0.35rem 0.75rem', borderRadius: '6px' }}>
              🟠 14 High
            </span>
            <span style={{ background: 'rgba(62, 164, 245, 0.2)', color: 'var(--accent-manager)', padding: '0.35rem 0.75rem', borderRadius: '6px' }}>
              🟡 23 Medium
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {regionalActions.map((act) => (
            <div key={act.id} style={{ background: 'var(--input-bg)', borderLeft: `4px solid ${act.severityColor}`, borderRadius: '8px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.9rem' }}>{act.title}</span>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: `${act.severityColor}20`, color: act.severityColor, fontWeight: 700 }}>
                    {act.severity}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {act.description} • <em>{act.team}</em> ({act.assignedManager})
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleActionResolve(act.id)}
                  style={{ background: 'var(--accent-rm)', border: 'none', color: '#fff', borderRadius: '6px', padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Mark Resolved
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 9. CROSS-TEAM PRODUCT INTELLIGENCE */}
      <div id="product-intelligence" className="glass-card">
        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PieChart size={20} style={{ color: 'var(--accent-manager)' }} />
          <span>Cross-Team Product Performance Intelligence</span>
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Product Line</th>
                <th>Target</th>
                <th>Achieved</th>
                <th>Conversion Rate</th>
                <th>Growth vs Prev</th>
                <th>Status Takeaway</th>
              </tr>
            </thead>
            <tbody>
              {productIntelligence.map((prod, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 800, color: 'var(--text-main)' }}>{prod.name}</td>
                  <td>{prod.target}</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-rm)' }}>{prod.achieved}</td>
                  <td>{prod.conv}</td>
                  <td style={{ color: prod.growth.startsWith('+') ? 'var(--accent-rm)' : 'var(--accent-regional)', fontWeight: 700 }}>{prod.growth}</td>
                  <td style={{ fontWeight: 600 }}>{prod.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(241, 82, 111, 0.1)', borderLeft: '4px solid var(--accent-regional)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-main)' }}>
          💡 <strong>Key Regional Insight:</strong> Insurance is the largest contributor to the regional target gap (-₹1.2 Cr). Reallocating RM focus to Insurance cross-sell can recover the gap.
        </div>
      </div>

      {/* 4-LEVEL DRILL-DOWN MODAL */}
      {selectedBranchDrill && (
        <div className="modal-overlay" onClick={() => setSelectedBranchDrill(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  4-Level Regional Drill-Down: {selectedBranchDrill.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Region → Branch Manager ({selectedBranchDrill.manager}) → RMs → Leads
                </div>
              </div>
              <button onClick={() => setSelectedBranchDrill(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>
                ✕
              </button>
            </div>

            {/* Manager Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'var(--input-bg)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target / Achieved</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-rm)' }}>
                  ₹{(selectedBranchDrill.achieved / 10000000).toFixed(1)}Cr / ₹{(selectedBranchDrill.target / 10000000).toFixed(1)}Cr
                </div>
              </div>
              <div style={{ background: 'var(--input-bg)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Run-rate / Conversion</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-manager)' }}>
                  {selectedBranchDrill.runRate}% / {selectedBranchDrill.conversion}%
                </div>
              </div>
              <div style={{ background: 'var(--input-bg)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SLA Breaches</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-regional)' }}>
                  {selectedBranchDrill.slaBreaches} Breaches ({selectedBranchDrill.overdue} Overdue)
                </div>
              </div>
            </div>

            {/* RM Breakdown Table */}
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Relationship Managers (RMs) in {selectedBranchDrill.name}
            </div>

            <div className="custom-table-container" style={{ marginBottom: '1rem' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>RM Name</th>
                    <th>Target</th>
                    <th>Achieved</th>
                    <th>Conversion</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBranchDrill.rms.map((rm, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{rm.name}</td>
                      <td>{rm.target}</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-rm)' }}>{rm.achieved}</td>
                      <td>{rm.conv}</td>
                      <td>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', background: rm.status.includes('Top') ? 'rgba(1,197,138,0.2)' : 'rgba(241,82,111,0.2)', color: rm.status.includes('Top') ? 'var(--accent-rm)' : 'var(--accent-regional)' }}>
                          {rm.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Direct Note to Manager */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 700 }}>
                Send Direct Regional Note to Branch Manager ({selectedBranchDrill.manager})
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Type regional instruction..."
                  value={actionNotes[selectedBranchDrill.id] || ''}
                  onChange={(e) => setActionNotes({ ...actionNotes, [selectedBranchDrill.id]: e.target.value })}
                  style={{ flex: 1, padding: '0.65rem', borderRadius: '6px', background: 'var(--input-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-main)' }}
                />
                <button
                  onClick={() => handleSendManagerNote(selectedBranchDrill.id, selectedBranchDrill.manager)}
                  style={{ background: 'var(--accent-regional)', border: 'none', color: '#fff', borderRadius: '6px', padding: '0.65rem 1rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Send Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
