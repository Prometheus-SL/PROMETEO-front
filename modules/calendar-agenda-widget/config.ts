import { z } from "zod";

export const schema = z.object({
  title: z.string().default("Calendar Agenda"),
  pollMs: z.number().min(5000).default(60000),
  maxItems: z.number().min(1).max(10).default(5),
});

export default schema;
