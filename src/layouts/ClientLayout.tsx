import { Outlet } from "react-router-dom";
import { useIdle } from "@uidotdev/usehooks";

import { ClientNavbar } from "@/components/navbar/client-navbar";
import { Toaster } from "@/components/ui/sonner";
import { SharedContextProvider } from "@/providers/SharedContextProvider";
import LockLayout from "./LockLayout";

export default function ClientLayout() {
  const isIdle = useIdle(1000 * 60 * 5); // 5 minutes

  return (
    <SharedContextProvider>
      {isIdle && <LockLayout />}
      <div className="flex min-h-screen w-full flex-col bg-background">
        <ClientNavbar />
        <main className="flex flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
        <Toaster />
      </div>
    </SharedContextProvider>
  );
}
