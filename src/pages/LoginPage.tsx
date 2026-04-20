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
import Background from "@/components/common/background";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { BorderBeam } from "@/components/ui/border-beam";
import QRLogin from "@/components/auth/QRLogin";

function getLoginErrors(identifier: string, password: string, twoFactorRequired = false, twoFactorToken = "") {
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
  const {
    login,
    loading,
    error,
    accessToken,
    clearError,
    twoFactorRequired,
  } = useAuthContext();
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

    if (nextErrors.identifier || nextErrors.password || nextErrors.twoFactorToken) {
      return;
    }

    await login(
      trimmedIdentifier,
      password,
      twoFactorRequired ? twoFactorToken.trim() : undefined,
    );
  };

  const logo = {
    url: "/",
    src: "/logo.svg",
    alt: "Prometeo Logo",
    title: "Prometeo",
  };

  return (
    <Background>
      <main className="flex min-h-screen w-screen items-center justify-center px-4 py-8">
        <div className="flex w-full max-w-md flex-col items-center gap-5">
          <a href={logo.url} className="rounded-md p-2">
            <img
              src={logo.src}
              alt={logo.alt}
              title={logo.title}
              className="h-10 dark:invert"
            />
          </a>

          <section className="relative flex w-full flex-col gap-6 rounded-md border border-white/10 bg-background/95 px-6 py-8 shadow-2xl backdrop-blur">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex size-11 items-center justify-center rounded-md border bg-muted">
                <KeyRound className="size-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold">Welcome back</h1>
                <p className="text-sm text-muted-foreground">
                  Sign in to continue to Prometeo.
                </p>
              </div>
            </div>

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
                            attemptedSubmit &&
                            Boolean(validationErrors.identifier)
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
                          <FieldLabel htmlFor="login-password">
                            Password
                          </FieldLabel>
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
                              attemptedSubmit &&
                              Boolean(validationErrors.password)
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
                                e.target.value
                                  .replace(/\s+/g, "")
                                  .slice(0, 16),
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

                      <Button
                        type="submit"
                        className="h-10 w-full"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Spinner />
                            {twoFactorRequired ? "Verifying..." : "Signing in..."}
                          </>
                        ) : (
                          twoFactorRequired ? "Verify code" : "Login"
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

                <div className="flex items-center justify-center">
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
              </div>
            ) : (
              <div className="w-full">
                <QRLogin
                  onBack={() => {
                    clearError();
                    setShowQRLogin(false);
                  }}
                />
              </div>
            )}
            <BorderBeam duration={8} size={100} />
          </section>

          {!showQRLogin && (
            <div className="text-muted-foreground flex justify-center gap-1 text-sm">
              <p>Don't have an account?</p>
              <Link
                to="/register"
                className="text-primary font-medium hover:underline"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </main>
    </Background>
  );
}
