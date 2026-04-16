import { z } from "zod";

export const schema = z.object({
  title: z.string().default("Creator Status"),
  pollMs: z.number().min(5000).default(30000),
});

export default schema;
