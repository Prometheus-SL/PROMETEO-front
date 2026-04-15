import { z } from "zod"

export const schema = z.object({
  serverId: z.string().min(1).default(""),
  epicNotificationsEnabled: z.boolean().default(false),
  epicNotificationChannelId: z
    .string()
    .default("")
    .describe("channel:serverId"),
})

export default schema
