import { z } from "zod";

export const schema = z.object({
  title: z.string().default("GitHub Pulse"),
  pollMs: z.number().min(5000).default(60000),
  maxItems: z.number().min(1).max(8).default(4),
});

export default schema;
