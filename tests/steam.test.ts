import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { steamService } from "../src/services/steam";
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

describe("steamService", () => {
  beforeEach(() => {
    installTestEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads friends presence with query options", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          provider: { status: "connected" },
          profile: { steamId: "76561198000000001" },
          friends: [
            {
              steamId: "76561198000000002",
              personaName: "Playing Friend",
              personaState: 1,
              personaStateLabel: "online",
              avatarUrl: null,
              profileUrl: null,
              game: { appId: "730", name: "Counter-Strike 2" },
            },
          ],
          onlineCount: 1,
          playingCount: 1,
          totalFriends: 20,
          inspectedCount: 20,
        },
      }),
    );

    const presence = await steamService.getFriendsPresence({
      limit: 4,
      maxFriendsToInspect: 50,
    });

    expect(presence.playingCount).toBe(1);
    expect(presence.friends[0]?.game?.name).toBe("Counter-Strike 2");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/v1/integrations/steam/friends?limit=4&maxFriendsToInspect=50",
      ),
      expect.any(Object),
    );
  });

  it("loads Steam deals for a store country and language", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          country: "ES",
          language: "spanish",
          deals: [
            {
              appId: 1091500,
              name: "Cyberpunk 2077",
              discountPercent: 65,
              originalPrice: 5999,
              finalPrice: 2099,
              currency: "EUR",
              image: "https://cdn/header.jpg",
              largeImage: "https://cdn/capsule.jpg",
              url: "https://store.steampowered.com/app/1091500",
              platforms: { windows: true, mac: true, linux: false },
            },
          ],
        },
      }),
    );

    const deals = await steamService.getDeals({
      country: "ES",
      language: "spanish",
      limit: 6,
    });

    expect(deals.deals[0]?.discountPercent).toBe(65);
    expect(deals.deals[0]?.currency).toBe("EUR");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/v1/integrations/steam/deals?country=ES&language=spanish&limit=6",
      ),
      expect.any(Object),
    );
  });
});
