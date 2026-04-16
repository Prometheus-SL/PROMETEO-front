"use client";

import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { Link } from "react-router-dom";
import { useAuthContext } from "@/providers/AuthProvider";
import { Badge } from "@/components/ui/badge";

type Section = {
  title: string;
  routes: { title: string; url: string }[];
  adminOnly?: boolean;
};

const logo = {
  url: "/",
  src: "/logo.svg",
  alt: "Prometeo Logo",
  title: "Prometeo",
};

export function AppSidebar({
  sections = [],
  ...props
}: React.ComponentProps<typeof Sidebar> & { sections?: Section[] }) {
  const { user } = useAuthContext();
  const isAdmin = (user?.role || "").toLowerCase().includes("admin");
  const isDev =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  const visibleSections = sections
    .filter((s) => !s.adminOnly || isAdmin)
    .map((s) => ({ ...s, routes: s.routes || [] }))
    .filter((s) => s.routes.length > 0 || !s.adminOnly); // evita grupos vacíos solo si serían admin-only
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link
                to="https://landing.prometeo.miguelprez.es/"
                target="_blank"
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  title={logo.title}
                  className="h-6 dark:invert"
                />
                <span className="text-base font-semibold">Prometeo</span>
                {isDev ? (
                  <Badge
                    variant="outline"
                    className="ml-1 text-[10px] px-1.5 py-0"
                  >
                    DEV
                  </Badge>
                ) : null}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain sections={visibleSections} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
