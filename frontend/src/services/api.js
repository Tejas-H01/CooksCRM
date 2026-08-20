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

const handleFetch = async (endpoint, options = {}) => {
  if (!apiConfig.useBackend) {
    throw new Error('Backend mode disabled - using mock data');
  }

  const token = localStorage.getItem('token');
  const primaryUrl = `${apiConfig.baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(primaryUrl, { ...options, headers });

    if (response.status === 401) {
      localStorage.removeItem('token');
      throw new Error('401 Unauthorized');
    }

    if (!response.ok) {
      throw new Error(`FastAPI Request Failed: ${response.status} ${response.statusText}`);
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
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.access_token) {
            localStorage.setItem('token', data.access_token);
          }
          return data;
        }

        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Invalid username or password');
        }

        throw new Error(`Authentication failed with status ${response.status}`);
      } catch (err) {
        if (err.message === 'Invalid username or password' || err.message?.includes('401')) {
          throw err;
        }
        console.warn('FastAPI login server unavailable, using offline fallback:', err.message);
      }
    }

    // Offline / Mock Fallback Login
    if (username && password) {
      const mockToken = "mock_jwt_token_" + Date.now();
      localStorage.setItem('token', mockToken);
      return { access_token: mockToken, token_type: "bearer", username };
    }
    throw new Error('Please enter username and password');
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
    try {
      if (apiConfig.useBackend) return await handleFetch('/rm/me/actions');
    } catch (e) {
      console.warn("FastAPI RM actions offline, using mock:", e.message);
    }
    return initialActions;
  },

  async fetchRmLeads() {
    try {
      if (apiConfig.useBackend) return await handleFetch('/rm/me/leads');
    } catch (e) {
      console.warn("FastAPI RM leads offline, using mock:", e.message);
    }
    return initialLeads;
  },

  async fetchRmPerformance() {
    try {
      if (apiConfig.useBackend) return await handleFetch('/rm/me/performance');
    } catch (e) {
      console.warn("FastAPI RM performance offline:", e.message);
    }
    return null;
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
    return initialSystemAlerts;
  },

  async fetchRegionalBranches() {
    try {
      if (apiConfig.useBackend) return await handleFetch('/regional/branches');
    } catch (e) {
      console.warn("FastAPI Regional branches offline:", e.message);
    }
    return initialBranches;
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
      if (apiConfig.useBackend) return await handleFetch('/regional/alerts');
    } catch (e) {
      console.warn("FastAPI Regional alerts offline:", e.message);
    }
    return initialSystemAlerts;
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
    return {
      regionalHeadName: "Sanjay Singhania",
      branches: initialBranches
    };
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
    try {
      if (apiConfig.useBackend) {
        return await handleFetch(`/rm/actions/${actionId}/complete`, {
          method: 'POST',
          body: JSON.stringify(outcomeData)
        });
      }
    } catch (err) {
      console.warn('FastAPI complete action failed:', err.message);
    }
    return { success: true, actionId };
  }
};
