# Module Template Example

This folder is an example starting point for authoring a module in `PROMETEO-front/modules`.

It is intentionally not framed as the only valid module structure. It is a practical example that is easy to copy, trim down, and adapt. As the platform evolves, more templates can be added for different kinds of modules.

## What This Example Includes

```text
docs/module-template/
  README.md
  module.json
  index.tsx
  config.ts
  dev.ts
  dev.mock.ts
```

## What Each File Is For

- `module.json`: the module manifest. This is required.
- `index.tsx`: the main React entry component. This is required.
- `config.ts`: an example Zod schema for module configuration.
- `dev.ts`: an example local development setup file with presets.
- `dev.mock.ts`: an example local development helper file.

The optional files are included because they represent common patterns, not because every module must keep them.

## `module.json` Fields

### Required fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique module ID. Must match the key used in the backend module registry. |
| `name` | string | Display name shown in the marketplace. |
| `description` | string | One-sentence description shown in the marketplace. |
| `category` | string | One of: `utilities`, `productivity`, `smart-home`, `media`, `social`, `development`, `entertainment`. |
| `size.width` | number | Number of dashboard grid columns (1–3). |
| `size.height` | number | Number of dashboard grid rows (1–4). |
| `entry` | string | Relative path to the module's React entry component. |
| `audience` | string | Always `"dashboard"` for standard modules. |

### Optional fields

| Field | Type | Description |
|---|---|---|
| `configSchema` | string | Relative path to a Zod schema file for the module configuration. |
| `requiredProviders` | string[] | OAuth providers that must be connected before the module works (e.g. `["google"]`, `["github"]`, `["discord"]`). |
| `requiredRole` | string \| null | Minimum user role required to add this module. `null` means any role. |
| `capabilities` | string[] | Feature tags used by the marketplace and admin UI (e.g. `["smart-home", "lights"]`). |
| `preview` | string | Relative path to a PNG screenshot shown in the marketplace. |

### `ai` block — Spark AI integration

Declare which AI actions this module exposes to the Spark assistant:

```json
"ai": {
  "actions": ["weather.current"]
}
```

Omit the block entirely if the module has nothing to expose. The `actions` array holds string action IDs; unrecognised IDs are silently ignored by the backend. See [ai-actions.md](../ai-actions.md) for the full catalogue of available action IDs, what each does, and which config fields the backend reads.

### `marketplace` block — multi-variant grouping

When a `module.json` exports more than one size variant of the same concept, use this block to group them into a single family card in the marketplace:

```json
"marketplace": {
  "familyId": "my-widget",
  "familyName": "My Widget",
  "variantLabel": "Standard",
  "variantOrder": 1
}
```

| Field | Description |
|---|---|
| `familyId` | Shared ID across all variants of this module family. |
| `familyName` | Display name for the family card. |
| `variantLabel` | Label for this specific variant (`"Standard"`, `"Compact"`, etc.). |
| `variantOrder` | Sort order within the family (1 = first). |

Omit for standalone modules that have no variants.

## How To Use This Example

1. Copy this folder into `modules/<your-module-id>/`.
2. Rename placeholder values such as `your-widget` and `YourWidget`.
3. Update `module.json` first so the manifest matches the module you want to build.
4. Replace the sample UI in `index.tsx` with your real component.
5. Keep, adapt, or delete the optional example files based on what your module actually needs.
6. Open `/dev/modules` and make sure the module behaves well in isolation.

## What You Can Remove

You can safely delete:

- `config.ts` if the module does not need configurable fields
- `dev.ts` if you do not need local presets
- `dev.mock.ts` if you do not need extra local development helpers

If you remove one of these files, also remove any references to it from `module.json` or related development configuration.

## What You Must Rename

At a minimum, update:

- the module `id`
- the module `name`
- the component name in `index.tsx`
- any placeholder labels, descriptions, and sample values

## Adapting The Structure

This example is intentionally small and friendly for first-time contributors. Real modules may grow beyond it.

Common variations include:

- multiple entries in a single `module.json`
- separate service or helper files
- richer configuration schemas
- additional local development files

Use the example as a base, not a ceiling.

## Validation Checklist

- `module.json` is valid JSON and still uses the expected array format
- required paths still point to real files
- the entry `id` and any local preset references stay aligned
- the UI fits the declared module size
- loading, empty, and error states are understandable
- placeholder copy has been replaced with real product language
- if the module exposes AI actions, each action ID exists in [ai-actions.md](../ai-actions.md) and the required config fields are present in `config.ts`
- if the module has variants, all entries share the same `marketplace.familyId`

## Related Documentation

- Contribution guide: [CONTRIBUTING.md](../../CONTRIBUTING.md)
- UI guidance: [widget-guidelines.md](../widget-guidelines.md)
- AI actions reference: [ai-actions.md](../ai-actions.md)
