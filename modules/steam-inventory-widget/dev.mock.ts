import { http } from "msw";
import { z } from "zod";

import {
  createModuleDevBackendUrl,
  createModuleDevSuccessResponse,
  createMswModuleDevMockAdapter,
} from "@/dev/modules";
import type { SteamInventoryItem, SteamInventorySummary } from "@/services/steam";

const steamInventoryItemSchema = z.object({
  id: z.string(),
  marketHashName: z.string(),
  name: z.string(),
  marketName: z.string(),
  iconUrl: z.string().nullable().default(null),
  iconUrlLarge: z.string().nullable().default(null),
  type: z.string().nullable().default("Rifle"),
  rarityColor: z.string().nullable().default("#eb4b4b"),
  marketable: z.boolean().default(true),
  tradable: z.boolean().default(true),
  quantity: z.number().default(1),
  tags: z
    .array(z.object({ category: z.string(), name: z.string(), color: z.string().nullable().default(null) }))
    .default([]),
  descriptions: z
    .array(z.object({ value: z.string(), color: z.string().nullable().default(null), type: z.string().nullable().default(null) }))
    .default([]),
  marketUrl: z.string(),
  price: z
    .object({
      lowest: z.number(),
      median: z.number().nullable().default(null),
      volume: z.number().nullable().default(null),
      currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
      fetchedAt: z.string(),
    })
    .nullable()
    .default(null),
});

const steamInventoryMockStateSchema = z.object({
  appId: z.string().default("730"),
  appName: z.string().default("Counter-Strike 2"),
  currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
  items: z
    .array(steamInventoryItemSchema)
    .default([
      {
        id: "item-1",
        marketHashName: "AK-47 | Redline (Field-Tested)",
        name: "AK-47 | Redline",
        marketName: "AK-47 | Redline (Field-Tested)",
        iconUrl: null,
        iconUrlLarge: null,
        type: "Rifle",
        rarityColor: "#d32ce6",
        marketable: true,
        tradable: true,
        quantity: 1,
        tags: [],
        descriptions: [],
        marketUrl: "https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Redline%20%28Field-Tested%29",
        price: {
          lowest: 14.50,
          median: 15.20,
          volume: 312,
          currency: "EUR",
          fetchedAt: "2026-05-04T00:00:00.000Z",
        },
      },
      {
        id: "item-2",
        marketHashName: "AWP | Asiimov (Field-Tested)",
        name: "AWP | Asiimov",
        marketName: "AWP | Asiimov (Field-Tested)",
        iconUrl: null,
        iconUrlLarge: null,
        type: "Sniper Rifle",
        rarityColor: "#d32ce6",
        marketable: true,
        tradable: true,
        quantity: 1,
        tags: [],
        descriptions: [],
        marketUrl: "https://steamcommunity.com/market/listings/730/AWP%20%7C%20Asiimov%20%28Field-Tested%29",
        price: {
          lowest: 42.80,
          median: 44.10,
          volume: 178,
          currency: "EUR",
          fetchedAt: "2026-05-04T00:00:00.000Z",
        },
      },
      {
        id: "item-3",
        marketHashName: "Glove Case",
        name: "Glove Case",
        marketName: "Glove Case",
        iconUrl: null,
        iconUrlLarge: null,
        type: "Base Grade Container",
        rarityColor: "#b0c3d9",
        marketable: true,
        tradable: true,
        quantity: 3,
        tags: [],
        descriptions: [],
        marketUrl: "https://steamcommunity.com/market/listings/730/Glove%20Case",
        price: {
          lowest: 0.85,
          median: 0.88,
          volume: 4200,
          currency: "EUR",
          fetchedAt: "2026-05-04T00:00:00.000Z",
        },
      },
      {
        id: "730_C_LOCKED_I_LOCKED",
        marketHashName: "Souvenir Sticker | Mock Tournament",
        name: "Souvenir Sticker | Mock Tournament",
        marketName: "Souvenir Sticker | Mock Tournament",
        iconUrl: null,
        iconUrlLarge: null,
        type: "High Grade Sticker",
        rarityColor: "#4b69ff",
        marketable: false,
        tradable: false,
        quantity: 1,
        tags: [{ category: "Type", name: "High Grade Sticker", color: null }],
        descriptions: [],
        marketUrl: "https://steamcommunity.com/market/listings/730/Souvenir%20Sticker%20%7C%20Mock%20Tournament",
        price: null,
      },
    ]),
});

type SteamInventoryMockState = z.infer<typeof steamInventoryMockStateSchema>;

function buildHandlers(state: SteamInventoryMockState) {
  const items = state.items as SteamInventoryItem[];
  const totalValue = items.reduce((sum, item) => sum + (item.price?.lowest ?? 0) * item.quantity, 0);

  const summary: SteamInventorySummary = {
    provider: { status: "connected" },
    appId: state.appId,
    appName: state.appName,
    currency: state.currency,
    totalValue,
    totalItems: items.length,
    totalItemsWithPrice: items.filter((item) => item.price !== null).length,
    totalItemsUnmarketable: items.filter((item) => !item.marketable).length,
    pricesPending: false,
    items,
    fetchedAt: "2026-05-04T00:00:00.000Z",
    cache: {
      inventory: "hit",
      prices: { hits: items.length, misses: 0, skipped: 0 },
    },
  };

  return [
    http.get(createModuleDevBackendUrl("/api/v1/integrations/steam/inventory"), () =>
      createModuleDevSuccessResponse(summary),
    ),
  ];
}

const adapter = createMswModuleDevMockAdapter<SteamInventoryMockState>({
  stateSchema: steamInventoryMockStateSchema,
  buildHandlers,
});

export default adapter;
