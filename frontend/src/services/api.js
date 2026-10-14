// FastAPI Integration Service Layer with Standalone Mock Fallback & CORS Proxy Support
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
  initialIntegrations
} from '../data/mockData';

// Schema Mapping Adapters
const mapActionResponse = (apiAction) => {
  let priorityStr = "Medium Priority";
  if (apiAction.priority === "HIGH" || apiAction.priority === "CRITICAL") priorityStr = "High Priority";
  else if (apiAction.priority === "LOW") priorityStr = "Low Priority";

  const due = new Date(apiAction.due_at);
  const now = new Date();
  const diffHours = (due - now) / (1000 * 60 * 60);
  let dueText = "Due Later";
  if (diffHours < 0) dueText = "Due Now (SLA Overdue)";
  else if (diffHours < 24) dueText = `Due in ${Math.round(diffHours)} hours`;

  return {
    ...apiAction,
    leadName: apiAction.lead_name || `Lead #${apiAction.lead_id || 'Unknown'}`,
    priority: priorityStr,
    urgencyScore: apiAction.score || 0,
    dueText: dueText,
    suggestedMessage: apiAction.suggested_message || `Hi, following up on our recent communication.`
  };
};

const mapLeadResponse = (apiLead) => {
  return {
    ...apiLead,
    potentialValue: apiLead.potential_value || 0,
    lastContactDaysAgo: 0,
    conversionProbability: 50,
    nextFollowup: "Tomorrow",
    bestContactTime: "Afternoon",
    activityTimeline: [],
    notes: [],
    tags: [apiLead.stage || "NEW"],
    intentScore: 50
  };
};

const DEFAULT_BASE_URL = '/api/v1'; // Uses Vite Proxy to avoid CORS blocks

let storedUrl = localStorage.getItem('FINFLOW_API_URL');
if (!storedUrl || storedUrl.includes('localhost:8000') || storedUrl.includes('192.168.137.114')) {
  storedUrl = DEFAULT_BASE_URL;
  localStorage.setItem('FINFLOW_API_URL', DEFAULT_BASE_URL);
}

let apiConfig = {
  baseUrl: storedUrl,
  useBackend: localStorage.getItem('FINFLOW_USE_BACKEND') !== 'false'
};

export const getApiConfig = () => ({ ...apiConfig });

export const setApiConfig = (newConfig) => {
  apiConfig = { ...apiConfig, ...newConfig };
  localStorage.setItem('FINFLOW_API_URL', apiConfig.baseUrl);
  localStorage.setItem('FINFLOW_USE_BACKEND', apiConfig.useBackend ? 'true' : 'false');
};

const TOKEN_KEY = 'finflow_access_token';

const getToken = () => {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token');
};

