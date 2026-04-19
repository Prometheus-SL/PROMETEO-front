# PROMETEO Frontend

The frontend is a React + TypeScript + Vite application that powers the PROMETEO dashboard, module runtime, and development surfaces.

## Requirements

- Node.js `^22.19.0`
- npm

## Getting Started

```bash
npm install
npm run dev
```

The app starts with Vite. For a LAN-accessible dev server, use:

```bash
npm run dev:host
```

## Common Commands

```bash
npm run dev
npm run build
npm run test
npm run lint
```

## Project Areas

- `src/`: application shell, routes, shared UI, services, and runtime code
- `modules/`: marketplace modules and shared module utilities
- `docs/`: authoring notes, templates, and UI guidance

## Module Authoring

Modules live in `modules/<module-id>/`.

The fastest way to start a new module is to copy the example template in:

- [docs/module-template/README.md](./docs/module-template/README.md)

That template is intentionally presented as one example starting point, not the only valid long-term structure. As the module ecosystem grows, additional examples and more specialized templates can be added alongside it.

For contribution guidance, see:

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [docs/widget-guidelines.md](./docs/widget-guidelines.md)

## Development Notes

- Use `/dev/modules` to preview modules in isolation while iterating on configuration, layout, and local development behavior.
- Keep module UI compact and dashboard-aware. The current visual guidance lives in [`docs/widget-guidelines.md`](./docs/widget-guidelines.md).

## Desktop Shell

The repository also includes a desktop shell workspace. Useful commands:

```bash
npm run desktop:start
npm run desktop:dev
```
