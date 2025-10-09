import { Outlet, useMatches } from "react-router-dom";
import { AppSidebar } from "@/components/navbar/app-sidebar";
import { SiteHeader } from "@/components/navbar/site-bar";
import { SidebarInset } from "@/components/ui/sidebar";

type NavItem = { title: string; url: string };

export default function AppLayout() {
  // Leemos metadatos (handle) de la ruta activa para título y menú
  const matches = useMatches();
  const activeHandle = matches[matches.length - 1]?.handle as
    | { title?: string; navMain?: NavItem[] }
    | undefined;

  // Buscamos el primer handle en la jerarquía que defina navMain
  const navHandle = [...matches]
    .reverse()
    .find((m) => (m.handle as { navMain?: NavItem[] } | undefined)?.navMain)
    ?.handle as { navMain?: NavItem[] } | undefined;

  const title = activeHandle?.title ?? "Home";
  const items: NavItem[] = navHandle?.navMain ?? [{ title: "Home", url: "/" }];

  return (
    <>
      <AppSidebar items={items} variant="inset" />
      <SidebarInset>
        <SiteHeader title={title} />
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </>
  );
}
