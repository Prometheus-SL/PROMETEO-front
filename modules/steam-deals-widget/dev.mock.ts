import { http } from "msw";
import { z } from "zod";

import {
  createModuleDevBackendUrl,
  createModuleDevSuccessResponse,
  createMswModuleDevMockAdapter,
} from "@/dev/modules";
import type { SteamDealsSummary } from "@/services/steam";

const steamDealSchema = z.object({
  appId: z.number(),
  name: z.string(),
  discountPercent: z.number(),
  originalPrice: z.number().nullable().default(null),
  finalPrice: z.number().nullable().default(null),
  currency: z.string().nullable().default("EUR"),
  image: z.string().nullable().default(null),
  largeImage: z.string().nullable().default(null),
  url: z.string(),
  discountExpiration: z.string().nullable().default(null),
  platforms: z.object({
    windows: z.boolean().default(true),
    mac: z.boolean().default(false),
    linux: z.boolean().default(false),
  }),
});

const steamDealsMockStateSchema = z.object({
  country: z.string().default("ES"),
  language: z.string().default("spanish"),
  deals: z
    .array(steamDealSchema)
    .default([
      {
        appId: 1091500,
        name: "Cyberpunk 2077",
        discountPercent: 65,
        originalPrice: 5999,
        finalPrice: 2099,
        currency: "EUR",
        image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg",
        largeImage: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/capsule_616x353.jpg",
        url: "https://store.steampowered.com/app/1091500",
        discountExpiration: "2026-05-04T12:00:00.000Z",
        platforms: { windows: true, mac: true, linux: false },
      },
      {
        appId: 1245620,
        name: "ELDEN RING",
        discountPercent: 40,
        originalPrice: 5999,
        finalPrice: 3599,
        currency: "EUR",
        image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg",
        largeImage: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/capsule_616x353.jpg",
        url: "https://store.steampowered.com/app/1245620",
        discountExpiration: "2026-05-04T12:00:00.000Z",
        platforms: { windows: true, mac: false, linux: false },
      },
    ]),
});

type SteamDealsMockState = z.infer<typeof steamDealsMockStateSchema>;

function buildHandlers(state: SteamDealsMockState) {
  const summary: SteamDealsSummary = {
    country: state.country,
    language: state.language,
    generatedAt: "2026-05-03T12:00:00.000Z",
    deals: state.deals,
  };

  return [
    http.get(createModuleDevBackendUrl("/api/v1/integrations/steam/deals"), () =>
      createModuleDevSuccessResponse(summary),
    ),
  ];
}

const adapter = createMswModuleDevMockAdapter<SteamDealsMockState>({
  stateSchema: steamDealsMockStateSchema,
  buildHandlers,
});

export default adapter;
