# PROMETEO Frontend – AI Coding Instructions

## Overview

- React 19 + TypeScript SPA bootstrapped by Vite 7; `src/main.tsx` mounts `App` under React StrictMode.
- Styling layers: Tailwind CSS v4 (see `src/index.css`) plus shadcn/ui primitives; reuse `cn` from `src/lib/utils.ts` for class composition.
- UI chrome provided by the custom `SidebarProvider` + `ThemeProvider`; dark mode toggles via `localStorage` key `vite-ui-theme`.

## Routing & Layout

- `src/routes.tsx` exports the route array consumed by `createBrowserRouter` in `src/router.tsx`; `handle` metadata drives navigation titles and sections.
- `AppLayout` reads `useMatches()` to feed `AppSidebar` (in `src/components/navbar/app-sidebar.tsx`) with section definitions and sets the page title for `SiteHeader`.
- `ClientLayout` renders kiosk dashboards with idle detection via `useIdle`; remember to surface critical content inside `<Outlet />` for both admin and client shells.

## State & Providers

- `AuthProvider` wraps `useAuth` (tokens in `localStorage`) and exposes `login`, `register`, `logout`, and QR flows; guard private pages with `PrivateRoute`.
- `authService` wires `configureApi` so the shared `api` client can inject tokens and refresh via `/auth/refresh`.
- `SidebarProvider` defines CSS variables (`--sidebar-width`, `--header-height`) used by shadcn sidebar components; keep it around any view that calls `useSidebar`.

## API Access

- `src/lib/api.ts` centralizes fetch logic with automatic JSON parsing, token headers, optional `FormData`, and retry-on-401; it throws `ApiError` with server messages when possible.
- Backend base URL comes from `import.meta.env.VITE_URL_BACKEND`; ensure the env var is set before hitting `/api/v1/...` endpoints.
- Add new REST calls under `src/services/` (e.g. `agents.ts`, `dashboards.ts`, `users.ts`) so UI layers never hit `api` directly.

## Modules Marketplace

- Runtime discovers modules with `import.meta.glob` in `src/modules/loader.ts`; each module lives in `/modules/<id>/` with `module.json`, `index.tsx`, optional `config.ts`, and preview asset.
- `module.json` is validated by `moduleMetaSchema` in `src/modules/validation.ts`; keep required fields (`id`, `name`, `entry`, `size`) in sync with backend expectations.
- `config.ts` should export a Zod schema (see `modules/minecraft-widget/config.ts`); the `ModuleConfigModal` builds forms from that schema for add/edit flows.
- `useMarketplaceStore` (`src/modules/store.ts`) loads module metadata, dashboards via `dashboardService`, and keeps `state.installed` in sync with server mutations.
- `GridManager` handles drag/drop layout, calling `dashboardService.updateModule` when `_id` exists; make sure custom modules expose stable `meta.id` keys for local positioning.

## Admin & Monitoring

- `pages/admin/*.tsx` compose data tables using `@tanstack/react-table`; columns are generated via helpers in `src/components/admin/**/columns.tsx`.
- `agentsService` and `usersService` adapt backend payloads (`/api/v1`) into UI-friendly shapes, handling success/error envelopes before returning to components.
- Toast notifications rely on `sonner`; mount a single `<Toaster />` (already included in layouts) and prefer `toast.error`/`toast.success` for user feedback.

## UI Patterns

- Reuse shadcn/ui wrappers in `src/components/ui/`; when adding variants, follow the `cva` pattern as seen in `button.tsx` and `sidebar.tsx`.
- Shared widgets such as `BadgeSelectable` (`src/components/common/badgeSelect.tsx`) encapsulate recurring behaviours—import them instead of duplicating badge toggles.
- Navigation avatars/buttons live in `src/components/navbar/`; `NavUser` consumes `AuthProvider`, so keep token shape compatible when extending auth features.

## Workflows

- Run `npm run dev` for local development, `npm run build` for type-checked production bundles, and `npm run lint` for ESLint flat-config checks.
- The Vite preview server (`npm run preview`) is useful to validate dynamic module loading in a production-like build.
- If module discovery fails, clear Vite’s cache (`npm run build` once) because `import.meta.glob` results are cached during dev.

## Tips

- Keep new files under `src/` using the `@/` path alias defined in `vite.config.ts`; avoid relative `../../` imports.
- When a view needs API data plus marketplace state, consume `useMarketplaceStore` once and pass the store through props (e.g. `MarketplaceList`).
- For kiosk widgets, prefer pure-presentational components that accept `{ config }`; the loader injects props exactly as `ModuleDefinition.Component` expects.
