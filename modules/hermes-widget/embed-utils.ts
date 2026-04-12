import type { HermesMediaState } from "./hermes-service";

export type EmbedConfig = {
  provider: "youtube" | "twitch" | "soundcloud";
  title: string;
  src: string;
};

function parseYouTubeId(url: URL) {
  if (url.hostname === "youtu.be") {
    return url.pathname.replace(/^\/+/, "").split("/")[0] || "";
  }

  if (url.searchParams.get("v")) {
    return url.searchParams.get("v") || "";
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "shorts" || parts[0] === "live" || parts[0] === "embed") {
    return parts[1] || "";
  }

  return "";
}

function buildYouTubeEmbed(media: HermesMediaState): EmbedConfig | null {
  if (!media.canonicalUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(media.canonicalUrl);
  } catch (_error) {
    return null;
  }

  const videoId = parseYouTubeId(parsed);
  if (!videoId) return null;

  const startSeconds = Math.max(
    0,
    Math.floor((Number(media.positionMs) || 0) / 1000)
  );
  const src = new URL(`https://www.youtube.com/embed/${videoId}`);
  src.searchParams.set("autoplay", "1");
  src.searchParams.set("playsinline", "1");
  src.searchParams.set("rel", "0");
  if (startSeconds > 0) {
    src.searchParams.set("start", String(startSeconds));
  }

  return {
    provider: "youtube",
    title: media.title || "YouTube",
    src: src.toString(),
  };
}

function buildTwitchEmbed(media: HermesMediaState): EmbedConfig | null {
  if (!media.canonicalUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(media.canonicalUrl);
  } catch (_error) {
    return null;
  }

  const parts = parsed.pathname.split("/").filter(Boolean);
  const parent = window.location.hostname || "localhost";
  const src = new URL("https://player.twitch.tv/");
  src.searchParams.set("parent", parent);
  src.searchParams.set("autoplay", "true");

  if (parts[0] === "videos" && parts[1]) {
    src.searchParams.set("video", `v${parts[1].replace(/^v/i, "")}`);
  } else if (parts[0]) {
    src.searchParams.set("channel", parts[0]);
  } else {
    return null;
  }

  return {
    provider: "twitch",
    title: media.title || "Twitch",
    src: src.toString(),
  };
}

function buildSoundCloudEmbed(media: HermesMediaState): EmbedConfig | null {
  if (!media.canonicalUrl) return null;

  const src = new URL("https://w.soundcloud.com/player/");
  src.searchParams.set("url", media.canonicalUrl);
  src.searchParams.set("auto_play", "true");
  src.searchParams.set("show_artwork", "true");
  src.searchParams.set("visual", "true");

  return {
    provider: "soundcloud",
    title: media.title || "SoundCloud",
    src: src.toString(),
  };
}

export function getMediaEmbedConfig(
  media?: HermesMediaState | null
): EmbedConfig | null {
  if (!media?.canonicalUrl || !media.provider) return null;

  const provider = media.provider.toLowerCase();
  if (provider === "youtube") {
    return buildYouTubeEmbed(media);
  }

  if (provider === "twitch") {
    return buildTwitchEmbed(media);
  }

  if (provider === "soundcloud") {
    return buildSoundCloudEmbed(media);
  }

  return null;
}
