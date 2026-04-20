import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { KeyRound } from "lucide-react";

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

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const token = searchParams.get("token") || "";

  const passwordError =
    password.length >= 12 ? null : "Password must be at least 12 characters.";
  const confirmError =
    confirmPassword === password ? null : "Passwords do not match.";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setError(null);
    setMessage(null);

    if (!token) {
      setError("Reset token is missing.");
      return;
    }
    if (passwordError || confirmError) {
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setMessage("Password reset successfully. You can sign in again.");
      setPassword("");
      setConfirmPassword("");
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError, "Could not reset password."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Reset password"
      description="Choose a new password."
      eyebrow="Credential update"
      icon={KeyRound}
      backLink={{ to: "/login", label: "Back to login" }}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} noValidate>
        <FieldSet>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="reset-password">New password</FieldLabel>
              <Input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={submitted && Boolean(passwordError)}
              />
              {submitted && <FieldError>{passwordError}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="reset-password-confirm">
                Confirm password
              </FieldLabel>
              <Input
                id="reset-password-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                aria-invalid={submitted && Boolean(confirmError)}
              />
              {submitted && <FieldError>{confirmError}</FieldError>}
            </Field>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : (
                "Save new password"
              )}
            </Button>
          </FieldGroup>
        </FieldSet>
      </form>

      {message && (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700">
          {message}
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
