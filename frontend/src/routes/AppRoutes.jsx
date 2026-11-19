import { Routes, Route } from "react-router-dom";

import LandingPage from "../features/landing/pages/LandingPage.jsx";
import LoginPage from "../features/auth/pages/LoginPage.jsx";

import AdminDashboardPage from "../features/admin/pages/AdminDashboardPage.jsx";
import ClientsListPage from "../features/clients/pages/ClientsListPage.jsx";
import DebtsListPage from "../features/debts/pages/DebtsListPage.jsx";
import UsersPage from "../features/user/pages/UsersPage.jsx";

import SuperAdminDashboardPage from "../features/superadmin/pages/SuperAdminDashboardPage.jsx";
import UserDashboardPage from "../features/user/pages/UserDashboardPage.jsx";

import ChatbotPage from "../features/ai/pages/ChatbotPage.jsx";

import AdminLayout from "../components/layout/AdminLayout.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";

import MessagingPage from "../features/messaging/pages/MessagingPage.jsx";

import { PATHS } from "./paths.js";

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
          {/* Panel principal */}
          <Route
            path={PATHS.dashboard}
            element={<AdminDashboardPage />}
          />

          {/* Clientes */}
          <Route
            path={PATHS.clients}
            element={<ClientsListPage />}
          />

          {/* Deudas */}
          <Route
            path={PATHS.debts}
            element={<DebtsListPage />}
          />

          {/* NUEVA RUTA: EMPLEADOS */}
          <Route
            path={PATHS.users}
            element={<UsersPage />}
          />
        </Route>

        <Route
          path={PATHS.messaging}
          element={<MessagingPage />}
        />
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

      {/* ASISTENTE PARA ADMIN Y USER */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "USER"]} />
        }
      >
        <Route
          path={PATHS.aiChat}
          element={<ChatbotPage />}
        />
      </Route>

      {/* PÁGINA NO ENCONTRADA */}
      <Route
        path="*"
        element={
          <main style={{ padding: "32px" }}>
            <h1>Página no encontrada</h1>
          </main>
        }
      />
    </Routes>
  );
}
