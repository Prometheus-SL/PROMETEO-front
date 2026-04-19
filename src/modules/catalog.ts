import type { ModuleAvailability } from "./access"
import type { ModuleMeta, ModuleSize } from "./types"

export type MarketplaceFamilyStatus =
    | "ready"
    | "needs-connection"
    | "restricted"

export type MarketplaceStatusFilter = "all" | MarketplaceFamilyStatus

export type ResolvedMarketplaceMeta = {
    familyId: string
    familyName: string
    variantLabel: string
    variantOrder: number
}

export type MarketplaceVariant = ResolvedMarketplaceMeta & {
    meta: ModuleMeta
    label: string
    availability?: ModuleAvailability
    status: MarketplaceFamilyStatus
}

export type MarketplaceFamily = {
    id: string
    name: string
    category?: string
    description?: string
    providers: string[]
    capabilities: string[]
    sizes: ModuleSize[]
    status: MarketplaceFamilyStatus
    variants: MarketplaceVariant[]
}

export type MarketplaceFamilyFilters = {
    query?: string
    categories?: string[]
    providers?: string[]
    sizes?: ModuleSize[]
    status?: MarketplaceStatusFilter
}

type AvailabilityLookup =
    | Map<string, ModuleAvailability>
    | Record<string, ModuleAvailability | undefined>

export function resolveMarketplaceMeta(meta: ModuleMeta): ResolvedMarketplaceMeta {
    return {
        familyId: normalizeMarketplaceText(meta.marketplace?.familyId, meta.id),
        familyName: normalizeMarketplaceText(meta.marketplace?.familyName, meta.name),
        variantLabel: normalizeMarketplaceText(meta.marketplace?.variantLabel, "Default"),
        variantOrder: meta.marketplace?.variantOrder ?? 0,
    }
}

export function groupMarketplaceFamilies(
    modules: ModuleMeta[],
    availabilityById?: AvailabilityLookup,
): MarketplaceFamily[] {
    const grouped = new Map<string, MarketplaceVariant[]>()

    modules.forEach((meta) => {
        const resolved = resolveMarketplaceMeta(meta)
        const variant: MarketplaceVariant = {
            ...resolved,
            meta,
            label: resolved.variantLabel,
            availability: getAvailability(availabilityById, meta.id),
            status: getVariantStatus(getAvailability(availabilityById, meta.id)),
        }

        const variants = grouped.get(resolved.familyId) ?? []
        variants.push(variant)
        grouped.set(resolved.familyId, variants)
    })

    return Array.from(grouped.entries())
        .map(([id, variants]) => buildFamily(id, variants))
        .sort(sortFamilies)
}

export function filterMarketplaceFamilies(
    families: MarketplaceFamily[],
    filters: MarketplaceFamilyFilters,
): MarketplaceFamily[] {
    return families
        .map((family) => {
            const variants = family.variants.filter((variant) =>
                matchesVariant(variant, filters),
            )

            return variants.length > 0 ? buildFamily(family.id, variants) : null
        })
        .filter((family): family is MarketplaceFamily => Boolean(family))
        .sort(sortFamilies)
}

function buildFamily(id: string, variants: MarketplaceVariant[]): MarketplaceFamily {
    const sortedVariants = [...variants].sort(sortVariants)
    const first = sortedVariants[0]

    return {
        id,
        name: first.familyName,
        category: first.meta.category,
        description: first.meta.description,
        providers: uniqueSorted(
            sortedVariants.flatMap((variant) => variant.meta.requiredProviders ?? []),
        ),
        capabilities: uniqueSorted(
            sortedVariants.flatMap((variant) => variant.meta.capabilities ?? []),
        ),
        sizes: uniqueSizes(sortedVariants.map((variant) => variant.meta.size)),
        status: getFamilyStatus(sortedVariants),
        variants: sortedVariants,
    }
}

function getAvailability(
    availabilityById: AvailabilityLookup | undefined,
    moduleId: string,
) {
    if (!availabilityById) return undefined
    if (availabilityById instanceof Map) return availabilityById.get(moduleId)
    return availabilityById[moduleId]
}

function getVariantStatus(
    availability: ModuleAvailability | undefined,
): MarketplaceFamilyStatus {
    if (!availability || availability.canInstall) return "ready"
    if (availability.missingProviders.length > 0) return "needs-connection"
    return "restricted"
}

function getFamilyStatus(variants: MarketplaceVariant[]): MarketplaceFamilyStatus {
    if (variants.some((variant) => variant.status === "ready")) return "ready"
    if (variants.some((variant) => variant.status === "needs-connection")) {
        return "needs-connection"
    }
    return "restricted"
}

function matchesVariant(
    variant: MarketplaceVariant,
    filters: MarketplaceFamilyFilters,
) {
    const query = filters.query?.trim().toLowerCase()
    const categories = filters.categories ?? []
    const providers = filters.providers ?? []
    const sizes = filters.sizes ?? []
    const status = filters.status ?? "all"

    if (query && !variantSearchText(variant).includes(query)) return false
    if (categories.length > 0 && !categories.includes(variant.meta.category ?? "")) {
        return false
    }
    if (
        providers.length > 0 &&
        !providers.some((provider) =>
            (variant.meta.requiredProviders ?? []).includes(provider),
        )
    ) {
        return false
    }
    if (sizes.length > 0) {
        const variantSize = variant.meta.size
        if (!variantSize || !sizes.some((size) => isSameSize(size, variantSize))) {
            return false
        }
    }
    if (status !== "all" && variant.status !== status) return false

    return true
}

function variantSearchText(variant: MarketplaceVariant) {
    const meta = variant.meta
    return [
        variant.familyName,
        variant.variantLabel,
        meta.id,
        meta.name,
        meta.description,
        meta.category,
        ...(meta.requiredProviders ?? []),
        ...(meta.capabilities ?? []),
        meta.size ? formatSize(meta.size) : "",
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
}

function normalizeMarketplaceText(value: string | undefined, fallback: string) {
    const trimmed = value?.trim()
    return trimmed || fallback
}

function sortFamilies(a: MarketplaceFamily, b: MarketplaceFamily) {
    return a.name.localeCompare(b.name)
}

function sortVariants(a: MarketplaceVariant, b: MarketplaceVariant) {
    if (a.variantOrder !== b.variantOrder) {
        return a.variantOrder - b.variantOrder
    }
    return a.variantLabel.localeCompare(b.variantLabel)
}

function uniqueSorted(values: string[]) {
    return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
    )
}

function uniqueSizes(sizes: Array<ModuleSize | undefined>) {
    const byKey = new Map<string, ModuleSize>()
    sizes.forEach((size) => {
        if (!size) return
        byKey.set(formatSize(size), size)
    })
    return Array.from(byKey.values()).sort(
        (a, b) => a.width - b.width || a.height - b.height,
    )
}

function formatSize(size: ModuleSize) {
    return `${size.width}x${size.height}`
}

function isSameSize(a: ModuleSize, b: ModuleSize) {
    return a.width === b.width && a.height === b.height
}
