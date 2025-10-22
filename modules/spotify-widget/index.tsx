import * as React from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Music2,
  Volume2,
  VolumeX,
  Monitor,
  Smartphone,
  Tablet,
  Speaker,
  Tv,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { GridPattern } from "@/components/ui/grid-pattern";
import { Badge } from "@/components/ui/badge";

// Tipos de la API de Spotify
type SpotifyTrack = {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
  duration_ms: number;
};

type SpotifyPlaybackState = {
  is_playing: boolean;
  progress_ms: number;
  item: SpotifyTrack | null;
  shuffle_state: boolean;
  repeat_state: "off" | "track" | "context";
  device: {
    id: string;
    name: string;
    volume_percent?: number;
    type: string;
  } | null;
  context: {
    type: string; // "playlist", "album", "artist", "show"
    href: string;
    uri: string;
  } | null;
};

type SpotifyContextInfo = {
  name: string;
  type: string;
  images?: { url: string }[];
};

export default function SpotifyWidget({
  config,
  onConfigChange,
}: {
  config: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
}) {
  // Client ID y Secret desde variables de entorno
  const clientId = import.meta.env.VITE_SPOTIPY_CLIENT_ID || "";
  const clientSecret = import.meta.env.VITE_SPOTIPY_CLIENT_SECRET || "";

  // Tokens desde la config (guardados automáticamente)
  const savedAccessToken = String(config["accessToken"] ?? "");
  const savedRefreshToken = String(config["refreshToken"] ?? "");
  const savedTokenExpiry = Number(config["tokenExpiry"] ?? 0);

  const [accessToken, setAccessToken] = React.useState(savedAccessToken);
  const [refreshToken, setRefreshToken] = React.useState(savedRefreshToken);
  const [tokenExpiry, setTokenExpiry] = React.useState(savedTokenExpiry);
  const [playbackState, setPlaybackState] =
    React.useState<SpotifyPlaybackState | null>(null);
  const [contextInfo, setContextInfo] =
    React.useState<SpotifyContextInfo | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [volume, setVolume] = React.useState(50);
  const [previousTrackId, setPreviousTrackId] = React.useState<string | null>(
    null
  );
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  // Sincronizar tokens cuando cambie la config
  React.useEffect(() => {
    if (savedAccessToken && savedAccessToken !== accessToken) {
      setAccessToken(savedAccessToken);
      setRefreshToken(savedRefreshToken);
      setTokenExpiry(savedTokenExpiry);
    }
  }, [savedAccessToken, savedRefreshToken, savedTokenExpiry, accessToken]);

  // Verificar si el token es válido
  const isTokenValid = React.useMemo(() => {
    return accessToken && Date.now() < tokenExpiry;
  }, [accessToken, tokenExpiry]);

  // Función para refrescar el token
  const refreshAccessToken = React.useCallback(async () => {
    if (!refreshToken || !clientId || !clientSecret) return false;

    try {
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) throw new Error("Failed to refresh token");

      const data = await response.json();
      const newExpiry = Date.now() + data.expires_in * 1000;

      setAccessToken(data.access_token);
      setTokenExpiry(newExpiry);

      // Guardar el nuevo token en la configuración
      const newConfig = {
        ...config,
        accessToken: data.access_token,
        tokenExpiry: newExpiry,
      };
      onConfigChange?.(newConfig);

      return true;
    } catch (e) {
      console.error("Error refreshing token:", e);
      return false;
    }
  }, [refreshToken, clientId, clientSecret, config, onConfigChange]);

  // Iniciar el flujo de autenticación OAuth
  const startOAuthFlow = React.useCallback(() => {
    if (!clientId || !clientSecret) {
      setError(
        "Spotify app not configured. Set VITE_SPOTIPY_CLIENT_ID and VITE_SPOTIPY_CLIENT_SECRET in .env"
      );
      return;
    }

    const redirectUri = `${window.location.origin}/spotify-callback`;
    const scopes = [
      "user-read-playback-state",
      "user-modify-playback-state",
      "user-read-currently-playing",
      "user-read-recently-played",
    ].join(" ");

    const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams(
      {
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: scopes,
        show_dialog: "true",
      }
    )}`;

    // Abrir popup de autenticación
    const popup = window.open(authUrl, "_blank", "width=500,height=700");

    // Flag para evitar procesamiento doble
    let isProcessing = false;

    // Función para intercambiar código por tokens
    const exchangeCode = async (code: string) => {
      if (isProcessing) return; // Evitar procesamiento doble
      isProcessing = true;

      try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Spotify API error:", errorData);
          throw new Error("Failed to exchange code");
        }

        const data = await response.json();

        // Actualizar tokens inmediatamente en el estado local
        const newAccessToken = data.access_token;
        const newRefreshToken = data.refresh_token;
        const newExpiry = Date.now() + data.expires_in * 1000;

        setAccessToken(newAccessToken);
        setRefreshToken(newRefreshToken);
        setTokenExpiry(newExpiry);
        setIsAuthenticated(true);

        // Guardar los tokens en la configuración del widget para persistencia
        const newConfig = {
          ...config,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          tokenExpiry: newExpiry,
        };
        onConfigChange?.(newConfig);

        // Limpiar el código del localStorage
        localStorage.removeItem("spotify_auth_code");
        localStorage.removeItem("spotify_auth_timestamp");

        // Cerrar popup si existe
        if (popup && !popup.closed) {
          popup.close();
        }
      } catch (e) {
        console.error("Error exchanging code:", e);
        setError("Failed to complete authentication");
      } finally {
        isProcessing = false;
      }
    };

    // Escuchar el mensaje del popup cuando se complete
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type !== "spotify_auth_success") return;

      const code = event.data.code;
      if (!code) return;

      // Limpiar listeners
      window.removeEventListener("message", handleMessage);
      clearInterval(storageInterval);

      // Intercambiar código por tokens
      await exchangeCode(code);
    };

    window.addEventListener("message", handleMessage);

    // También escuchar cambios en localStorage como fallback
    const handleStorage = async () => {
      const code = localStorage.getItem("spotify_auth_code");
      const timestamp = localStorage.getItem("spotify_auth_timestamp");

      if (!code || !timestamp) return;

      // Verificar que el código es reciente (menos de 10 segundos)
      if (Date.now() - parseInt(timestamp) > 10000) {
        localStorage.removeItem("spotify_auth_code");
        localStorage.removeItem("spotify_auth_timestamp");
        return;
      }

      // Limpiar listeners
      window.removeEventListener("message", handleMessage);
      clearInterval(storageInterval);

      // Procesar el código
      await exchangeCode(code);
    };

    // Verificar localStorage cada segundo por 10 segundos
    const storageInterval = setInterval(handleStorage, 1000);
    setTimeout(() => {
      clearInterval(storageInterval);
      window.removeEventListener("message", handleMessage);
    }, 10000);
  }, [clientId, clientSecret, config, onConfigChange]);

  // Obtener información del contexto (playlist, álbum, etc.)
  const fetchContextInfo = React.useCallback(
    async (contextHref: string) => {
      if (!accessToken) return;

      try {
        const response = await fetch(contextHref, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) return;

        const data = await response.json();
        setContextInfo({
          name: data.name || "Unknown",
          type: data.type || "context",
          images: data.images,
        });
      } catch (e) {
        console.error("Error fetching context:", e);
        setContextInfo(null);
      }
    },
    [accessToken]
  );

  // Obtener estado de reproducción actual
  const fetchPlaybackState = React.useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await fetch("https://api.spotify.com/v1/me/player", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 401) {
        // Token expirado, intentar refrescar
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          setIsAuthenticated(false);
          setError("Session expired. Please re-authenticate.");
        }
        return;
      }

      if (response.status === 204) {
        // No hay dispositivo activo
        setPlaybackState(null);
        setContextInfo(null);
        setError(null);
        return;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      setPlaybackState(data);
      setError(null);
      setIsAuthenticated(true);

      // Obtener información del contexto (playlist/álbum)
      if (data.context?.href) {
        fetchContextInfo(data.context.href);
      } else {
        setContextInfo(null);
      }
    } catch (e: unknown) {
      console.error("Error fetching playback:", e);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [accessToken, refreshAccessToken, fetchContextInfo]);

  // Control de reproducción
  const playPause = React.useCallback(async () => {
    if (!accessToken || !playbackState?.device) return;

    const endpoint = playbackState.is_playing ? "pause" : "play";
    try {
      await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      await fetchPlaybackState();
    } catch (e) {
      console.error("Error toggling playback:", e);
    }
  }, [accessToken, playbackState, fetchPlaybackState]);

  const skipNext = React.useCallback(async () => {
    if (!accessToken) return;

    try {
      await fetch("https://api.spotify.com/v1/me/player/next", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setTimeout(fetchPlaybackState, 300);
    } catch (e) {
      console.error("Error skipping:", e);
    }
  }, [accessToken, fetchPlaybackState]);

  const skipPrevious = React.useCallback(async () => {
    if (!accessToken) return;

    try {
      await fetch("https://api.spotify.com/v1/me/player/previous", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setTimeout(fetchPlaybackState, 300);
    } catch (e) {
      console.error("Error going back:", e);
    }
  }, [accessToken, fetchPlaybackState]);

  const toggleShuffle = React.useCallback(async () => {
    if (!accessToken || !playbackState) return;

    try {
      await fetch(
        `https://api.spotify.com/v1/me/player/shuffle?state=${!playbackState.shuffle_state}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      await fetchPlaybackState();
    } catch (e) {
      console.error("Error toggling shuffle:", e);
    }
  }, [accessToken, playbackState, fetchPlaybackState]);

  const toggleRepeat = React.useCallback(async () => {
    if (!accessToken || !playbackState) return;

    const nextState =
      playbackState.repeat_state === "off"
        ? "context"
        : playbackState.repeat_state === "context"
        ? "track"
        : "off";

    try {
      await fetch(
        `https://api.spotify.com/v1/me/player/repeat?state=${nextState}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      await fetchPlaybackState();
    } catch (e) {
      console.error("Error toggling repeat:", e);
    }
  }, [accessToken, playbackState, fetchPlaybackState]);

  const seekToPosition = React.useCallback(
    async (position: number) => {
      if (!accessToken) return;

      try {
        await fetch(
          `https://api.spotify.com/v1/me/player/seek?position_ms=${Math.floor(
            position
          )}`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
      } catch (e) {
        console.error("Error seeking:", e);
      }
    },
    [accessToken]
  );

  const setVolumeLevel = React.useCallback(
    async (volumePercent: number) => {
      if (!accessToken) return;

      try {
        await fetch(
          `https://api.spotify.com/v1/me/player/volume?volume_percent=${Math.floor(
            volumePercent
          )}`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        setVolume(volumePercent);
      } catch (e) {
        console.error("Error setting volume:", e);
      }
    },
    [accessToken]
  );

  // Efecto para cargar datos iniciales
  React.useEffect(() => {
    if (!isTokenValid) {
      setIsAuthenticated(false);
      return;
    }

    setIsAuthenticated(true);
    fetchPlaybackState();
  }, [
    isTokenValid,
    fetchPlaybackState,
    accessToken,
    tokenExpiry,
    savedAccessToken,
  ]);

  // Polling cada segundo para actualizar el estado
  React.useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchPlaybackState();
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchPlaybackState]);

  // Sincronizar volumen y detectar cambios de canción
  React.useEffect(() => {
    if (playbackState?.device?.volume_percent !== undefined) {
      setVolume(playbackState.device.volume_percent);
    }
  }, [playbackState?.device?.volume_percent]);

  // Detectar cambios de canción para animación
  React.useEffect(() => {
    const currentTrackId = playbackState?.item?.id;

    // Si no hay track ID, resetear
    if (!currentTrackId) {
      setPreviousTrackId(null);
      setIsTransitioning(false);
      return;
    }

    // Si es la primera canción, solo guardar el ID sin animación
    if (previousTrackId === null) {
      setPreviousTrackId(currentTrackId);
      return;
    }

    // Si cambió la canción, activar animación
    if (currentTrackId !== previousTrackId) {
      setIsTransitioning(true);
      setPreviousTrackId(currentTrackId);

      // Resetear animación después de 400ms
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 400);

      return () => {
        clearTimeout(timer);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackState?.item?.id]); // NO incluir previousTrackId en dependencias

  const track = playbackState?.item;
  const albumArt = track?.album?.images?.[0]?.url;
  const progress = playbackState?.progress_ms ?? 0;
  const duration = track?.duration_ms ?? 0;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Función para obtener el icono según el tipo de dispositivo
  const getDeviceIcon = (deviceType?: string) => {
    if (!deviceType) return <Speaker className="size-3" />;

    const type = deviceType.toLowerCase();
    switch (type) {
      case "computer":
        return <Monitor size={1} />;
      case "smartphone":
        return <Smartphone size={1} />;
      case "tablet":
        return <Tablet size={1} />;
      case "speaker":
        return <Speaker size={1} />;
      case "tv":
      case "cast_video":
      case "chromecast":
        return <Tv size={1} />;
      case "avr":
      case "stb":
      case "audio_dongle":
      case "game_console":
        return <Speaker size={1} />;
      default:
        return <Speaker size={1} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <Card className="relative h-full overflow-hidden border border-border/60 bg-background/90 shadow-lg shadow-primary/10">
        <GridPattern
          width={30}
          height={30}
          x={-1}
          y={-1}
          strokeDasharray="4 2"
          className="pointer-events-none opacity-40 [mask-image:radial-gradient(360px_circle_at_center,white,transparent)]"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/15 via-primary/10 to-background" />

        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <Music2 className="size-5" />
            Spotify
          </CardTitle>
          <CardDescription>Connect your Spotify account</CardDescription>
        </CardHeader>

        <CardContent className="relative flex flex-col items-center justify-center gap-4">
          <p className="text-center text-sm text-muted-foreground">
            Authenticate with Spotify to display your current playback.
          </p>
          <Button onClick={startOAuthFlow} variant="default" size="lg">
            Connect Spotify
          </Button>
          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative h-full overflow-hidden border border-border/60 bg-background/90 shadow-lg shadow-primary/10 py-1">
      <GridPattern
        width={30}
        height={30}
        x={-1}
        y={-1}
        strokeDasharray="4 2"
        className="pointer-events-none opacity-40 [mask-image:radial-gradient(360px_circle_at_center,white,transparent)]"
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-green-500/15 via-primary/10 to-background"
        style={{
          backgroundImage: albumArt
            ? `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.8)), url(${albumArt})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {albumArt && (
        <div className="absolute inset-0 backdrop-blur-xs bg-background/40 rounded-xl" />
      )}

      <div className="relative flex h-full flex-col p-2 mx-2">
        {/* Información del contexto (playlist/álbum) */}
        {contextInfo && (
          <div className="absolute top-1 right-1 flex items-center gap-1.5 bg-background/70 backdrop-blur-sm rounded-lg px-2 py-1 border border-border/40 shadow-md max-w-[45%]">
            {contextInfo.images?.[0]?.url && (
              <img
                src={contextInfo.images[0].url}
                alt={contextInfo.name}
                className="size-5 rounded object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[9px] text-muted-foreground uppercase font-medium">
                {contextInfo.type === "playlist"
                  ? "Playlist"
                  : contextInfo.type === "album"
                  ? "Álbum"
                  : contextInfo.type === "artist"
                  ? "Artista"
                  : "Contexto"}
              </p>
              <p className="text-[10px] font-semibold text-foreground truncate">
                {contextInfo.name}
              </p>
            </div>
          </div>
        )}

        {/* Header con álbum */}
        <div className="mb-4 flex items-center gap-3">
          {albumArt ? (
            <img
              src={albumArt}
              alt="Album art"
              className={cn(
                "size-14 rounded-xl shadow-xl transition-all duration-500 ease-in-out",
                isTransitioning
                  ? "scale-90 opacity-40 blur-sm"
                  : "scale-100 opacity-100 blur-0"
              )}
            />
          ) : (
            <div className="grid size-14 place-items-center rounded-lg border border-border/40 bg-muted">
              <Music2 className="size-7 text-muted-foreground" />
            </div>
          )}

          <div
            className={cn(
              "min-w-0 flex-1 transition-all duration-500 ease-in-out",
              isTransitioning
                ? "opacity-30 translate-x-3"
                : "opacity-100 translate-x-0"
            )}
          >
            <h3 className="truncate text-sm font-bold text-foreground drop-shadow-md">
              {track?.name ?? "No track playing"}
            </h3>
            <p className="truncate text-xs text-foreground/80 drop-shadow-sm">
              {track?.artists?.map((a) => a.name).join(", ") ??
                "Unknown artist"}
            </p>
            <Badge
              variant="secondary"
              className="mt-1 bg-background/80 text-[10px] px-1.5 py-0 flex items-center gap-1"
            >
              {getDeviceIcon(playbackState?.device?.type)}
              <span className="truncate max-w-[120px]">
                {playbackState?.device?.name ?? "No device"}
              </span>
            </Badge>
          </div>
        </div>

        <div className="mb-2 mx-1">
          <Slider
            value={[progress]}
            max={duration}
            step={1000}
            onValueChange={([value]) => seekToPosition(value)}
            className="mb-1"
            disabled={!track}
          />
          <div className="flex justify-between text-[10px] text-foreground/70">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1 mb-1">
          {/* Controles */}
          <div className="flex items-center gap-1 mb-1 grow">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleShuffle}
              disabled={!track}
              className={cn(
                "size-8",
                playbackState?.shuffle_state && "text-green-400"
              )}
              title="Shuffle"
            >
              <Shuffle className="size-3" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={skipPrevious}
              disabled={!track}
              className="size-8"
              title="Previous"
            >
              <SkipBack className="size-3" />
            </Button>

            <Button
              variant="default"
              size="icon"
              onClick={playPause}
              disabled={!track}
              className="size-10"
              title={playbackState?.is_playing ? "Pause" : "Play"}
            >
              {playbackState?.is_playing ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={skipNext}
              disabled={!track}
              className="size-8"
              title="Next"
            >
              <SkipForward className="size-3" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRepeat}
              disabled={!track}
              className={cn(
                "size-8",
                playbackState?.repeat_state !== "off" && "text-green-400"
              )}
              title={
                playbackState?.repeat_state === "track"
                  ? "Repeat track"
                  : playbackState?.repeat_state === "context"
                  ? "Repeat playlist"
                  : "Repeat off"
              }
            >
              {playbackState?.repeat_state === "track" ? (
                <Repeat1 className="size-3" />
              ) : (
                <Repeat className="size-3" />
              )}
            </Button>
          </div>

          {/* Control de volumen */}
          <div className="mx-1 flex items-center gap-2 flex-none w-50">
            {volume === 0 ? (
              <VolumeX className="size-3.5 text-foreground/70 shrink-0" />
            ) : (
              <Volume2 className="size-3.5 text-foreground/70 shrink-0" />
            )}
            <Slider
              value={[volume]}
              max={100}
              step={1}
              onValueChange={([value]) => setVolumeLevel(value)}
              className="flex-1"
              disabled={!track}
            />
            <span className="text-[10px] text-foreground/70 w-7 text-right font-medium">
              {Math.round(volume)}%
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
