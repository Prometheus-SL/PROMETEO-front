import { z } from "zod"

// Esquema de configuración para el card "Spark"
export const schema = z.object({
    name: z.string().default("Spark"),
    color: z.string().default("#facc15").refine((val) => /^#[0-9A-F]{6}$/i.test(val), {
        message: "Must be a valid hex color (ej. #ff0000)",
    }),
    mood: z.enum(["happy", "sleepy", "angry", "surprised"]).default("happy"),
    accessory: z.enum(["none", "glasses", "crown", "antenna", "batman", "trescreus"]).default("none"),
    autoMood: z.boolean().optional().default(true),
})

export default schema
