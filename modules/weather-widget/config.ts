import { z } from "zod"

// Schema de configuración simple para el widget del tiempo
export const schema = z.object({
    city: z.string().min(1).default("Madrid"),
    units: z.enum(["metric", "imperial"]).default("metric"),
    apiKey: z.string().min(1),
    language: z.enum(["es", "en", "fr", "de"]).default("es"),
})

export default schema
