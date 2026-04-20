import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
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
import { useAuthContext } from "@/providers/AuthProvider";
import { AuthShell } from "@/components/auth/AuthShell";

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

  useEffect(() => {
    if (!code) {
      setError("Invalid QR code");
      return;
    }

    const scanQR = async () => {
      setScanning(true);
      try {
        const statusData = await authService.checkQRStatus(code);
        setQrStatus(
          statusData.status as
            | "pending"
            | "scanned"
            | "authenticated"
            | "expired",
        );

        if (statusData.status === "expired") {
          setError("The QR code has expired.");
          return;
        }

        if (statusData.status === "authenticated") {
          setSuccess(true);
          setTimeout(() => {
            window.location.href = "/";
          }, 1500);
          return;
        }

        if (statusData.status === "pending") {
          await authService.scanQRCode(code);
          setQrStatus("scanned");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not verify the QR code.",
        );
      } finally {
        setScanning(false);
      }
    };

    void scanQR();
  }, [code]);

  const handleSubmit = async () => {
    if (!code || !username || !password) return;

    setLoading(true);
    setError(null);

    try {
      const result = await authService.authenticateWithQR(
        code,
        username,
        password,
      );

      if (result.user && result.tokens) {
        setSuccess(true);
        await loginQR(result.tokens, result.user);
        setQrStatus("authenticated");
      } else if (result.twoFactorRequired) {
        setError("Use the standard login form to complete two-factor authentication.");
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
    if (scanning) return "Checking QR code...";

    switch (qrStatus) {
      case "pending":
        return "QR code detected";
      case "scanned":
        return "QR code verified. Enter your credentials.";
      case "authenticated":
        return "Authentication successful";
      case "expired":
        return "The QR code has expired";
      default:
        return "Verifying QR code...";
    }
  };

  if (
    error ||
    success ||
    qrStatus === "expired" ||
    qrStatus === "authenticated"
  ) {
    return (
      <AuthShell
        title={
          success ? "Login successful" : error ? "QR sign-in error" : getStatusMessage()
        }
        description={
          success
            ? "The device has been authenticated successfully. Redirecting..."
            : error || "Generate a new QR code from the main device."
        }
        eyebrow="QR authentication"
        icon={success ? CheckCircle : AlertCircle}
        maxWidth="sm"
      >
        <div className="space-y-5 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-md border border-white/10 bg-muted/50">
            {getStatusIcon()}
          </div>

          {(error || qrStatus === "expired") && (
            <Button onClick={() => navigate("/")} variant="outline">
              Go back home
            </Button>
          )}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="QR authentication"
      description="Confirm this sign-in request."
      eyebrow="Mobile handoff"
      icon={Smartphone}
      maxWidth="sm"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3 rounded-md border border-white/10 bg-muted/50 px-4 py-3">
          {getStatusIcon()}
          <span className="text-sm text-muted-foreground">
            {getStatusMessage()}
          </span>
        </div>

        {qrStatus === "scanned" && !loading && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
            className="space-y-4"
          >
            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="username">Username or email</FieldLabel>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Username or email"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
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
                      onChange={(event) => setPassword(event.target.value)}
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
                  <div className="text-center text-sm text-red-600">
                    {error}
                  </div>
                )}
              </FieldGroup>
            </FieldSet>
          </form>
        )}

        <div className="rounded-md border border-white/10 bg-background/50 px-4 py-3 text-center text-xs leading-5 text-muted-foreground">
          This QR session only completes the sign-in on the main device.
        </div>
      </div>
    </AuthShell>
  );
}
