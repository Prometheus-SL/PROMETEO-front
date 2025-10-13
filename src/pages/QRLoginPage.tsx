import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { authService } from "@/services/auth";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  EyeClosedIcon,
  EyeIcon,
  CheckCircle,
  AlertCircle,
  Smartphone,
} from "lucide-react";
import Background from "@/components/common/background";
import { useAuthContext } from "@/providers/AuthProvider";

export default function QRLoginPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { loginQR } = useAuthContext();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [qrStatus, setQrStatus] = useState<
    "pending" | "scanned" | "authenticated" | "expired"
  >("pending");

  // Logo definition
  const logo = {
    url: "/",
    src: "/logo.svg",
    alt: "Prometeo Logo",
    title: "Prometeo",
  };

  // Verificar y marcar QR como escaneado al cargar
  useEffect(() => {
    if (!code) {
      setError("Invalid QR code");
      return;
    }

    const scanQR = async () => {
      setScanning(true);
      try {
        // Verificar estado actual del QR
        const statusData = await authService.checkQRStatus(code);
        setQrStatus(
          statusData.status as
            | "pending"
            | "scanned"
            | "authenticated"
            | "expired"
        );

        if (statusData.status === "expired") {
          setError("The QR code has expired");
          return;
        }

        if (statusData.status === "authenticated") {
          setSuccess(true);
          // Redirigir tras un breve retraso para mostrar el mensaje de éxito
          setTimeout(() => {
            window.location.href = "/";
          }, 1500);
          return;
        }

        // Si está pendiente, marcarlo como escaneado
        if (statusData.status === "pending") {
          await authService.scanQRCode(code);
          setQrStatus("scanned");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error verificando código QR"
        );
      } finally {
        setScanning(false);
      }
    };

    scanQR();
  }, [code]);

  const handleSubmit = async () => {
    if (!code || !username || !password) return;

    setLoading(true);
    setError(null);

    try {
      const result = await authService.authenticateWithQR(
        code,
        username,
        password
      );

      if (result.user) {
        setSuccess(true);
        loginQR(result.tokens, result.user);
        setQrStatus("authenticated");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (scanning) return <Spinner />;

    switch (qrStatus) {
      case "pending":
        return <Smartphone className="h-8 w-8 text-blue-500" />;
      case "scanned":
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case "authenticated":
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case "expired":
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Smartphone className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusMessage = () => {
    if (scanning) return "Verificando código QR...";

    switch (qrStatus) {
      case "pending":
        return "QR detected";
      case "scanned":
        return "QR code verified. Please enter your credentials";
      case "authenticated":
        return "Authentication successful!";
      case "expired":
        return "The QR code has expired";
      default:
        return "Verifying QR code...";
    }
  };

  // Si hay error crítico o éxito, mostrar pantalla de estado
  if (
    error ||
    success ||
    qrStatus === "expired" ||
    qrStatus === "authenticated"
  ) {
    return (
      <Background>
        <div className="flex h-screen w-screen items-center justify-center">
          <Card className="w-full max-w-md p-8 text-center space-y-6">
            <a href={logo.url} className="block">
              <img
                src={logo.src}
                alt={logo.alt}
                title={logo.title}
                className="h-10 mx-auto dark:invert"
              />
            </a>

            <div className="space-y-4">
              {getStatusIcon()}

              <div>
                <h2 className="text-xl font-semibold">
                  {success
                    ? "¡Login Exitoso!"
                    : error
                    ? "Error"
                    : getStatusMessage()}
                </h2>

                {success && (
                  <p className="text-sm text-muted-foreground mt-2">
                    The device has been successfully authenticated.
                    Redirecting...
                  </p>
                )}

                {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

                {qrStatus === "expired" && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Generate a new QR code from the main device
                  </p>
                )}
              </div>

              {(error || qrStatus === "expired") && (
                <Button onClick={() => navigate("/")} variant="outline">
                  Go Back Home
                </Button>
              )}
            </div>
          </Card>
        </div>
      </Background>
    );
  }

  return (
    <Background>
      <div className="flex h-screen w-screen items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 space-y-6">
          <div className="text-center space-y-2">
            <a href={logo.url}>
              <img
                src={logo.src}
                alt={logo.alt}
                title={logo.title}
                className="h-10 mx-auto dark:invert"
              />
            </a>
            <h1 className="text-xl font-semibold">QR Authentication</h1>

            <div className="flex items-center justify-center space-x-2">
              {getStatusIcon()}
              <span className="text-sm text-muted-foreground">
                {getStatusMessage()}
              </span>
            </div>
          </div>

          {qrStatus === "scanned" && !loading && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="space-y-4"
            >
              <FieldSet>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="username">
                      Username or Email
                    </FieldLabel>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Username or Email"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoFocus
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
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
                    disabled={loading || !username || !password}
                  >
                    {loading ? (
                      <>
                        <Spinner />
                        Authenticating...
                      </>
                    ) : (
                      "Authenticate"
                    )}
                  </Button>

                  {error && (
                    <div className="text-sm text-red-600 text-center">
                      {error}
                    </div>
                  )}
                </FieldGroup>
              </FieldSet>
            </form>
          )}

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>This is a QR authentication session</p>
            <p>
              Enter your credentials to complete the login on the main device
            </p>
          </div>
        </Card>
      </div>
    </Background>
  );
}
