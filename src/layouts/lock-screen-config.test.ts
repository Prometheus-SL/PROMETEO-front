import { describe, expect, it } from "vitest";

import {
  buildLockScreenOverlayBackground,
  DEFAULT_LOCK_SCREEN_CONFIG,
  normalizeLockScreenConfig,
  parseLockScreenPlaylist,
  resolveNasaApodImageUrl,
  resolveLockScreenCanvasBackground,
  resolvePlaylistImageUrl,
} from "./lock-screen-config";

describe("lock screen config helpers", () => {
  it("returns defaults when the style payload is empty", () => {
    expect(normalizeLockScreenConfig(undefined)).toEqual(
      DEFAULT_LOCK_SCREEN_CONFIG,
    );
  });

  it("normalizes supported values and clamps numeric fields", () => {
    expect(
      normalizeLockScreenConfig({
        backgroundMode: "playlist",
        imageUrl: "https://images.example.com/hero.jpg",
        playlist: ["https://images.example.com/a.jpg", "", "notaurl"],
        solidColor: "#111111",
        gradientFrom: "#101010",
        gradientTo: "#fafafa",
        gradientAngle: 401,
        playlistIntervalSeconds: 5,
        overlayOpacity: 120,
        blurPx: -3,
        clockStyle: "terminal",
        clockPosition: "top-right",
        showSeconds: false,
        use24Hour: false,
        showDate: false,
        clockScale: 500,
        accentColor: "#12abef",
      }),
    ).toEqual({
      ...DEFAULT_LOCK_SCREEN_CONFIG,
      backgroundMode: "playlist",
      imageUrl: "https://images.example.com/hero.jpg",
      playlist: ["https://images.example.com/a.jpg"],
      solidColor: "#111111",
      gradientFrom: "#101010",
      gradientTo: "#fafafa",
      gradientAngle: 360,
      playlistIntervalSeconds: 15,
      overlayOpacity: 90,
      blurPx: 0,
      clockStyle: "terminal",
      clockPosition: "top-right",
      showSeconds: false,
      use24Hour: false,
      showDate: false,
      clockScale: 140,
      accentColor: "#12abef",
    });
  });

  it("parses playlist textarea lines into safe image urls", () => {
    expect(
      parseLockScreenPlaylist(`
        https://images.example.com/one.jpg
        notaurl
        https://images.example.com/two.png
      `),
    ).toEqual([
      "https://images.example.com/one.jpg",
      "https://images.example.com/two.png",
    ]);
  });

  it("rotates playlist images according to the configured interval", () => {
    const playlist = [
      "https://images.example.com/one.jpg",
      "https://images.example.com/two.jpg",
      "https://images.example.com/three.jpg",
    ];

    expect(resolvePlaylistImageUrl(playlist, 0, 20)).toBe(playlist[0]);
    expect(resolvePlaylistImageUrl(playlist, 25_000, 20)).toBe(playlist[1]);
    expect(resolvePlaylistImageUrl(playlist, 40_000, 20)).toBe(playlist[2]);
    expect(resolvePlaylistImageUrl(playlist, 61_000, 20)).toBe(playlist[0]);
  });

  it("extracts the NASA image url only when APOD returns an image", () => {
    expect(
      resolveNasaApodImageUrl({
        media_type: "image",
        hdurl: "https://apod.nasa.gov/apod/image/2401/example.jpg",
        url: "https://apod.nasa.gov/apod/image/2401/fallback.jpg",
      }),
    ).toBe("https://apod.nasa.gov/apod/image/2401/example.jpg");

    expect(
      resolveNasaApodImageUrl({
        media_type: "video",
        url: "https://www.youtube.com/watch?v=demo",
      }),
    ).toBeNull();
  });

  it("resolves solid and gradient canvas backgrounds", () => {
    expect(
      resolveLockScreenCanvasBackground(
        normalizeLockScreenConfig({
          backgroundMode: "solid-color",
          solidColor: "#101820",
        }),
      ),
    ).toBe("#101820");

    expect(
      resolveLockScreenCanvasBackground(
        normalizeLockScreenConfig({
          backgroundMode: "gradient",
          gradientFrom: "#090909",
          gradientTo: "#262626",
          gradientAngle: 135,
        }),
      ),
    ).toBe("linear-gradient(135deg, #090909 0%, #262626 100%)");
  });

  it("builds a neutral black overlay instead of a blue-tinted one", () => {
    expect(buildLockScreenOverlayBackground(60)).toBe(
      "linear-gradient(180deg, rgba(0, 0, 0, 0.74), rgba(0, 0, 0, 0.88))",
    );
  });
});
