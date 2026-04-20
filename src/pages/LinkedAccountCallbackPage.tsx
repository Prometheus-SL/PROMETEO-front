import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import Background from "@/components/common/background";

function normalizeProviderName(provider: string) {
  if (provider === "spotify") return "Spotify";
  if (provider === "discord") return "Discord";
  if (provider === "google") return "Google";
  if (provider === "github") return "GitHub";
  if (!provider) return "Account";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export default function LinkedAccountCallbackPage() {
  const navigate = useNavigate();
  const [closing, setClosing] = useState(false);

  const payload = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const provider = String(searchParams.get("provider") || "");
    const status =
      searchParams.get("status") === "success" ? "success" : "error";
    const error = searchParams.get("error") || "";

    return {
      provider,
      providerLabel: normalizeProviderName(provider),
      status,
      error,
    };
  }, []);

  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage(
        {
          type: "linked_account_callback",
          provider: payload.provider,
          status: payload.status,
          error: payload.error,
        },
        window.location.origin,
      );
    }

    const closingTimer = window.setTimeout(() => setClosing(true), 800);
    const closeTimer = window.setTimeout(() => {
      window.close();
      navigate("/account");
    }, 1800);

    return () => {
      window.clearTimeout(closingTimer);
      window.clearTimeout(closeTimer);
    };
  }, [navigate, payload.error, payload.provider, payload.status]);

  const isSuccess = payload.status === "success";

  return (
    <Background>
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Logo */}
          <img
            src="/logo.svg"
            alt="Prometeo"
            className="h-8 opacity-60 dark:invert"
          />

          {/* Icon */}
          <div
            className={`flex size-16 items-center justify-center rounded-full ${
              isSuccess
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            } transition-all duration-500`}
          >
            {isSuccess ? (
              <CheckCircle2 className="size-8" />
            ) : (
              <XCircle className="size-8" />
            )}
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h1 className="text-lg font-semibold text-foreground">
              {isSuccess
                ? `${payload.providerLabel} linked`
                : `${payload.providerLabel} link failed`}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSuccess
                ? closing
                  ? "Closing…"
                  : "Account linked successfully"
                : payload.error ||
                  "Something went wrong. Please close this window and try again."}
            </p>
          </div>

          {/* Progress indicator */}
          {isSuccess && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Spinner className="size-3.5" />
            </div>
          )}
        </div>
      </main>
    </Background>
  );
}
