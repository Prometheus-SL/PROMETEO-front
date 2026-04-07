import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle2, XCircle } from "lucide-react";

/**
 * Página de callback para el OAuth de Spotify
 * Esta página recibe el código de autorización y lo procesa
 *
 * NOTA: Para que funcione completamente, necesitas:
 * 1. Agregar esta ruta al router principal
 * 2. Implementar un mecanismo para pasar los tokens al widget
 *    (por ejemplo, usando localStorage temporal o postMessage)
 */
export default function SpotifyCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Procesando autenticación...");
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");

    if (error) {
      setStatus("error");
      setMessage(`Error de autenticación: ${error}`);
      setTimeout(() => {
        window.close();
      }, 3000);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("No se recibió código de autorización");
      setTimeout(() => {
        window.close();
      }, 3000);
      return;
    }

    // Guardar el código en localStorage temporal para que el widget lo procese
    // El widget debe estar escuchando cambios en localStorage
    localStorage.setItem("spotify_auth_code", code);
    localStorage.setItem("spotify_auth_timestamp", Date.now().toString());

    setStatus("success");
    setMessage(
      "¡Autenticación exitosa! Esta ventana se cerrará automáticamente."
    );

    // Intentar comunicarse con la ventana padre si fue abierta como popup
    if (window.opener) {
      window.opener.postMessage(
        { type: "spotify_auth_success", code },
        window.location.origin
      );
    }

    // Cerrar la ventana después de 2 segundos
    setTimeout(() => {
      window.close();
      // Si no se puede cerrar (no es popup), redirigir
      navigate("/");
    }, 2000);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === "loading" && <Spinner className="size-5" />}
            {status === "success" && (
              <CheckCircle2 className="size-5 text-green-500" />
            )}
            {status === "error" && (
              <XCircle className="size-5 text-destructive" />
            )}
            Spotify Authentication
          </CardTitle>
          <CardDescription>
            {status === "loading" &&
              "Procesando tu autenticación con Spotify..."}
            {status === "success" && "Autenticación completada"}
            {status === "error" && "Error en la autenticación"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}
