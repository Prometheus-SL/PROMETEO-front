import { useState, type FormEvent } from "react";
import { CheckCircle2, Mail } from "lucide-react";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authService, getAuthErrorMessage } from "@/services/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emailError = !email.trim()
    ? "Enter your email."
    : !EMAIL_PATTERN.test(email.trim())
      ? "Enter a valid email address."
      : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttemptedSubmit(true);
    setError(null);
    setMessage(null);

    if (emailError) {
      return;
    }

    setLoading(true);
    try {
      await authService.requestPasswordReset(email.trim().toLowerCase());
      setMessage("If that email exists, a reset link has been sent.");
    } catch (nextError) {
      setError(
        getAuthErrorMessage(nextError, "Could not request a reset link."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Recover password"
      description="We will send you a reset link."
      eyebrow="Account recovery"
      icon={Mail}
      backLink={{ to: "/login", label: "Back to login" }}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} noValidate>
        <FieldSet>
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel htmlFor="forgot-password-email">Email</FieldLabel>
              <Input
                id="forgot-password-email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                inputMode="email"
                value={email}
                aria-invalid={attemptedSubmit && Boolean(emailError)}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(null);
                  setMessage(null);
                }}
              />
              {attemptedSubmit && <FieldError>{emailError}</FieldError>}
            </Field>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Spinner />
                  Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
          </FieldGroup>
        </FieldSet>
      </form>

      {message && (
        <div className="flex gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-600"
        >
          {error}
        </div>
      )}
    </AuthShell>
  );
}
