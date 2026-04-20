import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";

import Background from "@/components/common/background";
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
    <Background>
      <div className="flex min-h-screen w-screen items-center justify-center px-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-md border bg-background px-6 py-8 text-center shadow-md">
          {status === "loading" ? (
            <Spinner className="size-8" />
          ) : status === "success" ? (
            <CheckCircle2 className="size-10 text-emerald-600" />
          ) : (
            <XCircle className="size-10 text-red-600" />
          )}
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">
              {status === "success" ? "Email verified" : "Email verification"}
            </h1>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          <Button asChild className="w-full">
            <Link to="/login">Go to login</Link>
          </Button>
        </div>
      </div>
    </Background>
  );
}
