import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { FullscreenIcon, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  const { user } = useAuth();

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
  const greetingMessage = (() => {
    const hour = now.getHours();
    if (hour < 12 && hour > 6) return "Good morning";
    if (hour < 20) return "Good afternoon";
    return "Good night";
  })();

  const listItems = [
    {
      icon: RefreshCw,
      property: "Reload Page",
      onClick: () => window.location.reload(),
    },
    {
      icon: FullscreenIcon,
      property: "Toggle Fullscreen",
      onClick: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      },
    },
  ];

  return (
    <header
      className={cn(
        "border p-2 bg-card shadow-sm rounded mx-4 mt-4 top-0 z-50 mb-0 border-dashed",
        className
      )}
    >
      <div className="flex gap-3 flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={"/logo.svg"}
            alt={"Logo"}
            title={"Logo"}
            className="h-9 dark:invert"
          />
          <div className="flex flex-col text-sm text-muted-foreground">
            <span className="text-lg font-semibold text-foreground">
              Prometeo
            </span>
            <span>
              {greetingMessage} {user?.username}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          <div className="flex items-center gap-4">
            <div className="text-right flex flex-col text-sm text-muted-foreground">
              <span className="text-lg font-semibold text-foreground">
                {timeLabel}
              </span>
              <span>{dateLabel}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-9 w-9 rounded-lg grayscale touch-none select-none cursor-pointer hover:border hover:border ">
                  <AvatarFallback className="rounded-lg">
                    {(user?.name?.charAt(0) ?? "") +
                      (user?.surname?.charAt(0) ?? "")}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuGroup>
                  {listItems.map((item, index) => (
                    <DropdownMenuItem key={index} onClick={item.onClick}>
                      <item.icon />
                      <span className="text-popover-foreground">
                        {item.property}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
