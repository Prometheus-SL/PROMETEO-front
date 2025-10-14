import { PrivateRoute } from "./routes/PrivateRoute";
import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import AppLayout from "./layouts/AppLayout";
import ClientLayout from "./layouts/ClientLayout";
import NotFoundPage from "@/pages/404Page";
import UsersPage from "./pages/admin/UsersPage";
import AgentsPage from "./pages/admin/AgentsPage";
import MarketplacePage from "@/pages/MarketplacePage";
import DashboardsPage from "./pages/DashboardsPage";
import QRLoginPage from "@/pages/QRLoginPage";
import ClientDashboardsPage from "./pages/ClientDashboardsPage";

export const appRoutes = [
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/qr-login/:code",
    element: <QRLoginPage />,
  },
  {
    path: "/",
    element: (
      <PrivateRoute>
        <AppLayout />
      </PrivateRoute>
    ),
    handle: [
      {
        routes: [
          { title: "Home", url: "/" },
          { title: "Dashboards", url: "/dashboard" },
        ],
        adminOnly: false,
        title: "Principal",
      },
      {
        title: "Administración",
        routes: [
          { title: "Users", url: "/admin/users" },
          { title: "Agents", url: "/admin/agents" },
        ],
        adminOnly: true,
      },
      {
        title: "Marketplace",
        routes: [{ title: "Marketplace", url: "/marketplace" }],
        adminOnly: false,
      },
    ],
    children: [
      {
        index: true,
        element: <HomePage />,
        handle: { title: "Home" },
      },
      {
        path: "/dashboard",
        element: <DashboardsPage />,
        handle: { title: "Edit Dashboards" },
      },
      {
        path: "/marketplace",
        element: <MarketplacePage />,
        handle: { title: "Marketplace" },
      },
      {
        path: "/admin/users",
        element: <UsersPage />,
        handle: { title: "Users" },
      },
      {
        path: "/admin/agents",
        element: <AgentsPage />,
        handle: { title: "Agents" },
      },
    ],
  },
  {
    path: "/client",
    element: (
      <PrivateRoute>
        <ClientLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <ClientDashboardsPage />,
      },
    ],
  },
  // Puedes añadir más rutas aquí
  {
    path: "*",
    element: <NotFoundPage />,
  },
];
