import { z } from "zod"
import type { ModuleMeta } from "./types"

// Esquema Zod para module.json
export const moduleMetaSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    category: z.string().optional(),
    size: z.object({
        width: z.number().min(1),
        height: z.number().min(1),
    }),
    entry: z.string().min(1),
    configSchema: z.string().optional(),
    preview: z.string().optional(),
})

export type ModuleMetaValidated = z.infer<typeof moduleMetaSchema> & ModuleMeta

export function validateModuleMeta(json: unknown): ModuleMeta {
    const parsed = moduleMetaSchema.safeParse(json)
    if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        throw new Error(`module.json inválido: ${message}`)
    }
    return parsed.data
}

// Helper para validar configuraciones basadas en Zod (cuando un módulo exporta un schema Zod)
export function validateConfigWithSchema<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
    const parsed = schema.safeParse(data)
    if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        throw new Error(`Configuración inválida: ${message}`)
    }
    return parsed.data
}
