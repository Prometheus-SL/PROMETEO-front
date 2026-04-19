import { z } from "zod"

// Esquema de configuración para el card "Spark"
export const schema = z.object({
    name: z.string().default("Spark"),
    color: z.string().default("#facc15").refine((val) => /^#[0-9A-F]{6}$/i.test(val), {
        message: "Must be a valid hex color (ej. #ff0000)",
    }),
    mood: z.enum(["happy", "sleepy", "angry", "surprised"]).default("happy"),
    accessory: z.enum(["none", "glasses", "crown", "antenna", "batman", "spiderman", "trescreus"]).default("none"),
    autoMood: z.boolean().optional().default(true),
    pooEnabled: z.boolean().default(true),
    pooMinDelayMs: z.number().min(10000).max(300000).default(45000),
    pooMaxDelayMs: z.number().min(10000).max(300000).default(90000),
    pooMaxCount: z.number().int().min(1).max(8).default(3),
    inactivityMs: z.number().min(5000).max(120000).default(20000),
    inactivityStepMs: z.number().min(5000).max(120000).default(20000),
})

export default schema
