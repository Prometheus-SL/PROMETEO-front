import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SteamDealsView } from "../modules/steam-deals-widget/index";
import { SteamFriendsView } from "../modules/steam-friends-widget/index";
import type {
  SteamDealsSummary,
  SteamFriendsPresence,
} from "../src/services/steam";

function createPresence(): SteamFriendsPresence {
  return {
    provider: { status: "connected" },
    profile: { steamId: "76561198000000001", personaName: "Prometeo" },
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
      {
        steamId: "76561198000000003",
        personaName: "Away Friend",
        personaState: 3,
        personaStateLabel: "away",
        avatarUrl: null,
        profileUrl: null,
        game: null,
      },
    ],
    onlineCount: 2,
    playingCount: 1,
    totalFriends: 42,
    inspectedCount: 42,
  };
}

function createDeals(): SteamDealsSummary {
  return {
    country: "ES",
    language: "spanish",
    generatedAt: "2026-05-03T12:00:00.000Z",
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
        discountExpiration: "2026-05-04T12:00:00.000Z",
        platforms: { windows: true, mac: true, linux: false },
      },
    ],
  };
}

describe("Steam widgets", () => {
  it("renders connected friends and the game they are playing", () => {
    const html = renderToStaticMarkup(
      <SteamFriendsView
        title="Steam Friends"
        presence={createPresence()}
        loading={false}
        error={null}
        maxItems={4}
      />,
    );

    expect(html).toContain("Playing Friend");
    expect(html).toContain("Counter-Strike 2");
    expect(html).toContain("1 playing");
    expect(html).not.toContain("Offline");
  });

  it("renders Steam deals with discount and formatted prices", () => {
    const html = renderToStaticMarkup(
      <SteamDealsView
        title="Steam Deals"
        summary={createDeals()}
        loading={false}
        error={null}
        maxDeals={4}
      />,
    );

    expect(html).toContain("Cyberpunk 2077");
    expect(html).toContain("-65%");
    expect(html).toContain("20,99");
    expect(html).toContain("59,99");
  });
});
