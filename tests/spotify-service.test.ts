import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { configureApi } from "../src/lib/api";
import { spotifyService } from "../modules/spotify-widget/spotify-service";
import { installTestEnvironment } from "./helpers/testEnvironment";

function createJsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

describe("spotifyService Web Playback helpers", () => {
  beforeEach(() => {
    installTestEnvironment();
    configureApi({
      getAccessToken: () => localStorage.getItem("auth_access_token"),
      tryRefreshTokens: async () => false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads a token for the Spotify Web Playback SDK", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "app-token");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          accessToken: "spotify-web-token",
          expiresAt: "2026-04-19T22:00:00.000Z",
          scopes: ["streaming"],
        },
      }),
    );

    const token = await spotifyService.getWebPlaybackToken();

    expect(token).toEqual({
      accessToken: "spotify-web-token",
      expiresAt: "2026-04-19T22:00:00.000Z",
      scopes: ["streaming"],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/v1/integrations/spotify/player/web-token",
      ),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("transfers playback to the browser Spotify device", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "app-token");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: null,
      }),
    );

    await spotifyService.transferPlayback("browser-device-1", true);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/integrations/spotify/player/transfer"),
      expect.objectContaining({ method: "PUT" }),
    );
    expect(JSON.parse(String(init.body))).toEqual({
      deviceId: "browser-device-1",
      play: true,
    });
  });
});
