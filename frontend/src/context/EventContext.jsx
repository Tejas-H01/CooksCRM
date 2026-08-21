import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  initialLeads, 
  initialActions, 
  initialRms, 
  initialBranches, 
  initialUsers, 
  initialAuditLogs, 
  initialSystemAlerts, 
  initialFailedEvents,
  initialRolesPermissions,
  ROLE_DISPLAY_NAMES
} from '../data/mockData';
import { useToast } from './ToastContext';
import { apiService } from '../services/api';

const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

const EventContext = createContext();

export const EventProvider = ({ children }) => {
  const { showToast } = useToast();

  // Role Theme State - Dynamic Initialization from Token to prevent early defaults
  const [activeRole, setActiveRole] = useState(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = parseJwt(token);
      const role = decoded?.role;
      if (role === 'RM') return 'rm';
      if (role === 'BRANCH_MANAGER') return 'manager';
      if (role === 'REGIONAL_HEAD') return 'regional';
      if (role === 'ADMIN') return 'admin';
    }
    return '';
  });
  const [theme, setTheme] = useState(() => localStorage.getItem('FINFLOW_THEME') || 'dark');

  // Application Data States
  const [leads, setLeads] = useState([]);
  const [actions, setActions] = useState(initialActions);
  const [rms, setRms] = useState(initialRms);
  const [branches, setBranches] = useState(initialBranches);
  const [users, setUsers] = useState(initialUsers);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [systemAlerts, setSystemAlerts] = useState(initialSystemAlerts);
  const [failedEvents, setFailedEvents] = useState(initialFailedEvents);
  const [rolesPermissions, setRolesPermissions] = useState(initialRolesPermissions);
  const [adminOverview, setAdminOverview] = useState(null);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);
  const [rmPerformance, setRmPerformance] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [opportunitySuggestions, setOpportunitySuggestions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [managerPerformance, setManagerPerformance] = useState(null);
  const [managerLeads, setManagerLeads] = useState([]);
  const [managerBranch, setManagerBranch] = useState(null);
  const [regionalPerformance, setRegionalPerformance] = useState([]);
  const [regionalDashboard, setRegionalDashboard] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Active selections
  const [selectedLead, setSelectedLead] = useState(null);
  const [eventLog, setEventLog] = useState([]);
  const [simulatorStats, setSimulatorStats] = useState({ is_simulator_running: false, queue_depth: 0, active_processing: 0, processed_count: 0, failed_count: 0, total_queued: 0 });

  // Apply Theme attribute to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('FINFLOW_THEME', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Fetch Live Admin Data from FastAPI Backend ONLY IF AUTHENTICATED AS ADMIN
  const loadAdminData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const decoded = parseJwt(token);
    if (decoded?.role !== 'ADMIN') return; // Strict guard preventing accidental calls

    setIsLoadingAdmin(true);
    try {
      const overview = await apiService.fetchAdminOverview();
      if (overview) setAdminOverview(overview);

      const liveUsers = await apiService.fetchAdminUsers();
      if (Array.isArray(liveUsers)) setUsers(liveUsers);

      const liveTeams = await apiService.fetchAdminTeams();
      if (Array.isArray(liveTeams) && liveTeams.length > 0) setBranches(liveTeams);

      const failedEvts = await apiService.fetchAdminFailedEvents();
      if (Array.isArray(failedEvts)) setFailedEvents(failedEvts);

      const logs = await apiService.fetchAdminAuditLogs();
      if (Array.isArray(logs) && logs.length > 0) setAuditLogs(logs);

      const roles = await apiService.fetchAdminRoles();
      if (Array.isArray(roles) && roles.length > 0) setRolesPermissions(roles);
    } catch (err) {
      console.warn("Failed to load live admin data:", err.message);
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  const loadRoleData = async (roleVal = activeRole) => {
    const token = localStorage.getItem('finflow_access_token') || localStorage.getItem('token');
    if (!token) return;

    const decoded = parseJwt(token);
    const tokenRole = decoded?.role;

    // Strict role validation guards
    if (roleVal === 'rm' && tokenRole !== 'RM') return;
    if (roleVal === 'manager' && tokenRole !== 'BRANCH_MANAGER') return;
    if (roleVal === 'regional' && tokenRole !== 'REGIONAL_HEAD') return;
    if (roleVal === 'admin' && tokenRole !== 'ADMIN') return;

    try {
      if (roleVal === 'rm') {
        const [profile, rmActions, rmLeads, rmPerf, rmSch, rmSugg, rmCusts] = await Promise.all([
          apiService.fetchCurrentUser().catch(() => null),
          apiService.fetchRmActions().catch(() => null),
          apiService.fetchRmLeads().catch(() => null),
          apiService.fetchRmPerformance().catch(() => null),
          apiService.fetchRmSchedule().catch(() => null),
          apiService.fetchRmOpportunitySuggestions().catch(() => null),
          apiService.fetchRmCustomers().catch(() => null)
        ]);

        if (profile) setCurrentUser(profile);
        if (Array.isArray(rmActions)) setActions(rmActions);
        if (Array.isArray(rmLeads)) setLeads(rmLeads);
        if (rmPerf) setRmPerformance(rmPerf);
        if (Array.isArray(rmSch)) setSchedule(rmSch);
        if (Array.isArray(rmSugg)) setOpportunitySuggestions(rmSugg);
        if (Array.isArray(rmCusts)) setCustomers(rmCusts);
      } else if (roleVal === 'manager') {
        const [profile, mgrBranch, mgrRms, mgrActions, mgrPerf, mgrAlerts, mgrLeads] = await Promise.all([
          apiService.fetchCurrentUser().catch(() => null),
          apiService.fetchManagerBranch().catch(() => null),
          apiService.fetchManagerRms().catch(() => null),
          apiService.fetchManagerActions().catch(() => null),
          apiService.fetchManagerPerformance().catch(() => null),
          apiService.fetchManagerAlerts().catch(() => null),
          apiService.fetchManagerLeads().catch(() => null)
        ]);

        if (profile) setCurrentUser(profile);
        if (mgrBranch) setManagerBranch(mgrBranch);
        if (Array.isArray(mgrRms) && mgrRms.length > 0) setRms(mgrRms);
        if (Array.isArray(mgrActions)) setActions(mgrActions);
        if (mgrPerf) setManagerPerformance(mgrPerf);
        if (Array.isArray(mgrAlerts)) setSystemAlerts(mgrAlerts);
        if (Array.isArray(mgrLeads)) setManagerLeads(mgrLeads);
      } else if (roleVal === 'regional') {
        const [profile, regDash] = await Promise.all([
          apiService.fetchCurrentUser().catch(() => null),
          apiService.fetchRegionalDashboard().catch(() => null)
        ]);

        if (profile) setCurrentUser(profile);
        if (regDash) setRegionalDashboard(regDash);
      } else if (roleVal === 'admin') {
        await loadAdminData();
      }
    } catch (err) {
      console.warn(`Failed to load live data for role ${roleVal}:`, err.message);
    }
  };

  useEffect(() => {
    if (activeRole) {
      loadRoleData(activeRole);
    }
  }, [activeRole]);

  // Action complete handler
  const completeAction = async (actionId, outcome) => {
    try {
      // Backend expects outcome as a Dict (or null), not a string
      const outcomePayload = typeof outcome === 'string' ? { notes: outcome } : (outcome || {});
      await apiService.completeAction(actionId, { outcome: outcomePayload });
      setActions((prev) => prev.filter((a) => a.id !== actionId));
      setSchedule((prev) => prev.filter((s) => s.id !== actionId));
      
      setAuditLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: 'Just now',
          user: 'Rahul Sharma (RM)',
          action: 'ACTION_COMPLETED',
          details: `Completed action #${actionId}`
        },
        ...prev
      ]);

      showToast(`✅ Action #${actionId} marked completed & logged to audit trail!`, 'success');
    } catch (err) {
      showToast(`❌ Failed to complete action: ${err.message}`, 'error');
    }
  };

  // Action snooze handler
  const snoozeAction = async (actionId, hours) => {
    try {
      await apiService.snoozeAction(actionId, hours * 60);
      setActions((prev) =>
        prev.map((a) =>
          a.id === actionId
            ? { ...a, dueText: `Snoozed for ${hours}h`, urgencyScore: Math.max(10, a.urgencyScore - 30) }
            : a
        )
      );
      const updatedSch = await apiService.fetchRmSchedule();
      if (Array.isArray(updatedSch)) setSchedule(updatedSch);
      showToast(`⏰ Action #${actionId} snoozed for ${hours} hours.`, 'info');
    } catch (err) {
      showToast(`❌ Failed to snooze action: ${err.message}`, 'error');
    }
  };

  // Reassign action
  const reassignAction = async (actionId, newRmName) => {
    try {
      // In a real app we would map newRmName to newRmId, hardcoding id=2 for Neha Iyer (from mockRms)
      await apiService.reassignAction(actionId, 2); 
      setActions((prev) => prev.filter((a) => a.id !== actionId));
      showToast(`🔄 Action #${actionId} reassigned to ${newRmName}.`, 'info');
    } catch (err) {
      showToast(`❌ Failed to reassign action: ${err.message}`, 'error');
    }
  };

  const reassignManagerLead = async (leadId, newRmId, reason = '') => {
    try {
      await apiService.reassignManagerLead(leadId, newRmId, reason);
      showToast(`🔄 Lead #${leadId} successfully reassigned!`, 'success');
      await loadRoleData('manager');
    } catch (err) {
      showToast(`❌ Failed to reassign lead: ${err.message}`, 'error');
      throw err;
    }
  };

  const reassignManagerAction = async (actionId, newRmId, reason = '') => {
    try {
      await apiService.reassignManagerAction(actionId, newRmId, reason);
      showToast(`🔄 Action successfully reassigned!`, 'success');
      await loadRoleData('manager');
    } catch (err) {
      showToast(`❌ Failed to reassign action: ${err.message}`, 'error');
      throw err;
    }
  };

  const resolveManagerAction = async (actionId, notes = '') => {
    try {
      await apiService.resolveManagerAction(actionId, notes);
      showToast(`✅ Action successfully resolved by Branch Manager!`, 'success');
      await loadRoleData('manager');
    } catch (err) {
      showToast(`❌ Failed to resolve action: ${err.message}`, 'error');
      throw err;
    }
  };

  // POST /admin/users - Create User
  const addUser = async (newUser) => {
    const created = await apiService.createAdminUser(newUser);
    setUsers((prev) => [created, ...prev]);
    showToast(`👤 User "${created.username || created.name || newUser.name}" created via POST /admin/users!`, 'success');
    loadAdminData();
  };

  // PATCH /admin/users/{id} - Update User / Hierarchy
  const updateUserHierarchy = async (userId, updatedFields) => {
    await apiService.updateAdminUser(userId, updatedFields);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updatedFields } : u))
    );
    showToast(`🔄 User updated via PATCH /admin/users/${userId}!`, 'success');
    loadAdminData();
  };

  // PATCH /admin/users/{id} - Activate / Deactivate Toggle (NO DELETE ENDPOINT)
  const toggleUserActive = async (userId, currentIsActive) => {
    const nextActiveState = !currentIsActive;
    await apiService.updateAdminUser(userId, { is_active: nextActiveState });
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_active: nextActiveState, status: nextActiveState ? 'Active' : 'Inactive' } : u))
    );
    showToast(
      `👤 User status updated to ${nextActiveState ? 'ACTIVE' : 'INACTIVE'} via PATCH /admin/users/${userId}`,
      nextActiveState ? 'success' : 'error'
    );
    loadAdminData();
  };

  // PATCH /admin/users/{id}/role - Role Update
  const updateUserRole = async (userId, newRole) => {
    await apiService.updateAdminUserRole(userId, newRole);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    showToast(`🔒 User role updated to ${ROLE_DISPLAY_NAMES[newRole] || newRole} via PATCH /admin/users/${userId}/role`, 'success');
    loadAdminData();
  };

  // POST /admin/teams - Create Team
  const addTeam = async (teamData) => {
    const created = await apiService.createAdminTeam(teamData);
    setBranches((prev) => [created, ...prev]);
    showToast(`🏢 Team/Branch "${created.name}" created via POST /admin/teams!`, 'success');
    loadAdminData();
  };

  // PATCH /admin/teams/{id} - Update Team
  const updateTeam = async (teamId, teamData) => {
    await apiService.updateAdminTeam(teamId, teamData);
    setBranches((prev) => prev.map(t => t.id === teamId ? { ...t, ...teamData } : t));
    showToast(`🏢 Team/Branch updated via PATCH /admin/teams/${teamId}!`, 'success');
    loadAdminData();
  };

  // Static Roles & Permissions display notice
  const updateRolePermissions = (roleId, permissionKey, isEnabled) => {
    showToast(`Notice: Dynamic permission editing is out of scope. Displaying static RBAC matrix.`, 'info');
  };

  const acceptOpportunitySuggestion = async (leadId) => {
    await apiService.acceptOpportunitySuggestion(leadId);
    showToast('✨ Opportunity suggestion accepted!', 'success');
    await refreshUserData();
  };

  const dismissOpportunitySuggestion = async (leadId) => {
    await apiService.dismissOpportunitySuggestion(leadId);
    showToast('Suggestion dismissed.', 'info');
    await refreshUserData();
  };

  const createRmOpportunity = async (opportunityData) => {
    const newOpp = await apiService.createRmOpportunity(opportunityData);
    showToast('🚀 New opportunity created successfully!', 'success');
    await refreshUserData();
    return newOpp;
  };

  const createRmCustomer = async (customerData) => {
    const newCust = await apiService.createRmCustomer(customerData);
    setCustomers((prev) => [...prev, newCust]);
    showToast(`👤 Customer '${newCust.name}' created successfully!`, 'success');
    await refreshUserData();
    return newCust;
  };

  const refreshUserData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const decoded = parseJwt(token);
    const role = decoded?.role;
    let roleKey = '';
    if (role === 'RM') roleKey = 'rm';
    else if (role === 'BRANCH_MANAGER') roleKey = 'manager';
    else if (role === 'REGIONAL_HEAD') roleKey = 'regional';
    else if (role === 'ADMIN') roleKey = 'admin';

    if (roleKey) {
      await loadRoleData(roleKey);
    }
  };

  const refreshSimulatorStatsAndEvents = async () => {
    try {
      const stats = await apiService.fetchSimulatorStats();
      if (stats) setSimulatorStats(stats);
      const evts = await apiService.fetchEvents();
      if (Array.isArray(evts)) {
        setEventLog(evts.map(e => ({
          id: e.id,
          eventType: e.event_type,
          description: `Event type ${e.event_type} received from ${e.source || 'external source'} for entity ${e.entity_type}:${e.entity_id}`,
          timestamp: new Date(e.occurred_at || e.created_at).toLocaleTimeString(),
          status: e.processed_at ? 'processed' : 'pending'
        })));
      }
    } catch (e) {
      console.warn("Error refreshing simulator stats and events:", e.message);
    }
  };

  const startSimulation = async () => {
    await apiService.startSimulator();
    await refreshSimulatorStatsAndEvents();
  };

  const stopSimulation = async () => {
    await apiService.stopSimulator();
    await refreshSimulatorStatsAndEvents();
  };

  const triggerSimulationJourney = async (blueprintName, customerId = "1") => {
    await apiService.triggerJourney(blueprintName, customerId);
    await refreshSimulatorStatsAndEvents();
  };

  // Unified 3-second polling interval for events, simulator stats, and active role workspace data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const pollAll = async () => {
      await refreshSimulatorStatsAndEvents();
      await refreshUserData();
    };

    pollAll();
    const interval = setInterval(pollAll, 3000);
    return () => clearInterval(interval);
  }, []);

  const resolveRegionalAction = async (actionId, notes) => {
    try {
      const res = await apiService.resolveRegionalAction(actionId, notes);
      await loadRoleData('regional');
      return res;
    } catch (err) {
      console.error("Failed to resolve regional action:", err);
      throw err;
    }
  };

  return (
    <EventContext.Provider
      value={{
        activeRole,
        setActiveRole,
        theme,
        toggleTheme,
        leads,
        actions,
        rms,
        branches,
        users,
        auditLogs,
        systemAlerts,
        failedEvents,
        rolesPermissions,
        adminOverview,
        isLoadingAdmin,
        rmPerformance,
        schedule,
        managerPerformance,
        managerLeads,
        managerBranch,
        regionalPerformance,
        regionalDashboard,
        selectedLead,
        setSelectedLead,
        eventLog,
        simulatorStats,
        refreshSimulatorStatsAndEvents,
        startSimulation,
        stopSimulation,
        triggerSimulationJourney,
        completeAction,
        snoozeAction,
        reassignAction,
        addUser,
        updateUserHierarchy,
        toggleUserActive,
        updateUserRole,
        addTeam,
        updateTeam,
        opportunitySuggestions,
        customers,
        acceptOpportunitySuggestion,
        dismissOpportunitySuggestion,
        createRmOpportunity,
        createRmCustomer,
        currentUser,
        reassignManagerLead,
        reassignManagerAction,
        resolveManagerAction,
        resolveRegionalAction,
        refreshAdminData: refreshUserData
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export const useEventContext = () => useContext(EventContext);
