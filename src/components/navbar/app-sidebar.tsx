"use client";

import type { ComponentProps } from "react";
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
  url: "https://landing.prometeo.miguelprez.es",
  src: "/logo.svg",
  alt: "Prometeo Logo",
  title: "Prometeo",
};

export function AppSidebar({
  sections = [],
  ...props
}: ComponentProps<typeof Sidebar> & { sections?: Section[] }) {
  const { user } = useAuthContext();
  const isAdmin = (user?.role || "").toLowerCase().includes("admin");
  const isDev =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  const actualVersion = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.PACKAGE_VERSION
    ? import.meta.env.PACKAGE_VERSION
    : "unknown";

  const visibleSections = sections
    .filter((section) => !section.adminOnly || isAdmin)
    .map((section) => ({ ...section, routes: section.routes || [] }))
    .filter((section) => section.routes.length > 0 || !section.adminOnly);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-sidebar-border/40 border-b px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-auto data-[slot=sidebar-menu-button]:!p-0"
            >
              <Link
                to={logo.url}
                className="flex w-full items-center gap-3 rounded-md px-2 py-1.5"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-sidebar-border/50 bg-sidebar">
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    title={logo.title}
                    className="h-5 dark:invert"
                  />
                </span>
                <span className="min-w-0 flex-1 leading-none">
                  <span className="block truncate text-[15px] font-semibold tracking-[0.04em]">
                    PROMETEO
                  </span>
                  <span className="mt-1 block truncate text-xs text-sidebar-foreground/55">
                    {isDev ? `Development v.${actualVersion}` : `v.${actualVersion}`}
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-1 pt-3">
        <NavMain sections={visibleSections} />
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border/40 border-t p-2">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
