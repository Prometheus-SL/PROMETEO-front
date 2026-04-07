import { z } from "zod"

export const schema = z.object({
    apiToken: z.string().min(1, "LIFX API token es obligatorio"),
    refreshInterval: z.number().min(1).max(60).default(5),
    groupFilter: z.string().optional().default(""),
})

export default schema
