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

type NavItem = { title: string; url: string };

const logo = {
  url: "/",
  src: "/logo.svg",
  alt: "Prometeo Logo",
  title: "Prometeo",
};

export function AppSidebar({
  items = [],
  ...props
}: React.ComponentProps<typeof Sidebar> & { items?: NavItem[] }) {
  const { user } = useAuthContext();
  const displayUser = {
    name: user?.name ?? "Usuario",
    email: user?.email ?? "",
    role: user?.role ?? "Member",
    nickname: user?.username ?? "Usuario",
    surname: user?.surname ?? "Usuario",
    avatar: "/avatars/shadcn.jpg",
  };
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
        <NavMain items={items} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={displayUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
