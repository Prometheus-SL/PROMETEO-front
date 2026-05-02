import { activateSpotifyWebPlaybackForSpark } from "./spotify-web-playback";
import { spotifyService } from "./spotify-service";
import type {
  SparkClientAction,
  SparkClientActionExecutor,
  SparkClientActionResult,
} from "@/modules/ai/types";

async function executeSpotifyPlayTrack(
  action: SparkClientAction,
): Promise<SparkClientActionResult> {
  const uri = String(action.payload.uri ?? "").trim();
  const trackName = String(action.payload.trackName ?? "").trim();
  const artistName = String(action.payload.artistName ?? "").trim();

  if (!uri) {
    throw new Error("Spotify no recibio una pista valida para reproducir.");
  }

  const snapshot = await activateSpotifyWebPlaybackForSpark();
  if (snapshot.status !== "active" || !snapshot.deviceId) {
    throw new Error(
      snapshot.error ||
        "Spotify necesita activar el reproductor interno antes de reproducir la cancion.",
    );
  }

  await spotifyService.playTrack(uri);

  const title = trackName
    ? `${trackName}${artistName ? ` de ${artistName}` : ""}`
    : "la cancion solicitada";

  return {
    id: action.id,
    success: true,
    message: `Spotify reproduciendo ${title} en el reproductor interno.`,
    data: {
      deviceId: snapshot.deviceId,
      uri,
    },
  };
}

export const sparkClientExecutors: Record<string, SparkClientActionExecutor> = {
  "spotify.play_track": executeSpotifyPlayTrack,
};
