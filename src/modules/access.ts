import type { ModuleAudience, ModuleMeta, ModuleRole } from "./types"

export type ModuleSurface = "dashboard" | "client"

type LinkedProviderLike = {
    status?: string | null
} | null | undefined

export type ModuleAvailabilityOptions = {
    surface: ModuleSurface
    role?: string | null
    linkedProviders?: Record<string, LinkedProviderLike>
}

export type ModuleAvailability = {
    audience: ModuleAudience
    missingProviders: string[]
    hasRequiredRole: boolean
    isVisibleOnSurface: boolean
    canInstall: boolean
}

const ROLE_RANK: Record<ModuleRole, number> = {
    viewer: 0,
    user: 1,
    operator: 2,
    admin: 3,
}

function resolveAudience(meta: ModuleMeta): ModuleAudience {
    return meta.audience ?? "dashboard"
}

function resolveRequiredProviders(meta: ModuleMeta): string[] {
    return meta.requiredProviders ?? []
}

function resolveRequiredRole(meta: ModuleMeta): ModuleRole | null {
    return meta.requiredRole ?? null
}

function normalizeRole(role?: string | null): ModuleRole {
    if (role === "admin" || role === "operator" || role === "user" || role === "viewer") {
        return role
    }

    return "viewer"
}

export function isModuleVisibleOnSurface(meta: ModuleMeta, surface: ModuleSurface): boolean {
    const audience = resolveAudience(meta)

    if (surface === "client") {
        return audience === "all" || audience === "dashboard" || audience === "client"
    }

    return true
}

export function getModuleAvailability(meta: ModuleMeta, options: ModuleAvailabilityOptions): ModuleAvailability {
    const audience = resolveAudience(meta)
    const linkedProviders = options.linkedProviders ?? {}
    const requiredProviders = resolveRequiredProviders(meta)
    const requiredRole = resolveRequiredRole(meta)
    const currentRole = normalizeRole(options.role)
    const isVisibleOnSurface = isModuleVisibleOnSurface(meta, options.surface)
    const missingProviders = requiredProviders.filter((providerId) => {
        const provider = linkedProviders[providerId]
        return provider?.status !== "connected"
    })
    const hasRequiredRole = requiredRole === null || ROLE_RANK[currentRole] >= ROLE_RANK[requiredRole]

    return {
        audience,
        missingProviders,
        hasRequiredRole,
        isVisibleOnSurface,
        canInstall: isVisibleOnSurface && hasRequiredRole && missingProviders.length === 0,
    }
}
