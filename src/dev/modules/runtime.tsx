import { useMemo, type ReactNode } from "react";
import {
  NavigationType,
  createPath,
  parsePath,
  type To,
  UNSAFE_LocationContext as LocationContext,
  UNSAFE_NavigationContext as NavigationContext,
  UNSAFE_RouteContext as RouteContext,
} from "react-router-dom";

import type { SharedAction } from "@/contexts/SharedContext";
import { AuthProvider, type AuthContextValue } from "@/providers/AuthProvider";
import { SharedContextProvider } from "@/providers/SharedContextProvider";

import type {
  ModuleDevAuthState,
  ModuleDevSurface,
  ModuleDevTheme,
} from "./types";

export const MODULE_DEV_SURFACE_STYLES: Record<ModuleDevSurface, string> = {
  dashboard:
    "bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.2),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,244,245,0.96))] dark:bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(9,9,11,0.96))]",
  client:
    "bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.2),transparent_24%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(236,253,245,0.95))] dark:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_26%),linear-gradient(180deg,rgba(2,44,34,0.92),rgba(2,6,23,0.96))]",
  ops:
    "bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.16),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.14),transparent_22%),linear-gradient(180deg,rgba(241,245,249,0.98),rgba(226,232,240,0.97))] dark:bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.14),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_24%),linear-gradient(180deg,rgba(10,15,28,0.98),rgba(2,6,23,0.96))]",
};

export function resolveModuleDevSurface(
  value?: string | null,
): ModuleDevSurface {
  if (value === "client" || value === "ops") {
    return value;
  }

  return "dashboard";
}

export function getModuleDevRoutePath(
  surface: ModuleDevSurface,
  routePath?: string,
) {
  if (routePath) {
    return routePath;
  }

  if (surface === "client") {
    return "/client/dev-preview";
  }

  if (surface === "ops") {
    return "/ops/dev-preview";
  }

  return "/dashboard/dev-preview";
}

export function createModuleDevAuthValue(
  authState?: ModuleDevAuthState,
): AuthContextValue {
  const role = authState?.role ?? authState?.user?.role ?? "admin";
  const username = authState?.user?.username ?? `dev-${role}`;

  return {
    accessToken: authState?.accessToken ?? "dev-access-token",
    refreshToken: authState?.refreshToken ?? "dev-refresh-token",
    user:
      authState?.user === null
        ? null
        : {
            id: authState?.user?.id ?? "dev-user",
            username,
            email: authState?.user?.email ?? `${username}@prometeo.dev`,
            role,
            name: authState?.user?.name ?? "Prometeo",
            surname: authState?.user?.surname ?? "Sandbox",
            ...authState?.user,
          },
    login: async () => undefined,
    loginQR: async () => undefined,
    logout: () => undefined,
    register: async () => undefined,
    loading: authState?.loading ?? false,
    error: authState?.error ?? null,
    clearError: () => undefined,
  };
}

function createPreviewNavigator() {
  return {
    createHref: (to: To) =>
      typeof to === "string" ? to : createPath(to),
    encodeLocation: (to: To) =>
      typeof to === "string" ? parsePath(to) : to,
    push: () => undefined,
    replace: () => undefined,
    go: () => undefined,
  };
}

function ModuleDevRouterProvider({
  children,
  routePath,
}: {
  children: ReactNode;
  routePath: string;
}) {
  const location = useMemo(() => {
    const parsed = parsePath(routePath);

    return {
      pathname: parsed.pathname ?? "/",
      search: parsed.search ?? "",
      hash: parsed.hash ?? "",
      state: null,
      key: "dev-modules-preview",
    };
  }, [routePath]);

  const navigator = useMemo(() => createPreviewNavigator(), []);

  return (
    <NavigationContext.Provider
      value={
        {
          basename: "",
          navigator,
          static: false,
          future: {},
        } as never
      }
    >
      <LocationContext.Provider
        value={
          {
            location,
            navigationType: NavigationType.Pop,
          } as never
        }
      >
        <RouteContext.Provider
          value={
            {
              outlet: null,
              matches: [],
              isDataRoute: false,
            } as never
          }
        >
          {children}
        </RouteContext.Provider>
      </LocationContext.Provider>
    </NavigationContext.Provider>
  );
}

export function ModuleDevPreviewProviders({
  actions,
  authState,
  children,
  routePath,
  sharedData,
  surface = "dashboard",
}: {
  actions?: SharedAction[];
  authState?: ModuleDevAuthState;
  children: ReactNode;
  routePath?: string;
  sharedData?: Record<string, unknown>;
  surface?: ModuleDevSurface;
  theme?: ModuleDevTheme;
}) {
  const resolvedSurface = resolveModuleDevSurface(surface);
  const resolvedRoutePath = getModuleDevRoutePath(resolvedSurface, routePath);

  return (
    <AuthProvider value={createModuleDevAuthValue(authState)}>
      <SharedContextProvider
        initialSharedData={sharedData}
        initialActions={actions}
      >
        <ModuleDevRouterProvider routePath={resolvedRoutePath}>
          {children}
        </ModuleDevRouterProvider>
      </SharedContextProvider>
    </AuthProvider>
  );
}
