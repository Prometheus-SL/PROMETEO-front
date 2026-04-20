import { type ComponentType, type SVGProps, useEffect, useState } from "react";
import QRCodeModule from "react-qr-code";
import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { authService } from "@/services/auth";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
} from "@/services/auth-storage";

type QRCodeProps = SVGProps<SVGSVGElement> & {
  value: string;
  size?: number;
  level?: "L" | "M" | "Q" | "H";
  bgColor?: string;
  fgColor?: string;
  title?: string;
};

// `react-qr-code` ships as CJS in Vite, so its component can be nested.
const QRCode =
  (
    QRCodeModule as unknown as {
      QRCode?: ComponentType<QRCodeProps>;
      default?: ComponentType<QRCodeProps>;
    }
  ).QRCode ??
  (
    QRCodeModule as unknown as {
      default?: ComponentType<QRCodeProps>;
    }
  ).default ??
  (QRCodeModule as unknown as ComponentType<QRCodeProps>);

interface QRLoginProps {
  onBack?: () => void;
  onAuthenticated?: () => void;
  redirectTo?: string;
  hideBackButton?: boolean;
  showHeader?: boolean;
  className?: string;
}

type QRStatus = "pending" | "scanned" | "authenticated" | "expired";

export default function QRLogin({
  onBack,
  onAuthenticated,
  redirectTo = "/",
  hideBackButton = false,
  showHeader = true,
  className,
}: QRLoginProps) {
  const [qrData, setQrData] = useState<{
    code: string;
    expiresAt: string;
  } | null>(null);
  const [status, setStatus] = useState<QRStatus>("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const generateQR = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await authService.generateQRCode();
      setQrData(data);
      setStatus("pending");

      const expiresAt = new Date(data.expiresAt).getTime();
      const now = Date.now();
      setTimeLeft(Math.max(0, Math.floor((expiresAt - now) / 1000)));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not generate the QR code.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!qrData || status === "authenticated" || status === "expired") return;

    const checkStatus = async () => {
      try {
        const statusData = await authService.checkQRStatus(qrData.code);
        setStatus(statusData.status as QRStatus);

        if (
          statusData.status === "authenticated" &&
          statusData.tokens &&
          statusData.user
        ) {
          localStorage.setItem(ACCESS_TOKEN_KEY, statusData.tokens.accessToken);
          localStorage.setItem(
            REFRESH_TOKEN_KEY,
            statusData.tokens.refreshToken,
          );
          localStorage.setItem(USER_KEY, JSON.stringify(statusData.user));

          window.setTimeout(() => {
            if (onAuthenticated) {
              onAuthenticated();
              return;
            }

            window.location.href = redirectTo;
          }, 1000);
        }
      } catch (err) {
        console.error("Error checking QR status:", err);
      }
    };

    const interval = window.setInterval(checkStatus, 2000);
    return () => window.clearInterval(interval);
  }, [onAuthenticated, qrData, redirectTo, status]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setStatus("expired");
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        const next = previous - 1;
        if (next <= 0) {
          setStatus("expired");
        }
        return Math.max(0, next);
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    void generateQR();
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case "pending":
        return <Smartphone className="h-4 w-4 text-cyan-300" />;
      case "scanned":
        return <Clock3 className="h-4 w-4 text-amber-300" />;
      case "authenticated":
        return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
      case "expired":
        return <RefreshCw className="h-4 w-4 text-rose-300" />;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "pending":
        return "Waiting for scan";
      case "scanned":
        return "Pending on mobile";
      case "authenticated":
        return "Client authorized";
      case "expired":
        return "Code expired";
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case "pending":
        return "Scan this code from an authorized mobile device to link this screen.";
      case "scanned":
        return "Code detected. Finish the sign-in on the mobile device to complete the link.";
      case "authenticated":
        return "Session validated. Preparing the client...";
      case "expired":
        return "This code has expired. Generate a new one to try again.";
    }
  };

  const getStatusClasses = () => {
    switch (status) {
      case "pending":
        return "border-cyan-400/30 bg-cyan-400/10 text-cyan-100";
      case "scanned":
        return "border-amber-400/30 bg-amber-400/10 text-amber-100";
      case "authenticated":
        return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
      case "expired":
        return "border-rose-400/30 bg-rose-400/10 text-rose-100";
    }
  };

  return (
    <div className={cn("mx-auto w-full max-w-md space-y-5", className)}>
      {showHeader ? (
        <div className="space-y-3 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium tracking-wide text-cyan-100">
            <ShieldCheck className="h-4 w-4" />
            Secure QR access
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              Sign in from your phone
            </h2>
            <p className="text-sm text-muted-foreground">
              Scan the code, confirm the authentication on your device, and this
              client will link automatically.
            </p>
          </div>
        </div>
      ) : null}

      <Card className="relative overflow-hidden border-white/10 bg-white/5 py-0 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl">
        <BorderBeam
          size={180}
          duration={8}
          borderWidth={1.5}
          colorFrom="#67e8f9"
          colorTo="#fbbf24"
        />

        {loading ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <Spinner />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">
                Generating QR code
              </p>
              <p className="text-sm text-slate-300">
                Preparing a secure session for this client.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="space-y-5 px-6 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-rose-400/30 bg-rose-400/10">
              <RefreshCw className="h-5 w-5 text-rose-300" />
            </div>
            <div className="space-y-2">
              <p className="text-base font-medium text-white">
                Could not generate the code
              </p>
              <p className="text-sm text-rose-200">{error}</p>
            </div>
            <Button onClick={generateQR} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </div>
        ) : qrData ? (
          <div className="space-y-5 px-6 pt-6">
            <div className="flex items-start justify-between gap-4">
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
                  getStatusClasses(),
                )}
              >
                {getStatusIcon()}
                {getStatusLabel()}
              </div>

              {status !== "expired" && status !== "authenticated" ? (
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200">
                  {formatTime(timeLeft)}
                </div>
              ) : null}
            </div>

            <div className="grid gap-5">
              <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.18),_transparent_55%),rgba(255,255,255,0.04)] p-4 shadow-inner">
                <div className="mx-auto flex max-w-[280px] items-center justify-center rounded-[1.5rem] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.25)]">
                  <QRCode
                    size={220}
                    value={`https://prometeo.miguelprez.es/qr-login/${qrData.code}`}
                    level="M"
                  />
                </div>
              </div>

              <div
                className={cn(
                  "rounded-2xl border px-4 py-3 text-sm leading-relaxed",
                  getStatusClasses(),
                )}
              >
                {getStatusMessage()}
              </div>
            </div>

            <div className="flex items-center justify-center">
              {status === "expired" ? (
                <Button
                  onClick={generateQR}
                  variant="outline"
                  className="min-w-40 border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate a new QR
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>

      {!hideBackButton && onBack ? (
        <Button onClick={onBack} variant="ghost" className="w-full">
          Back to password sign-in
        </Button>
      ) : null}
    </div>
  );
}
