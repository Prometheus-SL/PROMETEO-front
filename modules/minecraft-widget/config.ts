import { z } from "zod"

// Schema de configuración simple para el widget del tiempo
export const schema = z.object({
    ipAddress: z.string().min(3).max(45).default("play.example.com"),
    port: z.string().optional(),
    name: z.string().optional(),
    refreshSecs: z.number().min(10).max(3600).default(600),
})

export default schema
