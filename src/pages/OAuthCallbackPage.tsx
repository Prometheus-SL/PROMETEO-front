import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";

import { AuthShell } from "@/components/auth/AuthShell";
import { Spinner } from "@/components/ui/spinner";
import { useAuthContext } from "@/providers/AuthProvider";
import { authService, type Tokens } from "@/services/auth";

export type OAuthCallbackPayload = {
  status: "success" | "error";
  error: string;
  accessToken: string;
  refreshToken: string;
  sessionId: string;
};

const OAUTH_LOGIN_CHANNEL = "prometeo-oauth-login";
const OAUTH_ACK_WAIT_MS = 350;

export function readOAuthCallbackPayload(
  search = window.location.search,
  hash = window.location.hash,
): OAuthCallbackPayload {
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(fragment || search);

  return {
    status: params.get("status") === "success" ? "success" : "error",
    error: params.get("error") || "",
    accessToken: params.get("accessToken") || "",
    refreshToken: params.get("refreshToken") || "",
    sessionId: params.get("sessionId") || "",
  };
}

function isSuccessfulOAuthPayload(payload: OAuthCallbackPayload) {
  return (
    payload.status === "success" &&
    Boolean(payload.accessToken) &&
    Boolean(payload.refreshToken)
  );
}

export function shouldCompleteOAuthLocally(
  payload: OAuthCallbackPayload,
  loginPageAcknowledged: boolean,
) {
  return !loginPageAcknowledged && isSuccessfulOAuthPayload(payload);
}

function createCallbackId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { loginQR } = useAuthContext();
  const [closing, setClosing] = useState(false);
  const [localError, setLocalError] = useState("");

  const payload = useMemo(() => readOAuthCallbackPayload(), []);
  const callbackSucceeded = isSuccessfulOAuthPayload(payload);

  useEffect(() => {
    let cancelled = false;
    let loginPageAcknowledged = false;
    let closingTimer = 0;
    let closeTimer = 0;
    let localFallbackTimer = 0;
    window.history.replaceState({}, "", window.location.pathname);

    const callbackId = createCallbackId();
    const tokens: Tokens = {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      sessionId: payload.sessionId || undefined,
    };

    const channel = new BroadcastChannel(OAUTH_LOGIN_CHANNEL);

    const closeCallbackWindow = () => {
      if (cancelled) return;

      closingTimer = window.setTimeout(() => setClosing(true), 800);
      closeTimer = window.setTimeout(() => {
        window.close();
        navigate(callbackSucceeded ? "/" : "/login", {
          replace: true,
        });
      }, 1500);
    };

    const completeLocally = () => {
      void (async () => {
        try {
          const { user } = await authService.getMe(tokens.accessToken);
          if (cancelled) return;
          await loginQR(tokens, user);
          if (!cancelled) navigate("/", { replace: true });
        } catch {
          if (!cancelled) {
            setLocalError("Could not complete sign in. Try again.");
          }
        }
      })();
    };

    channel.onmessage = (event: MessageEvent) => {
      if (
        event.data?.type === "oauth-login-ack" &&
        event.data?.callbackId === callbackId
      ) {
        loginPageAcknowledged = true;
        window.clearTimeout(localFallbackTimer);
        closeCallbackWindow();
      }
    };

    if (callbackSucceeded) {
      channel.postMessage({
        type: "oauth-login-callback",
        callbackId,
        status: "success",
        tokens,
      });

      localFallbackTimer = window.setTimeout(() => {
        if (shouldCompleteOAuthLocally(payload, loginPageAcknowledged)) {
          completeLocally();
        }
      }, OAUTH_ACK_WAIT_MS);
    } else {
      channel.postMessage({
        type: "oauth-login-callback",
        callbackId,
        status: "error",
        error: payload.error || "OAuth sign in failed.",
      });
      closeCallbackWindow();
    }

    return () => {
      cancelled = true;
      channel.close();
      window.clearTimeout(localFallbackTimer);
      window.clearTimeout(closingTimer);
      window.clearTimeout(closeTimer);
    };
  }, [callbackSucceeded, loginQR, navigate, payload]);

  const isSuccess = callbackSucceeded && !localError;

  return (
    <AuthShell
      title={isSuccess ? "Signed in" : "Sign in failed"}
      description={
        isSuccess
          ? closing
            ? "Closing..."
            : "Returning to Prometeo..."
          : localError ||
            payload.error ||
            "Something went wrong. Please close this window and try again."
      }
      eyebrow="OAuth callback"
      icon={isSuccess ? CheckCircle2 : XCircle}
      maxWidth="sm"
      showShowcase={false}
    >
      {isSuccess ? (
        <div className="flex items-center gap-2 rounded-md border border-white/10 bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <Spinner className="size-3.5" />
          Completing session
        </div>
      ) : null}
    </AuthShell>
  );
}
