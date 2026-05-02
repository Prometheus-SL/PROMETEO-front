import { z } from "zod"
import type { ModuleMeta } from "./types"

const moduleAudienceSchema = z.enum(["all", "dashboard", "client", "ops"])
const moduleRoleSchema = z.enum(["viewer", "user", "operator", "admin"])
const moduleMarketplaceSchema = z.object({
    familyId: z.string().min(1).optional(),
    familyName: z.string().min(1).optional(),
    variantLabel: z.string().min(1).optional(),
    variantOrder: z.number().optional(),
}).optional()
const moduleAiSchema = z.object({
    actions: z.array(z.string().min(1)).default([]),
}).optional()

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
    audience: moduleAudienceSchema.default("dashboard"),
    requiredProviders: z.array(z.string().min(1)).default([]),
    requiredRole: moduleRoleSchema.nullable().default(null),
    capabilities: z.array(z.string().min(1)).default([]),
    marketplace: moduleMarketplaceSchema,
    ai: moduleAiSchema,
})

export type ModuleMetaValidated = z.infer<typeof moduleMetaSchema> & ModuleMeta

export function validateModuleMeta(json: unknown): ModuleMetaValidated {
    const parsed = moduleMetaSchema.safeParse(json)
    if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        throw new Error(`module.json invalido: ${message}`)
    }
    return parsed.data
}

// Helper para validar configuraciones basadas en Zod (cuando un modulo exporta un schema Zod)
export function validateConfigWithSchema<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
    const parsed = schema.safeParse(data)
    if (!parsed.success) {
        const message = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        throw new Error(`Configuracion invalida: ${message}`)
    }
    return parsed.data
}
