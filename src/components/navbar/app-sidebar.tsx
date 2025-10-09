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
  const displayUser = {
    name: user?.name ?? "Usuario",
    email: user?.email ?? "",
    role: user?.role ?? "Member",
    nickname: user?.username ?? "Usuario",
    surname: user?.surname ?? "Usuario",
    avatar: "/avatars/shadcn.jpg",
  };
  const isAdmin = (user?.role || "").toLowerCase().includes("admin");
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
              <Link to="https://landing.prometeo.miguelprez.es/">
                <img
                  src={logo.src}
                  alt={logo.alt}
                  title={logo.title}
                  className="h-6 dark:invert"
                />
                <span className="text-base font-semibold">Prometeo</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain sections={visibleSections} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={displayUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
