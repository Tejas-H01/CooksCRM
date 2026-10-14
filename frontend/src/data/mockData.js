// Mock data aligned with backend constants and roles
export const BACKEND_ROLES = {
  ADMIN: "ADMIN",
  REGIONAL_HEAD: "REGIONAL_HEAD",
  BRANCH_MANAGER: "BRANCH_MANAGER",
  RM: "RM"
};

export const ROLE_DISPLAY_NAMES = {
  ADMIN: "Admin",
  REGIONAL_HEAD: "Regional Head",
  BRANCH_MANAGER: "Branch Manager",
  RM: "Relationship Manager"
};

export const initialRolesPermissions = [
  {
    id: "role-admin",
    name: "ADMIN",
    displayName: "Admin",
    description: "Full system control, rule configuration, user management, and integration monitoring",
    usersCount: 2,
    permissions: {
      viewSystemOverview: true,
      manageUsers: true,
      manageRoles: true,
      configureRules: true,
      viewAuditLogs: true,
      retryFailedEvents: true,
      reassignActions: true,
      viewTeamMetrics: true,
      completeActions: true
    }
  },
  {
    id: "role-regional",
    name: "REGIONAL_HEAD",
    displayName: "Regional Head",
    description: "Regional target management, branch benchmarking, escalation override, and territory oversight",
    usersCount: 4,
    permissions: {
      viewSystemOverview: false,
      manageUsers: false,
      manageRoles: false,
      configureRules: false,
      viewAuditLogs: true,
      retryFailedEvents: false,
      reassignActions: true,
      viewTeamMetrics: true,
      completeActions: false
    }
  },
  {
    id: "role-manager",
    name: "BRANCH_MANAGER",
    displayName: "Branch Manager",
    description: "Branch performance tracking, RM workload intervention, target monitoring, and lead reassignment",
    usersCount: 18,
    permissions: {
      viewSystemOverview: false,
      manageUsers: false,
      manageRoles: false,
      configureRules: false,
      viewAuditLogs: false,
      retryFailedEvents: false,
      reassignActions: true,
      viewTeamMetrics: true,
      completeActions: true
    }
  },
  {
    id: "role-rm",
    name: "RM",
    displayName: "Relationship Manager",
    description: "Operational lead handling, priority action completion, customer outreach, and daily targets",
    usersCount: 221,
    permissions: {
      viewSystemOverview: false,
      manageUsers: false,
      manageRoles: false,
      configureRules: false,
      viewAuditLogs: false,
      retryFailedEvents: false,
      reassignActions: false,
      viewTeamMetrics: false,
      completeActions: true
    }
  }
];

export const initialIntegrations = [
  {
    id: "int-1",
    name: "Payment Gateway Webhook (Razorpay / Stripe)",
    type: "REST Webhook",
    status: "Healthy",
    statusColor: "#01c58a",
    latencyMs: 142,
    successRate: 99.8,
    lastSync: "2 mins ago",
    endpoint: "https://api.salesorbit.com/v1/webhooks/payments"
  },
  {
    id: "int-2",
    name: "Core Banking & Demat API",
    type: "gRPC Service",
    status: "Healthy",
    statusColor: "#01c58a",
    latencyMs: 88,
    successRate: 99.9,
    lastSync: "1 min ago",
    endpoint: "https://core-banking.internal.salesorbit/v2/accounts"
  },
  {
    id: "int-3",
    name: "WhatsApp / SMS Notification Gateway",
    type: "Twilio / Gupshup API",
    status: "Degraded",
    statusColor: "#fca004",
    latencyMs: 840,
    successRate: 94.2,
    lastSync: "5 mins ago",
    endpoint: "https://api.gupshup.io/sm/v1/msg"
  },
  {
    id: "int-4",
    name: "Digital Analytics & Web Activity Tracker",
    type: "Segment / Kafka Pipeline",
    status: "Healthy",
    statusColor: "#01c58a",
    latencyMs: 65,
    successRate: 100,
    lastSync: "Just now",
    endpoint: "https://analytics.salesorbit.com/v1/events"
  },
  {
    id: "int-5",
    name: "FastAPI Event Engine Stream (Python Backend)",
    type: "WebSocket / SSE Stream",
    status: "Healthy",
    statusColor: "#01c58a",
    latencyMs: 24,
    successRate: 99.95,
    lastSync: "Live Stream Active",
    endpoint: "ws://localhost:8000/api/v1/events/stream"
  }
];