const handleFetch = async (endpoint, options = {}) => {
  if (!apiConfig.useBackend) {
    throw new Error('Backend mode disabled - using mock data');
  }

  const token = getToken();
  const primaryUrl = `${apiConfig.baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(primaryUrl, { ...options, headers });

    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('token');
      if (typeof window !== 'undefined' && !endpoint.includes('/auth/login')) {
        window.dispatchEvent(new CustomEvent('finflow:unauthorized'));
      }
      throw new Error('401 Unauthorized');
    }

    if (!response.ok) {
      const errText = await response.text();
      let errDetail = `${response.status} ${response.statusText}`;
      try {
        const json = JSON.parse(errText);
        if (json.detail) errDetail = json.detail;
      } catch (e) {}
      throw new Error(errDetail);
    }
    return await response.json();
  } catch (err) {
    // If direct fetch failed, attempt fallback through relative proxy
    if (apiConfig.baseUrl !== '/api/v1') {
      const fallbackUrl = `/api/v1${endpoint}`;
      const fallbackResponse = await fetch(fallbackUrl, { ...options, headers });
      if (fallbackResponse.ok) {
        return await fallbackResponse.json();
      }
    }
    throw err;
  }
};

export const apiService = {
  // =========================================
  // AUTHENTICATION API: POST /api/v1/auth/login
  // =========================================
  async login(username, password) {
    if (apiConfig.useBackend) {
      const url = `${apiConfig.baseUrl}/auth/login`;
      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
      } catch (err) {
        // Network error or 502 (Proxy error)
        throw new Error(`Backend unavailable: ${err.message}`);
      }

      if (response.ok) {
        const data = await response.json();
        if (data.access_token) {
          localStorage.setItem(TOKEN_KEY, data.access_token);
          localStorage.setItem('token', data.access_token);
        }
        return data;
      }

      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Invalid username or password');
      }

      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Authentication failed with status ${response.status}`);
    }

    // Offline / Mock Fallback Login (ONLY runs if apiConfig.useBackend is explicitly false)
    if (username && password) {
      const mockToken = "mock_jwt_token_" + Date.now();
      localStorage.setItem(TOKEN_KEY, mockToken);
      localStorage.setItem('token', mockToken);
      return { 
        access_token: mockToken, 
        token_type: "bearer", 
        user: { id: 999, username, email: `${username}@crm.com`, role: 'ADMIN', is_active: true } 
      };
    }
    throw new Error('Please enter username and password');
  },

  async fetchMe() {
    if (apiConfig.useBackend) {
      return await handleFetch('/auth/me');
    }
    return null;
  },

  // =========================================
  // ADMIN API ENDPOINTS (FASTAPI SPECIFIED)
  // Base URL: /api/v1 (Proxied to http://192.168.137.114:8000)
  // =========================================

  // GET /api/v1/admin/overview
  async fetchAdminOverview() {
    try {
      if (apiConfig.useBackend) {
        return await handleFetch('/admin/overview');
      }
    } catch (err) {
      if (!err.message?.includes('401')) {
        console.warn('FastAPI offline, using mock overview:', err.message);
      }
    }
    return {
      totalUsers: 245,
      totalUsersGrowth: 12,
      activeUsers: 198,
      activeUsersGrowth: 8,
      totalLeads: 3842,
      totalLeadsGrowth: 15.8,
      systemHealth: "99.9%",
      users: initialUsers,
      auditLogs: initialAuditLogs,
      systemAlerts: initialSystemAlerts,
      failedEvents: initialFailedEvents,
      userActivity: [
        { day: "Mon", count: 45 },
        { day: "Tue", count: 68 },
        { day: "Wed", count: 85 },
        { day: "Thu", count: 60 },
        { day: "Fri", count: 95 },
        { day: "Sat", count: 30 },
        { day: "Sun", count: 15 }
      ]
    };
  },

  // GET /api/v1/admin/users
  async fetchAdminUsers() {
    try {
      if (apiConfig.useBackend) {
        return await handleFetch('/admin/users');
      }
    } catch (err) {
      if (!err.message?.includes('401')) {
        console.warn('FastAPI offline, using mock users:', err.message);
      }
    }
    return initialUsers;
  },

  // POST /api/v1/admin/users - Clean schema (omits unassigned team_id/parent_id to prevent PostgreSQL Foreign Key Violation)
  async createAdminUser(userData) {
    try {
      if (apiConfig.useBackend) {
        const payload = {
          username: userData.username || userData.name?.toLowerCase().replace(/\s+/g, '_') || `user_${Date.now()}`,
          email: userData.email || "user@example.com",
          password: userData.password || "password123",
          role: userData.role || "REGIONAL_HEAD"
        };

        // Only include team_id or parent_id if a valid integer > 0 is explicitly provided
        if (userData.team_id && parseInt(userData.team_id) > 0) {
          payload.team_id = parseInt(userData.team_id);
        }
        if (userData.parent_id && parseInt(userData.parent_id) > 0) {
          payload.parent_id = parseInt(userData.parent_id);
        }

        return await handleFetch('/admin/users', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
    } catch (err) {
      console.warn('FastAPI POST /admin/users returned error, using fallback:', err.message);
    }
    return { id: `usr-${Date.now()}`, ...userData, status: 'Active', is_active: true, lastActive: 'Just now' };
  },

  // PATCH /api/v1/admin/users/{id} - UserUpdate Schema
  async updateAdminUser(userId, userData) {
    try {
      if (apiConfig.useBackend) {
        const payload = {};
        if (userData.username || userData.name) {
          payload.username = userData.username || userData.name;
        }
        if (userData.email) {
          payload.email = userData.email;
        }
        if (userData.role) {
          payload.role = userData.role;
        }
        if (userData.is_active !== undefined) {
          payload.is_active = userData.is_active;
        }
        if (userData.team_id && parseInt(userData.team_id) > 0) {
          payload.team_id = parseInt(userData.team_id);
        }
        if (userData.parent_id && parseInt(userData.parent_id) > 0) {
          payload.parent_id = parseInt(userData.parent_id);
        }

        return await handleFetch(`/admin/users/${userId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
      }
    } catch (err) {
      console.warn('FastAPI offline, updating user locally:', err.message);
    }
    return { id: userId, ...userData };
  },

  // GET /api/v1/admin/teams
  async fetchAdminTeams() {
    try {
      if (apiConfig.useBackend) {
        return await handleFetch('/admin/teams');
      }
    } catch (err) {
      if (!err.message?.includes('401')) {
        console.warn('FastAPI offline, using mock teams:', err.message);
      }
    }
    return initialBranches;
  },

  // POST /api/v1/admin/teams
  async createAdminTeam(teamData) {
    try {
      if (apiConfig.useBackend) {
        return await handleFetch('/admin/teams', {
          method: 'POST',
          body: JSON.stringify(teamData)
        });
      }
    } catch (err) {
      console.warn('FastAPI offline, creating team locally:', err.message);
    }
    return { id: `branch-${Date.now()}`, ...teamData };
  },

  // PATCH /api/v1/admin/teams/{id}
  async updateAdminTeam(teamId, teamData) {
    try {
      if (apiConfig.useBackend) {
        return await handleFetch(`/admin/teams/${teamId}`, {
          method: 'PATCH',
          body: JSON.stringify(teamData)
        });
      }
    } catch (err) {
      console.warn('FastAPI offline, updating team locally:', err.message);
    }
    return { id: teamId, ...teamData };
  },

  // GET /api/v1/admin/events/failed
  async fetchAdminFailedEvents() {
    try {
      if (apiConfig.useBackend) {
        return await handleFetch('/admin/events/failed');
      }
    } catch (err) {
      if (!err.message?.includes('401')) {
        console.warn('FastAPI offline, using mock failed events:', err.message);
      }
    }
    return initialFailedEvents;
  },

  // POST /api/v1/admin/events/{id}/retry
  async retryAdminFailedEvent(eventId) {
    try {
      if (apiConfig.useBackend) {
        return await handleFetch(`/admin/events/${eventId}/retry`, {
          method: 'POST'
        });
      }
    } catch (err) {
      console.warn('FastAPI offline, retrying failed event locally:', err.message);
    }
    return { success: true, eventId, status: "retried" };
  },

  // GET /api/v1/admin/audit-logs
  async fetchAdminAuditLogs() {
    try {
      if (apiConfig.useBackend) {
        return await handleFetch('/admin/audit-logs');
      }
    } catch (err) {
      if (!err.message?.includes('401')) {
        console.warn('FastAPI offline, using mock audit logs:', err.message);
      }
    }
    return initialAuditLogs;
  },

  // GET /api/v1/admin/roles
  async fetchAdminRoles() {
    try {
      if (apiConfig.useBackend) {
        return await handleFetch('/admin/roles');
      }
    } catch (err) {
      if (!err.message?.includes('401')) {
        console.warn('FastAPI offline, using mock roles:', err.message);
      }
    }
    return initialRolesPermissions;
  },

  // GET /api/v1/admin/permissions
  async fetchAdminPermissions() {
    try {
      if (apiConfig.useBackend) {
        return await handleFetch('/admin/permissions');
      }
    } catch (err) {
      if (!err.message?.includes('401')) {
        console.warn('FastAPI offline, using mock permissions:', err.message);
      }
    }
    return initialRolesPermissions;
  },

  // PATCH /api/v1/admin/users/{id}/role - Role Update Schema { "role": role }
  async updateAdminUserRole(userId, role) {
    try {
      if (apiConfig.useBackend) {
        return await handleFetch(`/admin/users/${userId}/role`, {
          method: 'PATCH',
          body: JSON.stringify({ role }) // Sends {"role": "REGIONAL_HEAD"} (NOT {"roleId": ...})
        });
      }
    } catch (err) {
      console.warn('FastAPI offline, updating user role locally:', err.message);
    }
    return { userId, role };
  },

  // PATCH /api/v1/admin/roles/{id}/permissions
  async updateAdminRolePermissions(roleId, permissionsData) {
    try {
      if (apiConfig.useBackend) {
        return await handleFetch(`/admin/roles/${roleId}/permissions`, {
          method: 'PATCH',
          body: JSON.stringify(permissionsData)
        });
      }
    } catch (err) {
      console.warn('FastAPI offline, updating role permissions locally:', err.message);
    }
    return { roleId, permissions: permissionsData };
  },

  // =========================================
  // OTHER DASHBOARD APIS (RM, MANAGER, REGIONAL)
  // =========================================
  async fetchRmActions() {
    if (apiConfig.useBackend) {
      const data = await handleFetch('/rm/me/actions');
      return data.map(mapActionResponse);
    }
    return initialActions;
  },

  async fetchCurrentUser() {
    if (apiConfig.useBackend) {
      return await handleFetch('/auth/me');
    }
    return null;
  },

  async fetchRmLeads() {
    if (apiConfig.useBackend) {
      const data = await handleFetch('/rm/me/leads');
      return data.map(mapLeadResponse);
    }
    return [];
  },

  async fetchRmPerformance() {
    if (apiConfig.useBackend) {
      return await handleFetch('/rm/me/performance');
    }
    return null;
  },

  async fetchRmCustomers() {
    if (apiConfig.useBackend) {
      return await handleFetch('/rm/me/customers');
    }
    return [];
  },

  async createRmCustomer(customerData) {
    if (apiConfig.useBackend) {
      return await handleFetch('/rm/me/customers', {
        method: 'POST',
        body: JSON.stringify(customerData)
      });
    }
    return { id: Date.now(), ...customerData };
  },

  async fetchRmSchedule(dateStr) {
    if (apiConfig.useBackend) {
      const endpoint = dateStr ? `/rm/me/schedule?date=${dateStr}` : '/rm/me/schedule';
      return await handleFetch(endpoint);
    }
    return [];
  },

  async fetchRmOpportunitySuggestions() {
    if (apiConfig.useBackend) {
      return await handleFetch('/rm/me/opportunity-suggestions');
    }
    return [];
  },

  async acceptOpportunitySuggestion(leadId) {
    if (apiConfig.useBackend) {
      return await handleFetch(`/rm/me/opportunity-suggestions/${leadId}/accept`, {
        method: 'POST'
      });
    }
    return { id: leadId, status: 'OPEN' };
  },

  async dismissOpportunitySuggestion(leadId) {
    if (apiConfig.useBackend) {
      return await handleFetch(`/rm/me/opportunity-suggestions/${leadId}/dismiss`, {
        method: 'POST'
      });
    }
    return { id: leadId, status: 'DISMISSED' };
  },

  async createRmOpportunity(opportunityData) {
    if (apiConfig.useBackend) {
      return await handleFetch('/rm/me/opportunities', {
        method: 'POST',
        body: JSON.stringify(opportunityData)
      });
    }
    return { id: Date.now(), ...opportunityData, status: 'OPEN' };
  },

  async fetchManagerBranch() {
    try {
      if (apiConfig.useBackend) return await handleFetch('/manager/branch');
    } catch (e) {
      console.warn("FastAPI Manager branch offline:", e.message);
    }
    return { id: 1, name: "Wealth Management Team Alpha" };
  },

  async fetchManagerRms() {
    try {
      if (apiConfig.useBackend) return await handleFetch('/manager/rms');
    } catch (e) {
      console.warn("FastAPI Manager RMs offline:", e.message);
    }
    return initialRms;
  },

  async fetchManagerActions() {
    try {
      if (apiConfig.useBackend) return await handleFetch('/manager/actions');
    } catch (e) {
      console.warn("FastAPI Manager actions offline:", e.message);
    }
    return initialActions;
  },

  async fetchManagerPerformance() {
    try {
      if (apiConfig.useBackend) return await handleFetch('/manager/performance');
    } catch (e) {
      console.warn("FastAPI Manager performance offline:", e.message);
    }
    return null;
  },

  async fetchManagerAlerts() {
    try {
      if (apiConfig.useBackend) return await handleFetch('/manager/alerts');
    } catch (e) {
      console.warn("FastAPI Manager alerts offline:", e.message);
    }
    return [];
  },

  async fetchManagerLeads() {
    try {
      if (apiConfig.useBackend) return await handleFetch('/manager/leads');
    } catch (e) {
      console.warn("FastAPI Manager leads offline:", e.message);
    }
    return [];
  },

  async fetchManagerRmDetail(rmId) {
    try {
      if (apiConfig.useBackend) return await handleFetch(`/manager/rms/${rmId}/detail`);
    } catch (e) {
      console.warn("FastAPI Manager RM detail offline:", e.message);
    }
    return null;
  },

  async reassignManagerLead(leadId, newRmId, reason = '') {
    if (apiConfig.useBackend) {
      return await handleFetch(`/manager/leads/${leadId}/reassign`, {
        method: 'POST',
        body: JSON.stringify({ new_rm_id: newRmId, reason })
      });
    }
    return { id: leadId, assigned_rm_id: newRmId };
  },

  async reassignManagerAction(actionId, newRmId, reason = '') {
    if (apiConfig.useBackend) {
      return await handleFetch(`/manager/actions/${actionId}/reassign`, {
        method: 'POST',
        body: JSON.stringify({ new_rm_id: newRmId, reason })
      });
    }
    return { id: actionId, rm_id: newRmId };
  },

  async resolveManagerAction(actionId, notes = '') {
    if (apiConfig.useBackend) {
      return await handleFetch(`/manager/actions/${actionId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ notes })
      });
    }
    return { id: actionId, status: 'COMPLETED' };
  },

  async fetchRegionalDashboard() {
    try {
      if (apiConfig.useBackend) return await handleFetch('/regional/dashboard');
    } catch (e) {
      console.warn("FastAPI Regional dashboard offline:", e.message);
    }
    return null;
  },

  async fetchRegionalBranchDetail(branchId) {
    try {
      if (apiConfig.useBackend) return await handleFetch(`/regional/branches/${branchId}`);
    } catch (e) {
      console.warn("FastAPI Regional branch detail offline:", e.message);
    }
    return null;
  },

  async resolveRegionalAction(actionId, notes = '') {
    if (apiConfig.useBackend) {
      return await handleFetch(`/regional/actions/${actionId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ notes })
      });
    }
    return { id: actionId, status: 'COMPLETED' };
  },

  async fetchRegionalBranches() {
    try {
      if (apiConfig.useBackend) return await handleFetch('/regional/branches');
    } catch (e) {
      console.warn("FastAPI Regional branches offline:", e.message);
    }
    return [];
  },

  async fetchRegionalPerformance() {
    try {
      if (apiConfig.useBackend) return await handleFetch('/regional/performance');
    } catch (e) {
      console.warn("FastAPI Regional performance offline:", e.message);
    }
    return [];
  },

  async fetchRegionalAlerts() {
    try {
      if (apiConfig.useBackend) return await handleFetch('/regional/risk');
    } catch (e) {
      console.warn("FastAPI Regional alerts offline:", e.message);
    }
    return [];
  },

  async fetchRegionalAchievements() {
    try {
      if (apiConfig.useBackend) return await handleFetch('/regional/achievements');
    } catch (e) {
      console.warn("FastAPI Regional achievements offline:", e.message);
    }
    return [];
  },

  async fetchRmDashboard() {
    return {
      rmName: "Rahul Sharma",
      todayTargetAchievement: 68,
      expectedTarget: 74,
      pipelineValue: 82400000,
      priorityActions: initialActions
    };
  },

  async fetchManagerDashboard() {
    return {
      managerName: "Anita Verma",
      todayTargetAchievement: 78,
      teamMembers: initialRms
    };
  },

  async fetchRegionalDashboard() {
    try {
      if (apiConfig.useBackend) {
        return await handleFetch('/regional/dashboard');
      }
    } catch (err) {
      if (!err.message?.includes('401')) {
        console.warn('FastAPI Regional Dashboard offline:', err.message);
      }
    }
    return null;
  },

  async ingestEvent(eventPayload) {
    try {
      if (apiConfig.useBackend) {
        return await handleFetch('/events/ingest', {
          method: 'POST',
          body: JSON.stringify(eventPayload)
        });
      }
    } catch (err) {
      console.warn('FastAPI event ingest failed:', err.message);
    }
    return { status: "processed", eventId: "evt-" + Date.now() };
  },

  async completeAction(actionId, outcomeData) {
    if (apiConfig.useBackend) {
      const data = await handleFetch(`/actions/${actionId}/complete`, {
        method: 'POST',
        body: JSON.stringify(outcomeData)
      });
      return mapActionResponse(data);
    }
    return { success: true, id: actionId };
  },

  async snoozeAction(actionId, minutes) {
    if (apiConfig.useBackend) {
      const data = await handleFetch(`/actions/${actionId}/snooze`, {
        method: 'POST',
        body: JSON.stringify({ minutes })
      });
      return mapActionResponse(data);
    }
    return { success: true, id: actionId };
  },

  async reassignAction(actionId, newRmId) {
    if (apiConfig.useBackend) {
      const data = await handleFetch(`/actions/${actionId}/reassign`, {
        method: 'POST',
        body: JSON.stringify({ new_rm_id: newRmId })
      });
      return mapActionResponse(data);
    }
    return { success: true, id: actionId };
  },

  async recordOutcome(actionId, outcome) {
    if (apiConfig.useBackend) {
      const data = await handleFetch(`/actions/${actionId}/outcome`, {
        method: 'POST',
        body: JSON.stringify({ outcome })
      });
      return mapActionResponse(data);
    }
    return { success: true, id: actionId };
  },

  async fetchSimulatorStats() {
    try {
      if (apiConfig.useBackend) {
        return await handleFetch('/simulator/stats');
      }
    } catch (e) {
      console.warn("Simulator stats offline:", e.message);
    }
    return {
      is_simulator_running: false,
      queue_depth: 0,
      active_processing: 0,
      processed_count: 42,
      failed_count: 0,
      total_queued: 42
    };
  },

  async startSimulator() {
    if (apiConfig.useBackend) {
      return await handleFetch('/simulator/start', { method: 'POST' });
    }
    return { success: true };
  },

  async stopSimulator() {
    if (apiConfig.useBackend) {
      return await handleFetch('/simulator/stop', { method: 'POST' });
    }
    return { success: true };
  },

  async triggerJourney(blueprintName, customerId = "1") {
    if (apiConfig.useBackend) {
      return await handleFetch(`/simulator/journey/${blueprintName}?customer_id=${customerId}`, { method: 'POST' });
    }
    return { success: true };
  },

  async fetchEvents() {
    try {
      if (apiConfig.useBackend) {
        return await handleFetch('/events');
      }
    } catch (e) {
      console.warn("Fetch events offline:", e.message);
    }
    return [
      { id: "evt-1", event_type: "WEBSITE_VISIT", entity_type: "CUSTOMER", entity_id: "1", payload: {}, occurred_at: new Date().toISOString(), created_at: new Date().toISOString(), idempotency_key: "idemp-1" },
      { id: "evt-2", event_type: "PRODUCT_VIEW", entity_type: "CUSTOMER", entity_id: "1", payload: {}, occurred_at: new Date().toISOString(), created_at: new Date().toISOString(), idempotency_key: "idemp-2" }
    ];
  },

  async sendAIChatMessage(message) {
    if (apiConfig.useBackend) {
      return await handleFetch('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message })
      });
    }
    return {
      message: "SalesOrbit AI offline.",
      role: "RM",
      tool_calls_executed: [],
      data_context_summary: {}
    };
  }
};
