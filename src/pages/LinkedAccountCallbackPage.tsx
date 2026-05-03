import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";

import { AuthShell } from "@/components/auth/AuthShell";
import { Spinner } from "@/components/ui/spinner";

function normalizeProviderName(provider: string) {
  if (provider === "spotify") return "Spotify";
  if (provider === "discord") return "Discord";
  if (provider === "google") return "Google";
  if (provider === "github") return "GitHub";
  if (provider === "steam") return "Steam";
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
    <AuthShell
      title={
        isSuccess
          ? `${payload.providerLabel} linked`
          : `${payload.providerLabel} link failed`
      }
      description={
        isSuccess
          ? closing
            ? "Closing..."
            : "Account linked successfully"
          : payload.error ||
            "Something went wrong. Please close this window and try again."
      }
      eyebrow="Linked account"
      icon={isSuccess ? CheckCircle2 : XCircle}
      maxWidth="sm"
      showShowcase={false}
    >
      {isSuccess ? (
        <div className="flex items-center gap-2 rounded-md border border-white/10 bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <Spinner className="size-3.5" />
          Returning to account
        </div>
      ) : null}
    </AuthShell>
  );
}
