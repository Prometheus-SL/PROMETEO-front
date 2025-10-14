import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});

type ClientNavbarProps = {
  className?: string;
};

export function ClientNavbar({ className }: ClientNavbarProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const dateLabel = capitalize(dateFormatter.format(now));
  const timeLabel = timeFormatter.format(now);

  return (
    <header
      className={cn(
        "flex flex-col gap-3 border-b border-border bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex flex-col text-sm text-muted-foreground">
        <span className="text-lg font-semibold text-foreground">
          {timeLabel}
        </span>
        <span>{dateLabel}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground shadow">
          P
        </div>
        <div className="text-right">
          <p className="text-base font-semibold text-foreground">Prometeo</p>
          <p className="text-sm text-muted-foreground">Client Dashboard</p>
        </div>
      </div>
    </header>
  );
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
