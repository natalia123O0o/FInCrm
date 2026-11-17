
import { Routes, Route } from "react-router-dom";

import LandingPage from "../features/landing/pages/LandingPage.jsx";
import LoginPage from "../features/auth/pages/LoginPage.jsx";
import AdminDashboardPage from "../features/admin/pages/AdminDashboardPage.jsx";
import ClientsListPage from "../features/clients/pages/ClientsListPage.jsx";
import DebtsListPage from "../features/debts/pages/DebtsListPage.jsx";
import ChatbotPage from "../features/ai/pages/ChatbotPage.jsx";

import ProtectedRoute from "./ProtectedRoute.jsx";
import { PATHS } from "./paths.js";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route
        path={PATHS.landing}
        element={<LandingPage />}
      />

      <Route
        path={PATHS.login}
        element={<LoginPage />}
      />

      {/* Rutas privadas para ADMIN */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]} />
        }
      >
        <Route
          path="/dashboard"
          element={<AdminDashboardPage />}
        />

        <Route
          path="/clients"
          element={<ClientsListPage />}
        />

        <Route
          path="/debts"
          element={<DebtsListPage />}
        />
      </Route>

      {/* Asistente de IA para ADMIN y USER */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "USER"]} />
        }
      >
        <Route
          path="/ai/chat"
          element={<ChatbotPage />}
        />
      </Route>

      {/* Página para rutas desconocidas */}
      <Route
        path="*"
        element={<h1>Página no encontrada</h1>}
      />
    </Routes>
  );
}
