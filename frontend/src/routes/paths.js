export const PATHS = {
  // Public and authentication
  landing: "/",
  login: "/login",
  forgotPassword: "/forgot-password",
  verifyClientEmail: "/verificar-cliente",
  verifyMyEmail: "/verificar-mi-correo",

  // ADMIN
  dashboard: "/dashboard",
  clients: "/clients",
  debts: "/debts",
  users: "/users",
  myPlan: "/mi-plan",
  messaging: "/messaging",
  activities: "/activities",
  opportunities: "/opportunities",
  adminVerifyClients: "/admin/verificar-clientes",
  pos: "/pos",
  // Módulos comerciales.
  quotes: "/quotes",
  campaigns: "/campaigns",
  campaignAnalytics: "/campaigns/analytics",

  // SUPER_ADMIN
  superAdminDashboard: "/super-admin/dashboard",
  superAdminPlans: "/super-admin/plans",
  superAdminTenant: "/super-admin/tenants/:tenantId",

  // USER
  userDashboard: "/user/dashboard",
  userActivities: "/user/activities",
  userOpportunities: "/user/opportunities",
  userAlerts: "/user/alerts", // Legacy: redirects to dashboard and notification bell
  userAssistant: "/user/assistant",

  // ADMIN and USER
  aiChat: "/ai/chat",
  finvoice: "/finvoice",
};
