import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

import Background from "@/components/common/background";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const PROMETEO_LANDING_URL = "https://landing.prometeo.miguelprez.es/";

type AuthShellProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  children: ReactNode;
  footer?: ReactNode;
  backLink?: {
    to: string;
    label: string;
  };
  maxWidth?: "sm" | "md" | "lg" | "xl";
  showShowcase?: boolean;
  className?: string;
  contentClassName?: string;
};

const maxWidthClasses = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
};

export function AuthShell({
  title,
  description,
  children,
  footer,
  backLink,
  maxWidth = "sm",
  className,
  contentClassName,
}: AuthShellProps) {
  return (
    <Background>
      <main className="relative flex min-h-screen w-screen flex-col overflow-x-hidden px-4 py-5 sm:px-6">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <a
            className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
          >
            <img
              src="/logo.svg"
              alt="Prometeo Logo"
              title="Prometeo"
              className="h-7 shrink-0 dark:invert"
            />
            <span>Prometeo</span>
          </a>

          <div className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" className="text-foreground/70">
              <a href={PROMETEO_LANDING_URL}>
                <ExternalLink className="size-4" />
                Landing
              </a>
            </Button>
          </div>
        </nav>

        <div className="mx-auto flex flex-1 w-full items-center justify-center py-8">
          <div
            className={cn(
              "flex w-full flex-col items-center gap-4",
              maxWidthClasses[maxWidth],
              className,
            )}
          >
            <section className="w-full rounded-md border border-white/10 bg-background/90 px-5 py-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:px-7 sm:py-8">
              <div
                className={cn(
                  "mx-auto flex min-w-0 flex-col gap-6",
                  contentClassName,
                )}
              >
                {backLink ? (
                  <Button asChild variant="ghost" size="sm" className="w-fit px-0">
                    <Link to={backLink.to}>
                      <ArrowLeft className="size-4" />
                      {backLink.label}
                    </Link>
                  </Button>
                ) : null}

                <header className="space-y-1.5 text-center">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {title}
                  </h1>
                  {description ? (
                    <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                  ) : null}
                </header>

                {children}
              </div>
            </section>

            {footer ? (
              <div className="text-muted-foreground flex flex-wrap justify-center gap-1.5 text-sm">
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </Background>
  );
}
