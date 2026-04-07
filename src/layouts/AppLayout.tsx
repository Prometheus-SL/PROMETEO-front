import { Outlet, useMatches } from "react-router-dom";
import { AppSidebar } from "@/components/navbar/app-sidebar";
import { SiteHeader } from "@/components/navbar/site-bar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";

type Section = {
  title: string;
  routes: { title: string; url: string }[];
  adminOnly?: boolean;
};

export default function AppLayout() {
  // Leemos metadatos (handle) de la ruta activa para título y secciones de la sidebar
  const matches = useMatches();

  // Título de la página desde el último match si define { title }
  const lastHandle = matches[matches.length - 1]?.handle as
    | { title?: string }
    | undefined;
  const title = lastHandle?.title ?? "Home";

  // Buscamos en la jerarquía el primer handle que sea un array de secciones
  const sections =
    [...matches]
      .reverse()
      .map((m) => m.handle)
      .find((h): h is Section[] => Array.isArray(h)) ?? [];

  return (
    <>
      <AppSidebar sections={sections} variant="inset" />
      <SidebarInset>
        <SiteHeader title={title} />
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </SidebarInset>
      <Toaster />
    </>
  );
}
