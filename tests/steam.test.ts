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

  it("loads inventory summary with all query params", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          provider: { status: "connected" },
          appId: "730",
          appName: "Counter-Strike 2",
          currency: "EUR",
          totalValue: 12.5,
          totalItems: 1,
          totalItemsWithPrice: 1,
          totalItemsUnmarketable: 0,
          pricesPending: false,
          items: [],
          fetchedAt: "2026-05-04T00:00:00.000Z",
          cache: { inventory: "miss", prices: { hits: 0, misses: 1, skipped: 0 } },
        },
      }),
    );

    const summary = await steamService.getInventory({
      appId: "730",
      currency: "EUR",
      sortBy: "priceDesc",
      force: true,
    });

    expect(summary.appName).toBe("Counter-Strike 2");
    expect(summary.totalValue).toBe(12.5);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/v1/integrations/steam/inventory?appId=730&currency=EUR&sortBy=priceDesc&force=true",
      ),
      expect.any(Object),
    );
  });

  it("omits optional inventory params when not provided", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({ success: true, data: {} }),
    );

    await steamService.getInventory({ appId: "730" });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/integrations/steam/inventory?appId=730"),
      expect.any(Object),
    );
    const calledUrl = String(fetchMock.mock.calls[0]?.[0] ?? "");
    expect(calledUrl).not.toContain("currency=");
    expect(calledUrl).not.toContain("sortBy=");
    expect(calledUrl).not.toContain("force=");
  });
});
