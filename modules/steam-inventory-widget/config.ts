import { z } from "zod";

export const APP_ID_OPTIONS = ["730", "570", "440", "252490", "753"] as const;
export const CURRENCY_OPTIONS = ["EUR", "USD", "GBP"] as const;
export const SORT_BY_OPTIONS = [
  "priceDesc",
  "priceAsc",
  "name",
  "dateDesc",
  "dateAsc",
] as const;

export const APP_ID_LABELS: Record<(typeof APP_ID_OPTIONS)[number], string> = {
  "730": "Counter-Strike 2",
  "570": "Dota 2",
  "440": "Team Fortress 2",
  "252490": "Rust",
  "753": "Steam Community",
};

export const schema = z.object({
  title: z.string().default("Steam Inventory"),
  appId: z.enum(APP_ID_OPTIONS).default("730"),
  currency: z.enum(CURRENCY_OPTIONS).default("EUR"),
  sortBy: z.enum(SORT_BY_OPTIONS).default("priceDesc"),
  hideUnmarketable: z.boolean().default(false),
});

export default schema;
