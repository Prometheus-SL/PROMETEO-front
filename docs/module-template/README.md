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

## Related Documentation

- Contribution guide: [CONTRIBUTING.md](../../CONTRIBUTING.md)
- UI guidance: [widget-guidelines.md](../widget-guidelines.md)
