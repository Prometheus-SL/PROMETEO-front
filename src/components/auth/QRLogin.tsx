import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  authService,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
} from "@/services/auth";
import { Card } from "@/components/ui/card";
import { RefreshCw, Smartphone, CheckCircle, Clock } from "lucide-react";

interface QRLoginProps {
  onBack: () => void;
}

type QRStatus = "pending" | "scanned" | "authenticated" | "expired";

export default function QRLogin({ onBack }: QRLoginProps) {
  const navigate = useNavigate();
  const [qrData, setQrData] = useState<{
    code: string;
    expiresAt: string;
  } | null>(null);
  const [status, setStatus] = useState<QRStatus>("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const generateQR = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.generateQRCode();
      setQrData(data);
      setStatus("pending");

      // Calcular tiempo restante
      const expiresAt = new Date(data.expiresAt).getTime();
      const now = Date.now();
      setTimeLeft(Math.max(0, Math.floor((expiresAt - now) / 1000)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  // Polling para verificar el estado del QR
  useEffect(() => {
    if (!qrData || status === "authenticated" || status === "expired") return;

    const checkStatus = async () => {
      try {
        const statusData = await authService.checkQRStatus(qrData.code);
        setStatus(statusData.status as QRStatus);

        if (
          statusData.status === "authenticated" &&
          statusData.tokens &&
          statusData.user
        ) {
          // El QR fue autenticado exitosamente, guardamos los tokens
          localStorage.setItem(ACCESS_TOKEN_KEY, statusData.tokens.accessToken);
          localStorage.setItem(
            REFRESH_TOKEN_KEY,
            statusData.tokens.refreshToken
          );
          localStorage.setItem(USER_KEY, JSON.stringify(statusData.user));

          // Redirigir al dashboard
          setTimeout(() => {
            navigate("/");
          }, 1000);
        }
      } catch (err) {
        console.error("Error verificando estado:", err);
      }
    };

    const interval = setInterval(checkStatus, 2000); // Verificar cada 2 segundos

    return () => clearInterval(interval);
  }, [qrData, status, navigate]);

  // Contador de tiempo
  useEffect(() => {
    if (timeLeft <= 0) {
      setStatus("expired");
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          setStatus("expired");
        }
        return Math.max(0, newTime);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Auto-generar QR al montar el componente (solo una vez)
  useEffect(() => {
    generateQR();
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case "pending":
        return <Smartphone className="h-5 w-5 text-blue-500" />;
      case "scanned":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "authenticated":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "expired":
        return <RefreshCw className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case "pending":
        return "Scan the QR code with your mobile device";
      case "scanned":
        return "QR code scanned. Enter your credentials on the mobile device";
      case "authenticated":
        return "Authentication successful! Redirecting...";
      case "expired":
        return "The QR code has expired. Generate a new one.";
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Login with QR Code</h2>
      </div>
      <Card className="p-6 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-red-600">{error}</p>
            <Button onClick={generateQR} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : qrData ? (
          <div className="space-y-3">
            {/* Código QR */}
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QRCode
                size={200}
                value={`${window.location.origin}/qr-login/${qrData.code}`}
                level="M"
              />
            </div>

            {/* Estado */}
            <div className="flex items-center justify-center space-x-2 text-sm">
              {getStatusIcon()}
              <span>{getStatusMessage()}</span>
            </div>

            {/* Timer */}
            {status !== "expired" && status !== "authenticated" && (
              <div className="text-center text-sm text-muted-foreground">
                Expires in: {formatTime(timeLeft)}
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2">
              {(status === "expired" || error) && (
                <Button
                  onClick={generateQR}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  New QR
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </Card>

      {/* Button to go back */}
      <Button onClick={onBack} variant="ghost" className="w-full">
        Back to Traditional Login
      </Button>
    </div>
  );
}
