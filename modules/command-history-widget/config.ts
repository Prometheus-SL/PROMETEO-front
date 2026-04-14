import { z } from "zod"

export const schema = z.object({
  title: z.string().default("Command History"),
  mode: z.enum(["auto", "agent"]).default("auto"),
  agentId: z.string().optional(),
  limit: z.number().min(3).max(20).default(8),
  status: z.string().optional(),
})

export default schema
