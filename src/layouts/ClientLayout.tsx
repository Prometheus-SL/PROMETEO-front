import { useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { useIdle } from "@uidotdev/usehooks";

import { ClientNavbar } from "@/components/navbar/client-navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";

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

  const timeLabel = useMemo(
    () =>
      now.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    [locale, now]
  );

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

  if (isIdle) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-black text-white">
        <Card className="bg-white/10 text-white shadow-2xl backdrop-blur-lg max-w-sm border-white/10 border-dashed">
          <CardContent className="flex flex-col items-center gap-6 ">
            <time
              className="text-7xl font-semibold tabular-nums"
              aria-live="polite"
            >
              {timeLabel}
            </time>
            <Separator className="bg-white/10" />
            <span
              className="text-lg tracking-wide text-white/70"
              aria-hidden="true"
            >
              {dateLabel.replace(/^\w/, (c) => c.toUpperCase())}
            </span>
          </CardContent>
        </Card>
      </div>
    );
  }

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
