# Contributing Modules

The easiest way to start a new module is to copy the example template in:

- [docs/module-template/README.md](./docs/module-template/README.md)

That template is a reference example, not a rigid rule. It shows a practical starting structure for a module today, while leaving room for future templates and different module shapes as the system grows.

## Recommended Workflow

1. Copy `docs/module-template/` to `modules/<your-module-id>/`.
2. Replace `your-widget` and `YourWidget` with your real module name.
3. Keep the required files in place.
4. Remove any optional example files your module does not need.
5. Open `/dev/modules` and validate the module before integrating it further.

## Required Files

- `module.json`
- `index.tsx`

## Common Optional Files

The example template also includes optional files that are often useful:

- `config.ts`
- `dev.ts`
- `dev.mock.ts`
- `preview.png`

You do not need every file for every module. Treat them as examples of common authoring patterns, not mandatory pieces of every implementation.

## Authoring Expectations

- Use TypeScript.
- Export the main React component as the default export from the entry file.
- Keep the main component driven by `config` rather than hidden hardcoded assumptions.
- Make the declared module size match the actual UI density.
- Prefer small, understandable files over clever abstractions.

## Manifest Notes

- `module.json` uses an array format, even when the module only defines a single entry.
- If you include `dev.ts`, each preset `entryId` should match an entry `id` in `module.json`.
- If you include `config.ts`, keep `configSchema` in `module.json` aligned with the file path.

## Design Guidance

For visual, interaction, and sizing guidance, see:

- [docs/widget-guidelines.md](./docs/widget-guidelines.md)
