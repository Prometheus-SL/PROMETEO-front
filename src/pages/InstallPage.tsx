import { useState, useCallback, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Monitor,
  Package,
  Rocket,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Trash2,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Meteors } from "@/components/ui/meteors";

const CODE = {
  installNvm: "npm install -g @prometeo-dashboard/desktop-shell",
  installSudo: "sudo npm install -g @prometeo-dashboard/desktop-shell",
  verify: "npm ls -g --depth=0 @prometeo-dashboard/desktop-shell",
  run: "prometeo",
  uninstall: "sudo npm uninstall -g @prometeo-dashboard/desktop-shell",
};

function CodeBlock({
  code,
  label,
  tone = "default",
}: {
  code: string;
  label?: string;
  tone?: "default" | "featured";
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [code]);

  const blockClassName =
    tone === "featured"
      ? "border-primary/25 bg-primary/[0.07] shadow-lg shadow-primary/10"
      : "border-border/70 bg-background/80";

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
            {label}
          </p>
          {tone === "featured" ? (
            <Badge className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
              Recommended
            </Badge>
          ) : null}
        </div>
      )}
      <div
        className={`flex items-center gap-3 rounded-2xl border px-3.5 py-2 font-mono transition-all ${blockClassName}`}
      >
        <pre className="flex-1 overflow-x-auto text-xs leading-relaxed whitespace-pre-wrap break-all">
          {code}
        </pre>
        <button
          onClick={handleCopy}
          aria-label="Copy to clipboard"
          className="shrink-0 rounded-xl border border-border/70 bg-background/90 p-2 text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground"
        >
          {copied ? (
            <Check className="size-3.5 text-emerald-500" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

function Mono({ children }: { children: string }) {
  return (
    <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px]">
      {children}
    </code>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/75">
      {children}
    </p>
  );
}

function RequirementPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1.5 shadow-sm shadow-black/5">
      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-xs font-semibold">{value}</span>
    </div>
  );
}

function HighlightStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-3.5 backdrop-blur-sm">
      <Icon className="mb-3 size-4 text-primary" />
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function InstallStepCard({
  number,
  title,
  description,
  icon: Icon,
  accent,
  children,
}: {
  number: string;
  title: string;
  description: string;
  icon: typeof Monitor;
  accent: string;
  children: ReactNode;
}) {
  return (
    <Card className="gap-0 overflow-hidden border-border/70 bg-card/95 py-0 shadow-xl shadow-black/5 animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
      <CardHeader className="gap-3 border-b border-border/70 px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`flex size-12 shrink-0 items-center justify-center rounded-2xl border text-sm font-bold shadow-lg ${accent}`}
            >
              {number}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="max-w-xl text-sm leading-5.5">
                {description}
              </CardDescription>
            </div>
          </div>
          <div className="rounded-full border border-border/70 bg-background/80 p-2.5 text-muted-foreground">
            <Icon className="size-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 py-3.5 sm:px-5">{children}</CardContent>
    </Card>
  );
}

