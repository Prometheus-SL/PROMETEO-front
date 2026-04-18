import { z } from "zod"

export const schema = z.object({
  serverId: z.string().min(1).default(""),
})

export default schema
