import { z } from "zod"

export const schema = z.object({
  title: z.string().default("Action Center"),
  maxActions: z.number().min(3).max(20).default(8),
  showWidgetIds: z.boolean().default(true),
})

export default schema
