
import { Routes, Route } from "react-router-dom";

// Páginas públicas
import LandingPage from "../features/landing/pages/LandingPage.jsx";
import LoginPage from "../features/auth/pages/LoginPage.jsx";

// Páginas del CRM
import AdminDashboardPage from "../features/admin/pages/AdminDashboardPage.jsx";
import ClientsListPage from "../features/clients/pages/ClientsListPage.jsx";
import DebtsListPage from "../features/debts/pages/DebtsListPage.jsx";

// Inteligencia artificial
import ChatbotPage from "../features/ai/pages/ChatbotPage.jsx";

// Seguridad y diseño
import ProtectedRoute from "./ProtectedRoute.jsx";
import AdminLayout from "../components/layout/AdminLayout.jsx";

import SuperAdminDashboardPage from "../features/superadmin/pages/SuperAdminDashboardPage.jsx";


// Rutas centralizadas
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

      {/* RUTAS PRIVADAS: ADMIN Y USER */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN", "USER"]}
          />
        }
      >
        {/* DISEÑO ADMINISTRATIVO COMPARTIDO */}
        <Route element={<AdminLayout />}>

          {/* ASISTENTE INTELIGENTE */}
          <Route
            path={PATHS.aiChat}
            element={<ChatbotPage />}
          />

          {/* RUTAS EXCLUSIVAS DEL ADMIN */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={["ADMIN"]}
              />
            }
          >
            <Route
              path={PATHS.dashboard}
              element={<AdminDashboardPage />}
            />

            <Route
              path={PATHS.clients}
              element={<ClientsListPage />}
            />

            <Route
              path={PATHS.debts}
              element={<DebtsListPage />}
            />
          </Route>

        </Route>
      </Route>


      {/* PANEL EXCLUSIVO DEL SUPER_ADMIN */}
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


      {/* RUTA NO ENCONTRADA */}
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
