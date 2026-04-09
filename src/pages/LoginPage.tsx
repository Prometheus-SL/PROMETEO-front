import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EyeClosedIcon, EyeIcon, QrCode } from "lucide-react";

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

function getLoginErrors(identifier: string, password: string) {
  return {
    identifier: identifier.trim()
      ? null
      : "Introduce tu email o nombre de usuario.",
    password: password ? null : "Introduce tu contrasena.",
  };
}

export default function LoginPage() {
  const { login, loading, error, accessToken, clearError } = useAuthContext();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showQRLogin, setShowQRLogin] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const navigate = useNavigate();

  const validationErrors = getLoginErrors(identifier, password);

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
    setAttemptedSubmit(true);

    const trimmedIdentifier = identifier.trim();
    const nextErrors = getLoginErrors(trimmedIdentifier, password);

    if (nextErrors.identifier || nextErrors.password) {
      return;
    }

    await login(trimmedIdentifier, password);
  };

  const logo = {
    url: "/",
    src: "/logo.svg",
    alt: "Prometeo Logo",
    title: "Prometeo",
  };

  return (
    <Background>
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="flex flex-col items-center gap-6 lg:justify-start">
          <a href={logo.url}>
            <img
              src={logo.src}
              alt={logo.alt}
              title={logo.title}
              className="h-10 dark:invert"
            />
          </a>

          <div className="relative min-w-sm border-muted bg-background flex w-full max-w-sm flex-col items-center gap-y-4 rounded-md border px-6 py-8 shadow-md">
            <h1 className="text-xl font-semibold">Welcome to Prometeo</h1>

            {!showQRLogin ? (
              <div className="w-full max-w-md space-y-4">
                <form onSubmit={handleSubmit} noValidate>
                  <FieldSet>
                    <FieldGroup>
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
                        <FieldLabel htmlFor="login-password">
                          Password
                        </FieldLabel>

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

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Spinner />
                            Signing in...
                          </>
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
                    Login con codigo QR
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
          </div>

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
      </div>
    </Background>
  );
}
