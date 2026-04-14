import { z } from "zod"

export const schema = z.object({
  title: z.string().default("Notifications Feed"),
  limit: z.number().min(3).max(20).default(8),
  pollMs: z.number().min(5000).default(15000),
})

export default schema
