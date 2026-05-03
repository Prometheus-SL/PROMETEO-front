import { z } from "zod";

export const schema = z.object({
  title: z.string().default("Steam Friends"),
  pollMs: z.number().min(15000).default(60000),
  maxItems: z.number().min(1).max(12).default(6),
  maxFriendsToInspect: z.number().min(10).max(500).default(200),
});

export default schema;
