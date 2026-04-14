import { z } from "zod"

export const schema = z.object({
  title: z.string().default("Command Center"),
  mode: z.enum(["auto", "agent"]).default("auto"),
  agentId: z.string().optional(),
  notificationTitle: z.string().default("PROMETEO"),
  notificationMessage: z.string().default("Hello from Command Center"),
})

export default schema
