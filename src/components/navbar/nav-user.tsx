"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { API_URL } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminBadge } from "../admin/admin-badge";
import { ConfettiButton } from "../ui/confetti";

export function NavUser() {
  const { isMobile } = useSidebar();
  const { logout, user } = useAuth();

  const isDev =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  if (!user) return null;

  const initials =
    `${(user.name || user.username).charAt(0)}${(user.surname || user.username).charAt(0)}`.toUpperCase();

  const avatarSrc = user.avatarUrl
    ? `${API_URL}${user.avatarUrl}?v=${encodeURIComponent(user.avatarUpdatedAt ?? "0")}`
    : undefined;

  return (
    <SidebarMenu>
      {user.birthday &&
        (() => {
          const birthday = new Date(user.birthday);
          const today = new Date();
          const isToday =
            birthday.getDate() === today.getDate() &&
            birthday.getMonth() === today.getMonth();
          return isToday ? (
            <div className="text-xs text-center text-muted-foreground mb-1">
              <ConfettiButton className="w-full">
                🎂 Happy Birthday, {user.name}!
              </ConfettiButton>
            </div>
          ) : null;
        })()}
      {isDev && (
        <SidebarMenuItem key={`developer-mode`}>
          <SidebarMenuButton
            tooltip="Module development and testing sandbox"
            asChild
            isActive={location.pathname === "/dev/modules"}
          >
            <Link to="/dev/modules">
              <span>Module development</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}

      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                {avatarSrc ? (
                  <AvatarImage src={avatarSrc} alt={user.username} />
                ) : null}
                <AvatarFallback className="rounded-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <div className="flex items-center gap-1">
                  <span className="truncate font-medium">{user.username}</span>{" "}
                  {user.role == "admin" && <AdminBadge className="ml-auto" />}
                </div>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {avatarSrc ? (
                    <AvatarImage src={avatarSrc} alt={user.username} />
                  ) : null}
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <div className="flex items-center gap-1">
                    <span className="truncate font-medium">
                      {user.username}
                    </span>{" "}
                    {user.role == "admin" && <AdminBadge className="ml-auto" />}
                  </div>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/account">Account</Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
