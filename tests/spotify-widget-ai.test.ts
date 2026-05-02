import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SparkClientAction } from "../src/modules/ai/types";

const spotifyMocks = vi.hoisted(() => ({
  activateSpotifyWebPlaybackForSpark: vi.fn(),
  playTrack: vi.fn(),
}));

vi.mock("../modules/spotify-widget/spotify-web-playback", () => ({
  activateSpotifyWebPlaybackForSpark:
    spotifyMocks.activateSpotifyWebPlaybackForSpark,
}));

vi.mock("../modules/spotify-widget/spotify-service", () => ({
  spotifyService: {
    playTrack: spotifyMocks.playTrack,
  },
}));

import { sparkClientExecutors } from "../modules/spotify-widget/ai";

describe("spotify Spark client executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activates the web player and starts the requested track in the internal widget player", async () => {
    spotifyMocks.activateSpotifyWebPlaybackForSpark.mockResolvedValue({
      status: "active",
      deviceId: "browser-device-1",
      error: null,
      activationRequired: false,
    });
    spotifyMocks.playTrack.mockResolvedValue(undefined);

    const action: SparkClientAction = {
      id: "spotify-client-1",
      type: "spotify.play_track",
      provider: "spotify",
      payload: {
        uri: "spotify:track:track-1",
        query: "time pink floyd",
        trackId: "track-1",
        trackName: "Time",
        artistName: "Pink Floyd",
      },
    };

    const result = await sparkClientExecutors["spotify.play_track"](action);

    expect(spotifyMocks.activateSpotifyWebPlaybackForSpark).toHaveBeenCalledTimes(1);
    expect(spotifyMocks.playTrack).toHaveBeenCalledWith("spotify:track:track-1");
    expect(result).toEqual({
      id: "spotify-client-1",
      success: true,
      message: "Spotify reproduciendo Time de Pink Floyd en el reproductor interno.",
      data: {
        deviceId: "browser-device-1",
        uri: "spotify:track:track-1",
      },
    });
  });
});
