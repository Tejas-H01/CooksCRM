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
  const [leads, setLeads] = useState(initialLeads);
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
  const [managerPerformance, setManagerPerformance] = useState(null);
  const [regionalPerformance, setRegionalPerformance] = useState([]);

  // Active selections
  const [selectedLead, setSelectedLead] = useState(initialLeads[0]);
  const [eventLog, setEventLog] = useState([
    { id: 1, type: 'PAYIN_EVENT', source: 'CoreBanking', status: 'PROCESSED', timestamp: '10 mins ago' },
    { id: 2, type: 'HIGH_INTENT', source: 'WebAnalytics', status: 'PROCESSED', timestamp: '25 mins ago' }
  ]);

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
      if (Array.isArray(liveUsers) && liveUsers.length > 0) setUsers(liveUsers);

      const liveTeams = await apiService.fetchAdminTeams();
      if (Array.isArray(liveTeams) && liveTeams.length > 0) setBranches(liveTeams);

      const failedEvts = await apiService.fetchAdminFailedEvents();
      if (Array.isArray(failedEvts)) setFailedEvents(failedEvts);

      const logs = await apiService.fetchAdminAuditLogs();
      if (Array.isArray(logs) && logs.length > 0) setAuditLogs(logs);

      const roles = await apiService.fetchAdminRoles();
      if (Array.isArray(roles) && roles.length > 0) setRolesPermissions(roles);
    } catch (err) {
      if (!err.message?.includes('401')) {
        console.warn('Live backend fetch fallback:', err.message);
      }
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  const loadRoleData = async (roleVal = activeRole) => {
    const token = localStorage.getItem('token');
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
        const rmActions = await apiService.fetchRmActions();
        if (Array.isArray(rmActions)) setActions(rmActions);

        const rmLeads = await apiService.fetchRmLeads();
        if (Array.isArray(rmLeads)) setLeads(rmLeads);
        
        const rmPerf = await apiService.fetchRmPerformance();
        if (rmPerf) setRmPerformance(rmPerf);
      } else if (roleVal === 'manager') {
        const mgrRms = await apiService.fetchManagerRms();
        if (Array.isArray(mgrRms) && mgrRms.length > 0) setRms(mgrRms);
        
        const mgrActions = await apiService.fetchManagerActions();
        if (Array.isArray(mgrActions)) setActions(mgrActions);
        
        const mgrPerf = await apiService.fetchManagerPerformance();
        if (mgrPerf) setManagerPerformance(mgrPerf);

        const mgrAlerts = await apiService.fetchManagerAlerts();
        if (Array.isArray(mgrAlerts)) setSystemAlerts(mgrAlerts);
      } else if (roleVal === 'regional') {
        const regBranches = await apiService.fetchRegionalBranches();
        if (Array.isArray(regBranches) && regBranches.length > 0) setBranches(regBranches);
        
        const regPerf = await apiService.fetchRegionalPerformance();
        if (Array.isArray(regPerf)) setRegionalPerformance(regPerf);
        
        const regAlerts = await apiService.fetchRegionalAlerts();
        if (Array.isArray(regAlerts)) setSystemAlerts(regAlerts);
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
    await apiService.completeAction(actionId, { outcome });
    setActions((prev) => prev.filter((a) => a.id !== actionId));
    
    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        timestamp: 'Just now',
        user: 'Rahul Sharma (RM)',
        action: 'ACTION_COMPLETED',
        details: `Completed action #${actionId} - Outcome: ${outcome}`
      },
      ...prev
    ]);

    showToast(`✅ Action #${actionId} marked completed & logged to audit trail!`, 'success');
  };

  // Action snooze handler
  const snoozeAction = (actionId, hours) => {
    setActions((prev) =>
      prev.map((a) =>
        a.id === actionId
          ? { ...a, dueText: `Snoozed for ${hours}h`, urgencyScore: Math.max(10, a.urgencyScore - 30) }
          : a
      )
    );
    showToast(`⏰ Action #${actionId} snoozed for ${hours} hours.`, 'info');
  };

  // Reassign action
  const reassignAction = (actionId, newRmName) => {
    setActions((prev) => prev.filter((a) => a.id !== actionId));
    showToast(`🔄 Action #${actionId} reassigned to ${newRmName}.`, 'info');
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

  // POST /admin/events/{id}/retry - Retry Failed Event
  const retryFailedEvent = async (eventId) => {
    await apiService.retryAdminFailedEvent(eventId);
    setFailedEvents((prev) => prev.filter((e) => e.id !== eventId));
    showToast(`🔄 Event #${eventId} retried via POST /admin/events/${eventId}/retry!`, 'success');
    
    // Refresh failed event list from live backend
    const updatedFailed = await apiService.fetchAdminFailedEvents();
    if (Array.isArray(updatedFailed)) {
      setFailedEvents(updatedFailed);
    }
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
        managerPerformance,
        regionalPerformance,
        selectedLead,
        setSelectedLead,
        eventLog,
        completeAction,
        snoozeAction,
        reassignAction,
        addUser,
        updateUserHierarchy,
        toggleUserActive,
        updateUserRole,
        addTeam,
        updateTeam,
        updateRolePermissions,
        retryFailedEvent,
        refreshAdminData: refreshUserData
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export const useEventContext = () => useContext(EventContext);
