import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, MailCheck, XCircle } from "lucide-react";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authService, getAuthErrorMessage } from "@/services/auth";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Verifying your email...");
  const token = searchParams.get("token") || "";

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!token) {
        setStatus("error");
        setMessage("Verification token is missing.");
        return;
      }

      try {
        await authService.verifyEmail(token);
        if (cancelled) return;
        setStatus("success");
        setMessage("Your email has been verified.");
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setMessage(getAuthErrorMessage(error, "Could not verify this email."));
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthShell
      title={status === "success" ? "Email verified" : "Email verification"}
      description={message}
      eyebrow="Account activation"
      icon={status === "error" ? XCircle : status === "success" ? CheckCircle2 : MailCheck}
      maxWidth="sm"
    >
      <div className="flex items-center gap-3 rounded-md border border-white/10 bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        {status === "loading" ? (
          <Spinner className="size-5" />
        ) : status === "success" ? (
          <CheckCircle2 className="size-5 text-emerald-600" />
        ) : (
          <XCircle className="size-5 text-red-600" />
        )}
        <span>
          {status === "loading"
            ? "Checking token"
            : status === "success"
              ? "Account ready"
              : "Verification failed"}
        </span>
      </div>
      <Button asChild className="w-full">
        <Link to="/login">Go to login</Link>
      </Button>
    </AuthShell>
  );
}
