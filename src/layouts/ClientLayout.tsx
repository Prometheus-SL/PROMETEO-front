import { useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { useIdle } from "@uidotdev/usehooks";

import { ClientNavbar } from "@/components/navbar/client-navbar";
import { Toaster } from "@/components/ui/sonner";
import { SharedContextProvider } from "@/providers/SharedContextProvider";
import LockLayout from "./LockLayout";

export default function ClientLayout() {
  const isIdle = useIdle(1000 * 60 * 5); // 5 minutes
  const [now, setNow] = useState(() => new Date());
  const locale = useMemo(
    () => (typeof navigator !== "undefined" ? navigator.language : "es-ES"),
    []
  );

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const timeLabel = useMemo(() => now.toTimeString(), [now]);

  const dateLabel = useMemo(
    () =>
      now.toLocaleDateString(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [locale, now]
  );

  return (
    <SharedContextProvider>
      {isIdle && <LockLayout timeLabel={timeLabel} dateLabel={dateLabel} />}
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
