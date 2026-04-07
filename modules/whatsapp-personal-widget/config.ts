import { z } from "zod"

export const schema = z.object({
    limit: z.number().int().min(3).max(20).default(8),
    refreshSeconds: z.number().int().min(10).max(180).default(30),
    includeGroups: z.boolean().default(false),
    messagesLimit: z.number().int().min(10).max(200).default(40),
})

export default schema
