import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/providers/AuthProvider";

import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import Background from "@/components/common/background";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { EyeClosedIcon, EyeIcon, QrCode } from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam";
import QRLogin from "@/components/auth/QRLogin";

export default function LoginPage() {
  const { login, loading, error, accessToken } = useAuthContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showQRLogin, setShowQRLogin] = useState(false);
  const navigate = useNavigate();

  // Logo definition
  const logo = {
    url: "/",
    src: "/logo.svg",
    alt: "Prometeo Logo",
    title: "Prometeo",
  };

  useEffect(() => {
    if (accessToken) {
      navigate("/", { replace: true });
    }
  }, [accessToken, navigate]);

  const handleSubmit = () => {
    login(username, password);
  };

  return (
    <Background>
      <div className="flex h-screen w-screen items-center justify-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-6 lg:justify-start">
          <a href={logo.url}>
            <img
              src={logo.src}
              alt={logo.alt}
              title={logo.title}
              className="h-10 dark:invert"
            />
          </a>

          {/* Contenedor de login con toggle QR/Normal */}
          <div className="relative min-w-sm border-muted bg-background flex w-full max-w-sm flex-col items-center gap-y-4 rounded-md border px-6 py-8 shadow-md">
            <h1 className="text-xl font-semibold">Welcome to Prometeo</h1>

            {!showQRLogin ? (
              // Login normal
              <div className="w-full max-w-md space-y-4">
                <FieldSet>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="email">Email</FieldLabel>
                      <Input
                        type="email"
                        placeholder="Email"
                        className="text-sm"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSubmit();
                          }
                        }}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="password">Password</FieldLabel>

                      <InputGroup>
                        <InputGroupInput
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          className="text-sm"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSubmit();
                            }
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
                    </Field>
                    <Button
                      type="submit"
                      className="w-full"
                      onClick={handleSubmit}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner />
                          Loading...
                        </>
                      ) : (
                        "Login"
                      )}
                    </Button>
                    {error && (
                      <div className="text-sm text-red-600">{error}</div>
                    )}
                  </FieldGroup>
                </FieldSet>

                {/* Botón para cambiar a QR */}
                <div className="flex items-center justify-center">
                  <Button
                    onClick={() => setShowQRLogin(true)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Login con código QR
                  </Button>
                </div>
              </div>
            ) : (
              // Login QR
              <div className="w-full">
                <QRLogin onBack={() => setShowQRLogin(false)} />
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
