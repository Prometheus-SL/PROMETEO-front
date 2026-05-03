import { z } from "zod";

export const schema = z.object({
  title: z.string().default("Steam Deals"),
  country: z.string().min(2).max(2).default("ES"),
  language: z.string().min(2).max(32).default("spanish"),
  pollMs: z.number().min(300000).default(1800000),
  maxDeals: z.number().min(1).max(12).default(5),
});

export default schema;
