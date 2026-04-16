import { z } from "zod";

export const schema = z.object({
  title: z.string().default("Focus Mode"),
  pollMs: z.number().min(5000).default(60000),
  maxActions: z.number().min(1).max(8).default(4),
});

export default schema;
