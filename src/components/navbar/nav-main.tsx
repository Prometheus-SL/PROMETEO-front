"use client";

import {
  Bell,
  BellRing,
  Bot,
  House,
  Info,
  LayoutDashboard,
  Lock,
  type LucideIcon,
  PanelTop,
  Store,
  Users,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

type RouteItem = { title: string; url: string; icon?: LucideIcon };

type Section = {
  title: string;
  routes: RouteItem[];
};

const ROUTE_ICONS: Record<string, LucideIcon> = {
  "/": House,
  "/dashboard": LayoutDashboard,
  "/lockscreen": Lock,
  "/dashboard/lock-screen": Lock,
  "/admin/users": Users,
  "/admin/agents": Bot,
  "/marketplace": Store,
  "/discord/info": Info,
  "/discord/notifications": Bell,
  "/discord/bot": BellRing,
};

function resolveRouteIcon(route: RouteItem): LucideIcon {
  return route.icon ?? ROUTE_ICONS[route.url] ?? PanelTop;
}

function isActiveRoute(pathname: string, routeUrl: string) {
  if (routeUrl === "/") return pathname === "/";
  return pathname === routeUrl || pathname.startsWith(`${routeUrl}/`);
}

export function NavMain({ sections }: { sections: Section[] }) {
  const location = useLocation();

  return (
    <div className="flex flex-col gap-5 px-2 pb-3">
      {sections.map((section) => (
        <SidebarGroup key={section.title} className="px-0 py-0">
          <SidebarGroupLabel className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
            {section.title}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {section.routes.map((route) => {
                const routeIsActive = isActiveRoute(location.pathname, route.url);
                const RouteIcon = resolveRouteIcon(route);

                return (
                  <SidebarMenuItem key={`${section.title}-${route.title}`}>
                    <SidebarMenuButton
                      tooltip={route.title}
                      asChild
                      isActive={routeIsActive}
                      className={cn(
                        "h-9 rounded-md px-2.5 text-sm font-medium transition-colors",
                        routeIsActive
                          ? "bg-sidebar-accent text-sidebar-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                      )}
                    >
                      <Link to={route.url} className="flex min-w-0 items-center gap-2.5">
                        <RouteIcon
                          className={cn(
                            "size-4 shrink-0",
                            routeIsActive
                              ? "text-sidebar-foreground"
                              : "text-sidebar-foreground/55",
                          )}
                        />
                        <span className="truncate">{route.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </div>
  );
}
