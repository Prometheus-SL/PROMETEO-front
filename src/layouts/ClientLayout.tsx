import { Outlet } from "react-router-dom";
import { useIdle } from "@uidotdev/usehooks";
import { QrCode, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";

import QRLogin from "@/components/auth/QRLogin";
import { BorderBeam } from "@/components/ui/border-beam";
import { ClientNavbar } from "@/components/navbar/client-navbar";
import { GridPattern } from "@/components/ui/grid-pattern";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { useAuthContext } from "@/providers/AuthProvider";
import { SharedContextProvider } from "@/providers/SharedContextProvider";
import LockLayout from "./LockLayout";

export default function ClientLayout() {
  const { accessToken } = useAuthContext();
  const isIdle = useIdle(5 * 60 * 1000); // 5 minutes

  return (
    <SharedContextProvider>
      {accessToken ? (
        <>
          {isIdle && <LockLayout />}
          <div className="flex h-screen w-full flex-col bg-background">
            <ClientNavbar />
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <Outlet />
            </main>
            <Toaster />
          </div>
        </>
      ) : (
        <>
          <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-950">
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 15% 20%, rgba(34, 211, 238, 0.22), transparent 30%), radial-gradient(circle at 85% 15%, rgba(251, 191, 36, 0.16), transparent 24%), radial-gradient(circle at 50% 100%, rgba(59, 130, 246, 0.18), transparent 35%), linear-gradient(180deg, #020617 0%, #020617 100%)",
              }}
            />
            <GridPattern className="fill-white/5 stroke-white/10 [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]" />
            <div className="absolute left-6 top-6 flex items-center gap-3 text-white/80">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur">
                <img
                  src="/logo.svg"
                  alt="Prometeo"
                  className="h-6 w-auto invert"
                />
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-100/70">
                  Prometeo Client
                </p>
                <p className="text-sm text-white/70">
                  Secure dashboard linking
                </p>
              </div>
            </div>
          </div>
          <Dialog open>
            <DialogContent
              showCloseButton={false}
              className="overflow-hidden border-white/10 bg-slate-950/95 p-0 text-white shadow-[0_40px_120px_rgba(2,6,23,0.7)] sm:max-w-4xl"
            >
              <BorderBeam
                size={220}
                duration={9}
                borderWidth={1.5}
                colorFrom="#67e8f9"
                colorTo="#fbbf24"
              />
              <div className="grid md:grid-cols-[1.05fr_0.95fr]">
                <div className="relative hidden overflow-hidden border-r border-white/10 md:flex md:flex-col md:justify-between">
                  <div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(circle at top left, rgba(125, 211, 252, 0.16), transparent 32%), radial-gradient(circle at bottom right, rgba(251, 191, 36, 0.12), transparent 30%)",
                    }}
                  />
                  <div className="relative space-y-8 p-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100">
                      <ShieldCheck className="h-4 w-4" />
                      QR-only access
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs uppercase tracking-[0.35em] text-cyan-100/70">
                        Dashboard Client
                      </p>
                      <h2 className="max-w-sm text-4xl font-semibold leading-tight text-white">
                        Scan and open the panel in seconds
                      </h2>
                      <p className="max-w-md text-sm leading-relaxed text-slate-300">
                        This screen is designed for kiosk or fixed-client use.
                        Access is completed from an authorized mobile device,
                        without leaving a username or password on the main
                        screen.
                      </p>
                    </div>
                  </div>
                  <div className="relative grid gap-3 p-8 pt-0">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                        <QrCode className="h-4 w-4 text-cyan-300" />
                        Instant scan
                      </div>
                      <p className="text-sm text-slate-300">
                        Show the code on this screen and scan it from the mobile
                        device that already has permission.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                        <Smartphone className="h-4 w-4 text-cyan-300" />
                        Remote confirmation
                      </div>
                      <p className="text-sm text-slate-300">
                        Authentication finishes outside the client, which is
                        ideal for shared screens or Raspberry-based setups.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                        <RefreshCw className="h-4 w-4 text-cyan-300" />
                        Automatic reload
                      </div>
                      <p className="text-sm text-slate-300">
                        As soon as the session is authorized, the dashboard will
                        refresh and enter automatically.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative p-6 sm:p-8">
                  <DialogHeader className="mb-6 space-y-3 text-left">
                    <DialogTitle className="text-2xl font-semibold text-white sm:text-3xl">
                      Sign in to open the client
                    </DialogTitle>
                    <DialogDescription className="max-w-lg text-sm leading-relaxed text-slate-300">
                      This URL only supports QR access. Scan it from your mobile
                      device and, once authentication finishes, the page will
                      reload automatically.
                    </DialogDescription>
                  </DialogHeader>
                  <QRLogin
                    className="max-w-none"
                    hideBackButton
                    showHeader={false}
                    onAuthenticated={() => window.location.reload()}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Toaster />
        </>
      )}
    </SharedContextProvider>
  );
}
