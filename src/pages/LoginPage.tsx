import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EyeClosedIcon, EyeIcon, KeyRound, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/providers/AuthProvider";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import QRLogin from "@/components/auth/QRLogin";
import OAuthButtons from "@/components/auth/OAuthButtons";
import { AuthShell } from "@/components/auth/AuthShell";

function getLoginErrors(
  identifier: string,
  password: string,
  twoFactorRequired = false,
  twoFactorToken = "",
) {
  return {
    identifier: identifier.trim() ? null : "Enter your email or username.",
    password: password ? null : "Enter your password.",
    twoFactorToken:
      twoFactorRequired && !twoFactorToken.trim()
        ? "Enter your authentication or recovery code."
        : null,
  };
}

export default function LoginPage() {
  const { login, loading, error, accessToken, clearError, twoFactorRequired } =
    useAuthContext();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showQRLogin, setShowQRLogin] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const navigate = useNavigate();

  const validationErrors = getLoginErrors(
    identifier,
    password,
    Boolean(twoFactorRequired),
    twoFactorToken,
  );

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (accessToken) {
      navigate("/", { replace: true });
    }
  }, [accessToken, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setAttemptedSubmit(true);

    const trimmedIdentifier = identifier.trim();
    const nextErrors = getLoginErrors(
      trimmedIdentifier,
      password,
      Boolean(twoFactorRequired),
      twoFactorToken,
    );

    if (
      nextErrors.identifier ||
      nextErrors.password ||
      nextErrors.twoFactorToken
    ) {
      return;
    }

    await login(
      trimmedIdentifier,
      password,
      twoFactorRequired ? twoFactorToken.trim() : undefined,
    );
  };

  return (
    <AuthShell
      title={showQRLogin ? "Sign in with QR" : "Welcome back"}
      description={
        showQRLogin
          ? "Scan the code from another device."
          : "Sign in to continue."
      }
      eyebrow={showQRLogin ? "Mobile handoff" : "Secure access"}
      icon={showQRLogin ? QrCode : KeyRound}
      maxWidth="sm"
      footer={
        !showQRLogin ? (
          <>
            <p>Don't have an account?</p>
            <Link
              to="/register"
              className="text-primary font-medium hover:underline"
            >
              Sign up
            </Link>
          </>
        ) : null
      }
    >
      {!showQRLogin ? (
        <div className="w-full space-y-5">
          <form onSubmit={handleSubmit} noValidate>
            <FieldSet>
              <FieldGroup className="gap-5">
                <Field>
                  <FieldLabel htmlFor="login-identifier">
                    Email or username
                  </FieldLabel>
                  <Input
                    id="login-identifier"
                    type="text"
                    placeholder="name@example.com"
                    className="text-sm"
                    value={identifier}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoFocus
                    aria-invalid={
                      attemptedSubmit && Boolean(validationErrors.identifier)
                    }
                    onChange={(e) => {
                      if (error) {
                        clearError();
                      }
                      setIdentifier(e.target.value);
                    }}
                  />
                  {attemptedSubmit && (
                    <FieldError>{validationErrors.identifier}</FieldError>
                  )}
                </Field>

                <Field>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel htmlFor="login-password">Password</FieldLabel>
                    <Button
                      asChild
                      variant="link"
                      size="sm"
                      className="h-auto px-0 text-xs"
                    >
                      <Link to="/forgot-password">Forgot password?</Link>
                    </Button>
                  </div>

                  <InputGroup>
                    <InputGroupInput
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      className="text-sm"
                      value={password}
                      autoComplete="current-password"
                      aria-invalid={
                        attemptedSubmit && Boolean(validationErrors.password)
                      }
                      onChange={(e) => {
                        if (error) {
                          clearError();
                        }
                        setPassword(e.target.value);
                      }}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        onClick={() => setShowPassword(!showPassword)}
                        size="icon-xs"
                        type="button"
                      >
                        {showPassword ? (
                          <EyeIcon className="h-4 w-4" />
                        ) : (
                          <EyeClosedIcon className="h-4 w-4" />
                        )}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  {attemptedSubmit && (
                    <FieldError>{validationErrors.password}</FieldError>
                  )}
                </Field>

                {twoFactorRequired && (
                  <Field>
                    <FieldLabel htmlFor="login-two-factor">
                      Authentication code
                    </FieldLabel>
                    <Input
                      id="login-two-factor"
                      type="text"
                      inputMode="text"
                      placeholder="000000 or recovery code"
                      className="text-center font-mono text-sm tracking-widest"
                      value={twoFactorToken}
                      autoComplete="one-time-code"
                      aria-invalid={
                        attemptedSubmit &&
                        Boolean(validationErrors.twoFactorToken)
                      }
                      onChange={(e) => {
                        if (error) {
                          clearError();
                        }
                        setTwoFactorToken(
                          e.target.value.replace(/\s+/g, "").slice(0, 16),
                        );
                      }}
                    />
                    {attemptedSubmit && (
                      <FieldError>
                        {validationErrors.twoFactorToken}
                      </FieldError>
                    )}
                  </Field>
                )}

                <Button type="submit" className="h-10 w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner />
                      {twoFactorRequired ? "Verifying..." : "Signing in..."}
                    </>
                  ) : twoFactorRequired ? (
                    "Verify code"
                  ) : (
                    "Login"
                  )}
                </Button>

                {error && (
                  <div
                    role="alert"
                    className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-600"
                  >
                    {error}
                  </div>
                )}
              </FieldGroup>
            </FieldSet>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <OAuthButtons />

          <Button
            onClick={() => {
              clearError();
              setShowQRLogin(true);
            }}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <QrCode className="mr-2 h-4 w-4" />
            Sign in with QR code
          </Button>
        </div>
      ) : (
        <QRLogin
          onBack={() => {
            clearError();
            setShowQRLogin(false);
          }}
          showHeader={false}
          className="max-w-none"
        />
      )}
    </AuthShell>
  );
}
