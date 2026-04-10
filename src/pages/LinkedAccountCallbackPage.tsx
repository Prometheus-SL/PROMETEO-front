import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Link2, XCircle } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function normalizeProviderName(provider: string) {
  if (provider === "spotify") return "Spotify";
  if (!provider) return "Linked account";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export default function LinkedAccountCallbackPage() {
  const navigate = useNavigate();

  const payload = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const provider = String(searchParams.get("provider") || "");
    const status = searchParams.get("status") === "success" ? "success" : "error";
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
        window.location.origin
      );
    }

    const timeoutId = window.setTimeout(() => {
      window.close();
      navigate("/account");
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [navigate, payload.error, payload.provider, payload.status]);

  const title =
    payload.status === "success"
      ? `${payload.providerLabel} linked`
      : `${payload.providerLabel} link failed`;

  const description =
    payload.status === "success"
      ? "The account is now attached to your Prometeo user."
      : "We could not finish the linked account flow.";

  const message =
    payload.status === "success"
      ? "You can close this window. Prometeo will refresh the account settings automatically."
      : payload.error || "Please go back to Account and try again.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {payload.status === "success" ? (
              <CheckCircle2 className="size-5 text-emerald-500" />
            ) : payload.error ? (
              <XCircle className="size-5 text-destructive" />
            ) : (
              <Spinner className="size-5" />
            )}
            <span className="inline-flex items-center gap-2">
              <Link2 className="size-4" />
              {title}
            </span>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}
