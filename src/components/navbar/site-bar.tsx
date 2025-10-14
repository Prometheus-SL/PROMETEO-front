import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AnimatedThemeToggler } from "../ui/animated-theme-toggler";
import { RainbowButton } from "../ui/rainbow-button";
import { useNavigate } from "react-router-dom";

export function SiteHeader({ title = "Home" }: { title?: string }) {
  const navigate = useNavigate();

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 " />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <RainbowButton onClick={() => navigate("/client")}>
            Go to Client
          </RainbowButton>
          <Separator orientation="vertical" className="mx-2 hidden sm:flex" />
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a
              href="https://github.com/Prometheus-SL"
              rel="noopener noreferrer"
              target="_blank"
              className="dark:text-foreground"
            >
              GitHub
            </a>
          </Button>
          <Separator orientation="vertical" className="mx-2 hidden sm:flex" />
          <AnimatedThemeToggler className="hidden sm:flex" />
        </div>
      </div>
    </header>
  );
}
