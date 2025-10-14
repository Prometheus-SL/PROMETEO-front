import { Outlet } from "react-router-dom";
import { ClientNavbar } from "@/components/navbar/client-navbar";
import { Toaster } from "@/components/ui/sonner";

export default function ClientLayout() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <ClientNavbar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