export const initialLeads = [
  {
    id: "lead-101",
    name: "Aarav Mehta",
    email: "aarav.mehta@gmail.com",
    phone: "+91 98765 43210",
    city: "Mumbai, India",
    leadSource: "Website - Wealth Form",
    leadStage: "Interest",
    potentialValue: 1800000,
    createdOn: "12 May 2024",
    lastContactDaysAgo: 5,
    assignedRmId: "rm-1",
    assignedRmName: "Rahul Sharma",
    branchId: "branch-mumbai",
    branchName: "Mumbai Central",
    regionId: "region-west",
    regionName: "West Region",
    managerName: "Anita Verma",
    tags: ["High Value Lead", "High Intent"],
    intentScore: 92,
    conversionProbability: 72,
    bestContactTime: "Today, 11:00 AM - 1:00 PM",
    nextFollowup: "Tomorrow",
    activityTimeline: [
      { id: 1, title: "Visited Investment Page", timestamp: "Yesterday, 10:24 AM", icon: "globe" },
      { id: 2, title: "Downloaded Wealth Brochure", timestamp: "2 days ago", icon: "file" },
      { id: 3, title: "Lead Created", timestamp: "5 days ago", icon: "user-plus" },
      { id: 4, title: "Form Submitted", timestamp: "5 days ago", icon: "check-circle" }
    ],
    notes: [
      { id: 101, author: "Rahul Sharma", text: "Client interested in ₹18L SIP in equity funds. Follow-up required before market open.", date: "14 May 2024" }
    ]
  },
  {
    id: "lead-102",
    name: "Neha Shah",
    email: "neha.shah@techcorp.in",
    phone: "+91 98123 76543",
    city: "Pune, India",
    leadSource: "App Download",
    leadStage: "Evaluation",
    potentialValue: 700000,
    createdOn: "10 May 2024",
    lastContactDaysAgo: 1,
    assignedRmId: "rm-1",
    assignedRmName: "Rahul Sharma",
    branchId: "branch-mumbai",
    branchName: "Mumbai Central",
    regionId: "region-west",
    regionName: "West Region",
    managerName: "Anita Verma",
    tags: ["Medium Priority", "Follow-up Overdue"],
    intentScore: 78,
    conversionProbability: 64,
    bestContactTime: "Today, 2:00 PM - 4:00 PM",
    nextFollowup: "Overdue by 1 day",
    activityTimeline: [
      { id: 1, title: "Calculated SIP Returns on App", timestamp: "Today, 09:15 AM", icon: "calculator" },
      { id: 2, title: "Email Inquiry Sent", timestamp: "Yesterday", icon: "mail" }
    ],
    notes: [
      { id: 102, author: "Rahul Sharma", text: "Requested comparison between Liquid funds and Fixed Deposits.", date: "15 May 2024" }
    ]
  }
];

export const initialActions = [
  {
    id: "act-1",
    leadId: "lead-101",
    leadName: "Aarav Mehta",
    priority: "High Priority",
    title: "High Value Lead - SLA Breach Warning",
    description: "No contact for 28 hours after high-intent investment page visit. Potential value ₹18L.",
    type: "call",
    dueText: "Due Now (SLA Overdue)",
    assignedRmId: "rm-1",
    potentialValue: 1800000,
    urgencyScore: 98,
    status: "pending",
    suggestedMessage: "Hi Aarav, I wanted to follow up on our previous conversation regarding investment opportunities. I believe our customized wealth plan matches your goals. Would you be available for a quick call today?"
  }
];

