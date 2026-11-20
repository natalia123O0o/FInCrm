import { Routes, Route, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/context/AuthContext.jsx";

// Páginas públicas
import LandingPage from "../features/landing/pages/LandingPage.jsx";
import LoginPage from "../features/auth/pages/LoginPage.jsx";

// ADMIN
import AdminDashboardPage from "../features/admin/pages/AdminDashboardPage.jsx";
import ClientsListPage from "../features/clients/pages/ClientsListPage.jsx";
import DebtsListPage from "../features/debts/pages/DebtsListPage.jsx";
import UsersPage from "../features/user/pages/UsersPage.jsx";

// SUPER_ADMIN y USER
import SuperAdminDashboardPage from "../features/superadmin/pages/SuperAdminDashboardPage.jsx";
import UserDashboardPage from "../features/user/pages/UserDashboardPage.jsx";

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
        path="/forgot-password"
        element={<ForgotPasswordPage />}
      />

      <Route
        path="/verificar-cliente"
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
            path="/verificar-mi-correo"
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

          <Route
            path="/admin/verificar-clientes"
            element={<AdminClientVerificationPage />}
          />

          <Route
            path={PATHS.clients}
            element={<ClientsListPage />}
          />

          <Route
            path={PATHS.debts}
            element={<DebtsListPage />}
          />

          <Route
            path={PATHS.users}
            element={<UsersPage />}
          />

          <Route
            path={PATHS.messaging}
            element={<MessagingPage />}
          />

          <Route
            path="/pos"
            element={<PosPage />}
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

      {/* INTELIGENCIA ARTIFICIAL */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "USER"]} />
        }
      >
        <Route
          path={PATHS.aiChat}
          element={<ChatbotPage />}
        />

        {/* FINVOICE */}
        <Route element={<RoleLayout />}>
          <Route
            path="/finvoice"
            element={<VoicePage />}
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