function PreviewLane({
  title,
  subtitle,
  active = false,
}: {
  title: string;
  subtitle: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 transition-all ${
        active
          ? "border-primary/25 bg-primary/[0.08] shadow-lg shadow-primary/10"
          : "border-border/70 bg-background/60"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div
          className={`size-2.5 rounded-full ${
            active ? "bg-emerald-400" : "bg-muted-foreground/30"
          }`}
        />
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export default function InstallPage() {
  return (
    <div className="mx-auto flex w-full flex-col gap-6 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.08] px-5 py-6 shadow-2xl shadow-black/10 sm:px-7 sm:py-8 dark:from-card dark:via-card dark:to-primary/[0.06] lg:px-8 lg:py-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
        <div className="pointer-events-none absolute inset-0">
          <Meteors number={24} className="opacity-35" />
        </div>
        <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl dark:bg-primary/10" />
        <div className="pointer-events-none absolute bottom-0 left-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl dark:bg-primary/8" />
        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge className="rounded-full bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-foreground backdrop-blur-sm">
                Desktop Shell
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-border/70 bg-background/60 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-foreground"
              >
                Raspberry Pi
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-border/70 bg-background/60 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-foreground"
              >
                Node 20+
              </Badge>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[3.45rem] lg:leading-[1.02]">
                Install PROMETEO on Raspberry Pi in minutes.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                A visual, guided install flow for mixed users. Copy the right
                command, verify it is ready, and launch the app with autostart,
                updates, and setup already built in.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full shadow-lg shadow-black/20"
              >
                <a href="#install-steps">
                  Start installation
                  <ArrowRight className="size-4" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full border-border/70 bg-background/60 text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <a href="#requirements">Check requirements</a>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <HighlightStat icon={Clock3} label="Setup time" value="~3 minutes" />
              <HighlightStat
                icon={ShieldCheck}
                label="Best path"
                value="Use nvm first"
              />
              <HighlightStat icon={Zap} label="After launch" value="Autostart ready" />
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border/70 bg-background/65 p-4 shadow-2xl shadow-black/10 backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Install flow
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  Premium shell, simple setup
                </p>
              </div>
              <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground">
                npm global package
              </div>
            </div>

            <div className="space-y-3">
              <PreviewLane
                title="01  Install package"
                subtitle="Recommended path first, fallback command still visible."
                active
              />
              <PreviewLane
                title="02  Verify command"
                subtitle="Confirm the shell is in PATH before launching."
              />
              <PreviewLane
                title="03  Launch PROMETEO"
                subtitle="Enable autostart once and the shell takes care of the rest."
              />
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl border border-border/70 bg-muted/35 p-3.5 sm:grid-cols-3">
              {[
                { icon: Package, label: "npm install" },
                { icon: Monitor, label: "Desktop shell" },
                { icon: Rocket, label: "Launch ready" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-xl bg-background/80 px-3 py-1.5 text-xs text-foreground"
                >
                  <Icon className="size-3.5" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="requirements"
        className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr] animate-in fade-in-0 slide-in-from-bottom-3 duration-700 delay-100"
      >
        <Card className="gap-0 border-border/70 bg-card/95 py-0 shadow-lg shadow-black/5">
          <CardHeader className="space-y-2 px-4 py-3.5 sm:px-5">
            <SectionLabel>Before You Start</SectionLabel>
            <div className="space-y-2">
              <CardTitle className="text-xl">Make sure your Pi is ready.</CardTitle>
              <CardDescription className="max-w-2xl leading-6">
                PROMETEO installs as a global npm package. If you use{" "}
                <Mono>nvm</Mono>, you avoid most permission issues and get the
                smoothest setup path.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-3.5 sm:px-5">
            <div className="flex flex-wrap gap-2">
              <RequirementPill label="Node.js" value=">= 20 LTS" />
              <RequirementPill label="npm" value=">= 9" />
              <RequirementPill label="Platform" value="Raspberry Pi OS" />
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Run <Mono>node --version</Mono> if you want to double-check your
              environment. Need Node first? Use{" "}
              <a
                href="https://github.com/nvm-sh/nvm"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline underline-offset-4 hover:text-foreground"
              >
                nvm
              </a>{" "}
              so global installs stay clean and predictable.
            </p>
          </CardContent>
        </Card>

        <Card className="gap-0 border-primary/15 bg-primary/[0.05] py-0 shadow-lg shadow-primary/5">
          <CardHeader className="space-y-2 px-4 pt-3.5 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <SectionLabel>Recommended Path</SectionLabel>
              <Badge className="rounded-full bg-primary px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-primary-foreground">
                Best for most users
              </Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl">Use nvm whenever possible.</CardTitle>
              <CardDescription className="leading-6">
                Keep the install simple, avoid <Mono>sudo</Mono>, and make later
                package updates easier to manage.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-3.5 sm:px-5">
            <div className="grid gap-2.5 sm:grid-cols-3">
              {[
                "No permission errors",
                "Cleaner global package setup",
                "Safer for mixed users",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-primary/10 bg-background/80 px-3.5 py-2.5 text-sm text-foreground shadow-sm shadow-primary/5"
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-primary/15 bg-background/75 px-3.5 py-3 text-sm leading-6 text-muted-foreground">
              If your Pi is using the stock Node install and not <Mono>nvm</Mono>,
              the fallback <Mono>sudo</Mono> command is still available in Step 1
              below.
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="install-steps" className="space-y-3">
        <div className="space-y-2 animate-in fade-in-0 duration-700 delay-150">
          <SectionLabel>Installation</SectionLabel>
          <h2 className="text-2xl font-semibold tracking-tight">
            Follow the flow and launch PROMETEO with confidence.
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            The recommended path is highlighted first. Advanced users still have
            the fallback command available when needed.
          </p>
        </div>

        <div className="grid gap-3">
          <InstallStepCard
            number="01"
            title="Install the package"
            description="Start with the safest path for most Raspberry Pi setups, then use the fallback only if your environment requires it."
            icon={Package}
            accent="border-primary/25 bg-primary/[0.09] text-primary shadow-primary/10"
          >
            <CodeBlock code={CODE.installNvm} label="Recommended with nvm" tone="featured" />
            <CodeBlock
              code={CODE.installSudo}
              label="Fallback without nvm"
            />
            <p className="text-sm leading-6 text-muted-foreground">
              Stock Raspberry Pi OS usually needs <Mono>sudo</Mono> for global
              installs unless you manage Node with <Mono>nvm</Mono>.
            </p>
          </InstallStepCard>

          <InstallStepCard
            number="02"
            title="Verify the install"
            description="Confirm that the PROMETEO shell is installed globally and available in your PATH before you try to launch it."
            icon={TerminalSquare}
            accent="border-sky-500/20 bg-sky-500/10 text-sky-700 shadow-sky-500/10 dark:text-sky-300"
          >
            <CodeBlock code={CODE.verify} label="Verification command" tone="featured" />
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-muted/35 px-3.5 py-3">
                <p className="text-sm font-semibold">What success looks like</p>
                <p className="mt-1.5 text-sm leading-5.5 text-muted-foreground">
                  You should see <Mono>@prometeo-dashboard/desktop-shell</Mono>{" "}
                  listed in the result.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/35 px-3.5 py-3">
                <p className="text-sm font-semibold">If it is missing</p>
                <p className="mt-1.5 text-sm leading-5.5 text-muted-foreground">
                  Re-run Step 1 with the command that matches your Node setup,
                  then verify again.
                </p>
              </div>
            </div>
          </InstallStepCard>

          <InstallStepCard
            number="03"
            title="Launch PROMETEO"
            description="Open the shell, confirm the first-run prompt, and let the app handle the rest of the setup from there."
            icon={Rocket}
            accent="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 shadow-emerald-500/10 dark:text-emerald-300"
          >
            <CodeBlock code={CODE.run} label="Launch command" tone="featured" />
            <Card className="gap-0 border-primary/15 bg-primary/[0.05] py-0 shadow-lg shadow-primary/5">
              <CardHeader className="gap-2.5 px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <CardTitle className="text-base">What happens on first launch</CardTitle>
                </div>
                <CardDescription className="leading-6">
                  PROMETEO walks you through the final part once the shell opens.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2.5 px-4 pb-3.5 sm:grid-cols-3">
                {[
                  "Choose Enable when asked about autostart.",
                  "Updates and shell behavior are handled automatically.",
                  "You can change autostart later from the app menu.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-primary/12 bg-background/85 px-3.5 py-3 text-sm leading-5.5 text-muted-foreground"
                  >
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>
          </InstallStepCard>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr] animate-in fade-in-0 slide-in-from-bottom-3 duration-700 delay-300">
        <Card className="gap-0 border-amber-500/25 bg-amber-500/[0.05] py-0 shadow-lg shadow-amber-500/5">
          <CardHeader className="gap-2.5 px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              <CardTitle className="text-lg">Troubleshooting</CardTitle>
            </div>
            <CardDescription className="leading-6">
              A couple of quick checks usually solve the most common install issues.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2.5 px-4 pb-3.5 sm:px-5">
            <div className="rounded-2xl border border-amber-500/15 bg-background/85 px-3.5 py-3 text-sm leading-5.5 text-muted-foreground">
              Permission errors usually mean the machine is not using{" "}
              <Mono>nvm</Mono>. If possible, switch to the recommended path and
              reinstall without <Mono>sudo</Mono>.
            </div>
            <div className="rounded-2xl border border-amber-500/15 bg-background/85 px-3.5 py-3 text-sm leading-5.5 text-muted-foreground">
              If <Mono>prometeo</Mono> is not found, check where it was installed
              with <Mono>which prometeo</Mono> and confirm your PATH is correct.
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3">
          <Card className="gap-0 border-border/70 bg-card/95 py-0 shadow-lg shadow-black/5">
            <CardHeader className="gap-2.5 px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2">
                <Trash2 className="size-4 text-muted-foreground" />
                <CardTitle className="text-lg">Uninstall</CardTitle>
              </div>
              <CardDescription className="leading-6">
                Remove the desktop shell if you need to reset or clean up the system.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-3.5 sm:px-5">
              <CodeBlock code={CODE.uninstall} label="Removal command" />
            </CardContent>
          </Card>

          <Card className="gap-0 border-border/70 bg-muted/20 py-0 shadow-lg shadow-black/5">
            <CardHeader className="gap-2.5 px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <CardTitle className="text-lg">Why this flow works</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2.5 px-4 pb-3.5 sm:px-5">
              {[
                "Mixed users get a clear recommended path first.",
                "Every command is easy to copy and verify.",
                "First-launch behavior is explained before surprises happen.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border/70 bg-background/80 px-3.5 py-2.5 text-sm text-foreground"
                >
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
