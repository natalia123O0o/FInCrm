import { Routes, Route, Outlet, Navigate, Link } from "react-router-dom";
import { useAuth } from "../features/auth/context/AuthContext.jsx";

// Páginas públicas
import LandingPage from "../features/landing/pages/LandingPage.jsx";
import LoginPage from "../features/auth/pages/LoginPage.jsx";

import AdminActivitiesPage from "../features/activities/pages/AdminActivitiesPage.jsx";
import UserActivitiesPage from "../features/activities/pages/UserActivitiesPage.jsx";
import OpportunitiesPage from "../features/opportunities/pages/OpportunitiesPage.jsx";
import QuotesPage from "../features/quotes/pages/QuotesPage.jsx";
import CampaignsPage from "../features/campaigns/pages/CampaignsPage.jsx";
import CampaignAnalyticsPage from "../features/campaigns/pages/CampaignAnalyticsPage.jsx";
import UserAssistantPage from "../features/user/pages/UserAssistantPage.jsx";

// ADMIN
import AdminDashboardPage from "../features/admin/pages/AdminDashboardPage.jsx";
import ClientsListPage from "../features/clients/pages/ClientsListPage.jsx";
import DebtsListPage from "../features/debts/pages/DebtsListPage.jsx";
import UsersPage from "../features/user/pages/UsersPage.jsx";

// SUPER_ADMIN y USER
import SuperAdminDashboardPage from "../features/superadmin/pages/SuperAdminDashboardPage.jsx";
import UserDashboardPage from "../features/user/pages/UserDashboardPage.jsx";

import PlansPage from "../features/plans/pages/PlansPage.jsx";
import MyPlanPage from "../features/plans/pages/MyPlanPage.jsx";
import FeatureGate from "../features/plans/components/FeatureGate.jsx";
import TenantDetailPage from "../features/superadmin/pages/TenantDetailPage.jsx";

// Otros módulos
import ChatbotPage from "../features/ai/pages/ChatbotPage.jsx";
import MessagingPage from "../features/messaging/pages/MessagingPage.jsx";
import PosPage from "../features/pos/pages/PosPage.jsx";
import VoicePage from "../features/voice/pages/VoicePage.jsx";

// Verificación y recuperación
import ForgotPasswordPage from "../features/auth/pages/ForgotPasswordPage.jsx";
import VerifyMyEmailPage from "../features/auth/pages/VerifyMyEmailPage.jsx";
import AdminClientVerificationPage from "../features/verification/pages/AdminClientVerificationPage.jsx";
import ClientEmailVerificationPage from "../features/verification/pages/ClientEmailVerificationPage.jsx";

// Seguridad y navegación
import AdminLayout from "../components/layout/AdminLayout.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import { PATHS } from "./paths.js";

// Conserva el menú lateral para ADMIN.
function RoleLayout() {
  const { user } = useAuth();

  return user?.role === "ADMIN"
    ? <AdminLayout />
    : <Outlet />;
}

