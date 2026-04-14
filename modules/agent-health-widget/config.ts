import { z } from "zod"

export const schema = z.object({
  title: z.string().default("Agent Health"),
  limit: z.number().min(1).max(12).default(4),
  pollMs: z.number().min(5000).default(15000),
})

export default schema
