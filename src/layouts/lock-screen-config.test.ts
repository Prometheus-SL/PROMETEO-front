import { describe, expect, it } from "vitest";

import {
  buildLockScreenOverlayBackground,
  DEFAULT_LOCK_SCREEN_CONFIG,
  hasLockScreenConfig,
  isLockScreenSleepScheduleActive,
  normalizeLockScreenConfig,
  parseLockScreenPlaylist,
  readLockScreenConfig,
  resolveNasaApodImageUrl,
  resolveLockScreenCanvasBackground,
  resolvePlaylistImageUrl,
  writeLockScreenConfig,
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
        enabledWidgets: ["weather", "system", "weather", "unknown-widget"],
        weatherCity: "  Barcelona  ",
        weatherUnits: "imperial",
        weatherLanguage: "en",
        sleepSchedule: {
          enabled: true,
          startTime: "22:30",
          endTime: "06:45",
          days: [1, 2, 7, "bad", 1],
        },
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
      enabledWidgets: ["weather"],
      weatherCity: "Barcelona",
      weatherUnits: "imperial",
      weatherLanguage: "en",
      sleepSchedule: {
        enabled: true,
        startTime: "22:30",
        endTime: "06:45",
        days: [1, 2],
      },
    });
  });

  it("normalizes lock-screen widget toggles from a boolean map", () => {
    expect(
      normalizeLockScreenConfig({
        enabledWidgets: {
          "now-playing": true,
          weather: true,
          system: true,
          unknown: true,
        },
      }).enabledWidgets,
    ).toEqual(["now-playing", "weather"]);
  });

  it("reads and writes lock screen config inside dashboard style", () => {
    const style = {
      theme: "midnight",
      layoutDensity: "compact",
      lockScreen: {
        clockStyle: "terminal",
        clockPosition: "center-right",
        enabledWidgets: ["weather"],
        weatherCity: "Valencia",
      },
    };

    expect(hasLockScreenConfig(style)).toBe(true);
    expect(readLockScreenConfig(style)).toEqual({
      ...DEFAULT_LOCK_SCREEN_CONFIG,
      clockStyle: "terminal",
      clockPosition: "center-right",
      enabledWidgets: ["weather"],
      weatherCity: "Valencia",
    });

    const nextStyle = writeLockScreenConfig(style, {
      ...DEFAULT_LOCK_SCREEN_CONFIG,
      clockStyle: "poster",
      clockPosition: "bottom-right",
      enabledWidgets: ["now-playing"],
      weatherCity: "Bilbao",
    });

    expect(nextStyle.theme).toBe("midnight");
    expect(nextStyle.layoutDensity).toBe("compact");
    expect(nextStyle.lockScreen).toEqual({
      ...DEFAULT_LOCK_SCREEN_CONFIG,
      clockStyle: "poster",
      clockPosition: "bottom-right",
      enabledWidgets: ["now-playing"],
      weatherCity: "Bilbao",
    });
  });

  it("detects when dashboard style does not yet contain lock screen config", () => {
    expect(hasLockScreenConfig({ theme: "midnight" })).toBe(false);
    expect(hasLockScreenConfig({ lockScreen: null })).toBe(false);
    expect(hasLockScreenConfig(undefined)).toBe(false);
  });

  it("keeps supported center-side clock positions", () => {
    expect(
      normalizeLockScreenConfig({ clockPosition: "center-left" }).clockPosition,
    ).toBe("center-left");
    expect(
      normalizeLockScreenConfig({ clockPosition: "center-right" }).clockPosition,
    ).toBe("center-right");
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

  it("activates overnight sleep hours using the configured start day", () => {
    const config = normalizeLockScreenConfig({
      sleepSchedule: {
        enabled: true,
        startTime: "23:00",
        endTime: "07:00",
        days: [1, 2, 3, 4, 5],
      },
    });

    expect(
      isLockScreenSleepScheduleActive(
        config.sleepSchedule,
        new Date("2026-04-27T23:30:00"),
      ),
    ).toBe(true);
    expect(
      isLockScreenSleepScheduleActive(
        config.sleepSchedule,
        new Date("2026-04-28T06:30:00"),
      ),
    ).toBe(true);
    expect(
      isLockScreenSleepScheduleActive(
        config.sleepSchedule,
        new Date("2026-04-28T08:00:00"),
      ),
    ).toBe(false);
    expect(
      isLockScreenSleepScheduleActive(
        config.sleepSchedule,
        new Date("2026-05-03T23:30:00"),
      ),
    ).toBe(false);
  });
});