// Temporary informational page: these modules are planned, not implemented yet.
function PlannedModulePage({ title, description }) {
  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <Link to={PATHS.dashboard} style={{ color: "#0F172A", textDecorationColor: "#0284C7", fontWeight: 600 }}>
        Volver al panel
      </Link>
      <section style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: 24, marginTop: 24 }}>
        <h1 style={{ color: "#0F172A", fontSize: "clamp(32px, 4vw, 40px)", fontWeight: 800, margin: "0 0 8px" }}>
          {title}
        </h1>
        <p style={{ color: "#64748B", fontSize: 16, lineHeight: 1.5 }}>{description}</p>
        <p style={{ color: "#18181B", lineHeight: 1.5 }}>
          Módulo pendiente de desarrollo. Esta pantalla no guarda datos ni envía mensajes.
        </p>
      </section>
    </main>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* RUTAS PÚBLICAS */}
      <Route
        path={PATHS.landing}
        element={<LandingPage />}
      />

      <Route
        path={PATHS.login}
        element={<LoginPage />}
      />

      <Route
        path={PATHS.forgotPassword}
        element={<ForgotPasswordPage />}
      />

      <Route
        path={PATHS.verifyClientEmail}
        element={<ClientEmailVerificationPage />}
      />

      {/* VERIFICACIÓN PARA TODOS LOS ROLES */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={["SUPER_ADMIN", "ADMIN", "USER"]}
          />
        }
      >
        <Route element={<RoleLayout />}>
          <Route
            path={PATHS.verifyMyEmail}
            element={<VerifyMyEmailPage />}
          />
        </Route>
      </Route>

      {/* SUPER_ADMIN */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} />
        }
      >
        <Route
          path={PATHS.superAdminDashboard}
          element={<SuperAdminDashboardPage />}
        />
        <Route path={PATHS.superAdminPlans} element={<PlansPage />} />
        <Route path={PATHS.superAdminTenant} element={<TenantDetailPage />} />
      </Route>

      {/* ADMIN */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]} />
        }
      >
        <Route element={<AdminLayout />}>
          <Route
            path={PATHS.dashboard}
            element={<AdminDashboardPage />}
          />
          <Route path={PATHS.myPlan} element={<MyPlanPage />} />

          <Route
            path={PATHS.adminVerifyClients}
            element={<FeatureGate feature="crm"><AdminClientVerificationPage /></FeatureGate>}
          />

          <Route
            path={PATHS.clients}
            element={<FeatureGate feature="crm"><ClientsListPage /></FeatureGate>}
          />

          <Route
            path={PATHS.debts}
            element={<FeatureGate feature="crm"><DebtsListPage /></FeatureGate>}
          />

          <Route path={PATHS.activities} element={<FeatureGate feature="activities"><AdminActivitiesPage /></FeatureGate>} />

          <Route path={PATHS.opportunities} element={<FeatureGate feature="opportunities"><OpportunitiesPage /></FeatureGate>} />

          {/* FinCotiza funcional. */}
          <Route path={PATHS.quotes} element={<FeatureGate feature="quotes"><QuotesPage /></FeatureGate>} />
          {/* FinCampaigns real: gestión + indicadores de seguimiento. */}
          <Route path={PATHS.campaigns} element={<FeatureGate feature="campaigns"><CampaignsPage /></FeatureGate>} />
          <Route path={PATHS.campaignAnalytics} element={<FeatureGate feature="campaigns"><CampaignAnalyticsPage /></FeatureGate>} />

          <Route
            path={PATHS.users}
            element={<UsersPage />}
          />

          <Route
            path={PATHS.messaging}
            element={<FeatureGate feature="messaging"><MessagingPage /></FeatureGate>}
          />

          <Route
            path={PATHS.pos}
            element={<FeatureGate feature="pos"><PosPage /></FeatureGate>}
          />
        </Route>
      </Route>

      {/* USER */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["USER"]} />
        }
      >
        <Route
          path={PATHS.userDashboard}
          element={<UserDashboardPage />}
        />
      </Route>

      {/* Actividades exclusivas del empleado. */}
      <Route element={<ProtectedRoute allowedRoles={["USER"]} />}>
        <Route path={PATHS.userActivities} element={<FeatureGate feature="activities"><UserActivitiesPage /></FeatureGate>} />
        <Route path={PATHS.userOpportunities} element={<FeatureGate feature="opportunities"><OpportunitiesPage /></FeatureGate>} />
        <Route path={PATHS.userAlerts} element={<Navigate to={PATHS.userDashboard} replace />} />
        <Route path={PATHS.userAssistant} element={<FeatureGate feature="ai"><UserAssistantPage /></FeatureGate>} />
      </Route>

      {/* INTELIGENCIA ARTIFICIAL */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "USER"]} />
        }
      >
        <Route
          path={PATHS.aiChat}
          element={<FeatureGate feature="ai"><ChatbotPage /></FeatureGate>}
        />

        {/* FINVOICE */}
        <Route element={<RoleLayout />}>
          <Route
            path={PATHS.finvoice}
            element={<FeatureGate feature="pos"><VoicePage /></FeatureGate>}
          />
        </Route>
      </Route>

      {/* PÁGINA NO ENCONTRADA */}
      <Route
        path="*"
        element={
          <main style={{ padding: 32 }}>
            <h1>Página no encontrada</h1>
          </main>
        }
      />
    </Routes>
  );
}
