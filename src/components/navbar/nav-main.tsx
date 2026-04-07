"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";

type Section = {
  title: string;
  routes: { title: string; url: string }[];
};

export function NavMain({ sections }: { sections: Section[] }) {
  const location = useLocation();
  return (
    <div className="flex flex-col gap-2">
      {sections.map((section) => (
        <SidebarGroup key={section.title}>
          <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {section.routes.map((route) => (
                <SidebarMenuItem key={`${section.title}-${route.title}`}>
                  <SidebarMenuButton
                    tooltip={route.title}
                    asChild
                    isActive={location.pathname === route.url}
                  >
                    <Link to={route.url}>
                      <span>{route.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </div>
  );
}