export const initialRms = [
  {
    id: "rm-1",
    name: "Rahul Sharma",
    role: "RM",
    team: "North Team",
    branchId: "branch-mumbai",
    branchName: "Mumbai Central",
    regionId: "region-west",
    regionName: "West Region",
    managerName: "Anita Verma",
    targetAchievement: 61,
    expectedRunRate: 74,
    pipeline: 8200000,
    conversionRate: 12.0,
    overdueFollowups: 8,
    status: "At Risk",
    statusColor: "#f1526f",
    conversions: 12,
    todayFollowupsDue: 7
  },
  {
    id: "rm-2",
    name: "Neha Iyer",
    role: "RM",
    team: "West Team",
    branchId: "branch-mumbai",
    branchName: "Mumbai Central",
    regionId: "region-west",
    regionName: "West Region",
    managerName: "Anita Verma",
    targetAchievement: 107,
    expectedRunRate: 83,
    pipeline: 12000000,
    conversionRate: 18.0,
    overdueFollowups: 2,
    status: "On Track",
    statusColor: "#3ea4f5",
    conversions: 19,
    todayFollowupsDue: 3
  }
];

export const initialBranches = [
  {
    id: "branch-mumbai",
    name: "Mumbai Central",
    manager: "Anita Verma",
    regionId: "region-west",
    regionName: "West Region",
    rmsCount: 8,
    targetAchievement: 78,
    expectedRunRate: 83,
    totalPipeline: 48000000,
    atRiskPipeline: 7200000,
    conversionRate: 14.2,
    overdueFollowups: 17,
    slaBreaches: 4
  },
  {
    id: "branch-delhi",
    name: "Delhi West",
    manager: "Karan Malhotra",
    regionId: "region-north",
    regionName: "North Region",
    rmsCount: 6,
    targetAchievement: 85,
    expectedRunRate: 80,
    totalPipeline: 36000000,
    atRiskPipeline: 4500000,
    conversionRate: 16.5,
    overdueFollowups: 9,
    slaBreaches: 2
  }
];

export const initialUsers = [
  { id: "usr-1", name: "Rahul Sharma", email: "rahul.sharma@salesorbit.com", role: "RM", team: "North Team", branchName: "Mumbai Central", regionName: "West Region", managerName: "Anita Verma", status: "Active", is_active: true, lastActive: "10:24 AM" },
  { id: "usr-2", name: "Neha Iyer", email: "neha.iyer@salesorbit.com", role: "RM", team: "West Team", branchName: "Mumbai Central", regionName: "West Region", managerName: "Anita Verma", status: "Active", is_active: true, lastActive: "09:15 AM" },
  { id: "usr-3", name: "Anita Verma", email: "anita.verma@salesorbit.com", role: "BRANCH_MANAGER", team: "North Team", branchName: "Mumbai Central", regionName: "West Region", managerName: "Sanjay Singhania", status: "Active", is_active: true, lastActive: "10:30 AM" },
  { id: "usr-4", name: "Sanjay Singhania", email: "sanjay.s@salesorbit.com", role: "REGIONAL_HEAD", team: "West Region", branchName: "All Branches", regionName: "West Region", managerName: "N/A", status: "Active", is_active: true, lastActive: "11:00 AM" },
  { id: "usr-5", name: "System Admin", email: "admin@salesorbit.com", role: "ADMIN", team: "System Admin", branchName: "Headquarters", regionName: "All Regions", managerName: "N/A", status: "Active", is_active: true, lastActive: "10:45 AM" }
];

export const initialAuditLogs = [
  { id: "log-1", action: "Updated Business Rule: SLA Window to 24h", performedBy: "System Admin", module: "Rules Engine", time: "10:24 AM" },
  { id: "log-2", action: "Created User: Kavita Rao (RM)", performedBy: "System Admin", module: "User Management", time: "09:15 AM" }
];

export const initialSystemAlerts = [
  { id: "alt-1", type: "error", title: "High system load", detail: "CPU usage is above 88%", time: "Active" },
  { id: "alt-2", type: "warning", title: "2 Failed Integrations", detail: "Check Integration logs", time: "15m ago" }
];

export const initialFailedEvents = [
  { id: "evt-fail-1", eventType: "PAYIN_RECEIVED", source: "PaymentGateway_Webhook", errorMsg: "Missing customer_id mapping", payload: '{"amount": 500000, "txnId": "TXN_99281"}', timestamp: "10:12 AM", status: "failed" },
  { id: "evt-fail-2", eventType: "SLA_BREACH_ALERT", source: "Cron_RuleEngine", errorMsg: "RM assignment unverified", payload: '{"leadId": "lead-99", "hours": 36}', timestamp: "08:45 AM", status: "failed" }
];
