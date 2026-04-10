import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";

import HomePage from "@/pages/HomePage";
import LinkedAccountCallbackPage from "@/pages/LinkedAccountCallbackPage";
import LoginPage from "@/pages/LoginPage";
import NotFoundPage from "@/pages/404Page";
import QRLoginPage from "@/pages/QRLoginPage";
import AppLayout from "./layouts/AppLayout";
import RegisterPage from "./pages/RegisterPage";
import { PrivateRoute } from "./routes/PrivateRoute";

const AccountPage = lazy(() => import("./pages/AccountPage"));
const ClientLayout = lazy(() => import("./layouts/ClientLayout"));
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));
const AgentsPage = lazy(() => import("./pages/admin/AgentsPage"));
const MarketplacePage = lazy(() => import("./pages/MarketplacePage"));
const DashboardsPage = lazy(() => import("./pages/DashboardsPage"));
const ClientDashboardsPage = lazy(() => import("./pages/ClientDashboardsPage"));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Loading...
    </div>
  );
}

function lazyElement(Component: LazyExoticComponent<ComponentType>) {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Component />
    </Suspense>
  );
}

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
    path: "/linked-account-callback",
    element: <LinkedAccountCallbackPage />,
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
          { title: "Account", url: "/account" },
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
        element: lazyElement(DashboardsPage),
        handle: { title: "Edit Dashboards" },
      },
      {
        path: "/marketplace",
        element: lazyElement(MarketplacePage),
        handle: { title: "Marketplace" },
      },
      {
        path: "/account",
        element: lazyElement(AccountPage),
        handle: { title: "Account" },
      },
      {
        path: "/admin/users",
        element: lazyElement(UsersPage),
        handle: { title: "Users" },
      },
      {
        path: "/admin/agents",
        element: lazyElement(AgentsPage),
        handle: { title: "Agents" },
      },
    ],
  },
  {
    path: "/client",
    element: lazyElement(ClientLayout),
    children: [
      {
        index: true,
        element: lazyElement(ClientDashboardsPage),
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
];
