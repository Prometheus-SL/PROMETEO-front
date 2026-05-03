import {
  lazy,
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
} from "react";
import { Navigate } from "react-router-dom";

import HomePage from "@/pages/HomePage";
import LinkedAccountCallbackPage from "@/pages/LinkedAccountCallbackPage";
import LoginPage from "@/pages/LoginPage";
import NotFoundPage from "@/pages/404Page";
import OAuthCallbackPage from "@/pages/OAuthCallbackPage";
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
const BotDiscordPage = lazy(() => import("./pages/BotDiscordPage"));
const DiscordInfoPage = lazy(() => import("./pages/DiscordInfoPage"));
const LockScreenPage = lazy(() => import("./pages/LockScreenPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const InstallPage = lazy(() => import("./pages/InstallPage"));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 w-full">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
          PROMETEO
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Loading...</p>
      </div>
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

export function createAppRoutes(isDev = import.meta.env.DEV) {
  const routes = [
    {
      path: "/login",
      element: <LoginPage />,
    },
    {
      path: "/register",
      element: <RegisterPage />,
    },
    {
      path: "/forgot-password",
      element: lazyElement(ForgotPasswordPage),
    },
    {
      path: "/qr-login/:code",
      element: <QRLoginPage />,
    },
    {
      path: "/verify-email",
      element: lazyElement(VerifyEmailPage),
    },
    {
      path: "/reset-password",
      element: lazyElement(ResetPasswordPage),
    },
    {
      path: "/linked-account-callback",
      element: <LinkedAccountCallbackPage />,
    },
    {
      path: "/oauth/callback",
      element: <OAuthCallbackPage />,
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
            { title: "Install", url: "/install" },
          ],
          adminOnly: false,
          title: "Principal",
        },
        {
          title: "Dashboards",
          routes: [
            { title: "Dashboards", url: "/dashboard" },
            { title: "Lock Screen", url: "/lockscreen" },
            { title: "Marketplace", url: "/marketplace" },
          ],
          adminOnly: false,
        },
        {
          title: "Administracion",
          routes: [
            { title: "Users", url: "/admin/users" },
            { title: "Agents", url: "/admin/agents" },
          ],
          adminOnly: true,
        },
        {
          title: "Discord",
          routes: [
            { title: "Integration", url: "/discord/info" },
            { title: "Notifications", url: "/discord/notifications" },
          ],
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
          path: "/install",
          element: lazyElement(InstallPage),
          handle: { title: "Install" },
        },
        {
          path: "/dashboard",
          element: lazyElement(DashboardsPage),
          handle: { title: "Edit Dashboards" },
        },
        {
          path: "/lockscreen",
          element: lazyElement(LockScreenPage),
          handle: { title: "Lock Screen" },
        },
        {
          path: "/dashboard/lock-screen",
          element: <Navigate to="/lockscreen" replace />,
          handle: { title: "Lock Screen" },
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
        {
          path: "/discord/info",
          element: lazyElement(DiscordInfoPage),
          handle: { title: "Discord Integration" },
        },
        {
          path: "/discord/notifications",
          element: lazyElement(BotDiscordPage),
          handle: { title: "Notifications" },
        },
        {
          path: "/discord/bot",
          element: <Navigate to="/discord/notifications" replace />,
          handle: { title: "Notifications" },
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

  if (isDev) {
    const DevModulesPage = lazy(() => import("./pages/DevModulesPage"));
    routes.unshift({
      path: "/dev/modules",
      element: lazyElement(DevModulesPage),
    });
  }

  return routes;
}

export const appRoutes = createAppRoutes();
