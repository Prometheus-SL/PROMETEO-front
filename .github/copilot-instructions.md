# PROMETEO Frontend – AI Coding Instructions

## Overview

- **Stack**: React 19 + TypeScript SPA with Vite 7 (Node 22.19.0); `src/main.tsx` mounts `App` under StrictMode
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + shadcn/ui primitives; use `cn` from `src/lib/utils.ts` for class merging
- **Theme**: Dark mode via `next-themes` + `ThemeProvider`; stored in `localStorage` key `vite-ui-theme`
- **Path Alias**: `@/*` maps to `./src/*` (configured in `vite.config.ts` + `tsconfig.json`)

## Architecture Patterns

### Routing & Layouts

- **Routes**: `src/routes.tsx` defines route tree with `handle` metadata (titles, sections, `adminOnly` flags) consumed by `createBrowserRouter` in `src/router.tsx`
- **AppLayout**: Admin shell reading `useMatches()` to hydrate `AppSidebar` navigation; renders `<SiteHeader>` with dynamic title + `<Outlet />`
- **ClientLayout**: Kiosk mode with idle detection (`useIdle` 5min timeout → `LockLayout`); clock/date updates every second; wraps content in `SharedContextProvider`
- **PrivateRoute**: Guards protected routes by checking `accessToken` from `AuthProvider`; redirects to `/login` with `state.from` for post-auth navigation

### State Management

- **AuthProvider** (`src/providers/AuthProvider.tsx`): Global auth state exposing `{ user, accessToken, refreshToken, login, loginQR, register, logout }`; persists to `localStorage` keys: `auth_access_token`, `auth_refresh_token`, `auth_user`
- **SharedContextProvider** (`src/providers/SharedContextProvider.tsx`): Cross-widget reactive store for runtime data (e.g., Spotify auth tokens, media session); use `useSharedContext()` hook to `setShared(key, value)`, `getShared(key)`, or `subscribe(key, listener)` for live updates
- **useMarketplaceStore** (`src/modules/store.ts`): Single source of truth for module metadata, dashboard pages, and installed modules; methods: `installModule`, `removeModule`, `setModulePosition`, `setModuleConfig`, `createDashboard`, `deleteDashboard`, `activateDashboard`, `updateDashboard`

### API Layer

- **Central Client** (`src/lib/api.ts`): `api.get/post/put/patch/delete` with auto JSON parsing, token injection, FormData support, and retry-on-401 via `tryRefreshTokens`
- **Error Handling**: Throws `ApiError` with `{ status, message, details }`; extracts server messages from response body (`error`, `detail`, `title`, or `errors[0].message`)
- **Configuration**: `authService.refresh()` calls `/auth/refresh` and updates tokens; `configureApi()` in `AuthProvider` wires token retrieval
- **Services Layer** (`src/services/*.ts`): Domain-specific wrappers (`dashboardService`, `agentsService`, `usersService`, `authService`, `whatsappService`) that adapt backend `/api/v1` responses and throw on `success: false`
- **Environment**: Backend URL via `import.meta.env.VITE_URL_BACKEND`; copy `.env.example` to `.env` locally

## Module Marketplace System

### Discovery & Loading

- **Runtime Discovery**: `src/modules/loader.ts` uses `import.meta.glob` to scan `/modules/*/module.json`, `*.tsx` entries, `config.ts` schemas, and `preview.*` assets
- **Module Structure**: Each module in `/modules/<id>/` requires:
  - `module.json`: Metadata (validated by `moduleMetaSchema` in `src/modules/validation.ts`); can be single object or array of variants (e.g., `spotify-widget` has 2x1, 2x2, 3x3 variants with different `entry` files)
  - `index.tsx` (or variant entry): Default export React component typed as `ModuleDefinition["Component"]` accepting `{ config: Record<string, unknown> }`
  - `config.ts` (optional): Export Zod schema (default or named `schema`) for dynamic form generation in `ModuleConfigModal`
  - `preview.*` (optional): Asset imported via `?url` query for marketplace card
- **Variants Pattern**: See `modules/spotify-widget/module.json` for array pattern; each variant has unique `id`, `size`, and `entry` path

### Grid & State Sync

- **GridManager** (`src/modules/ui/GridManager.tsx`): 4×5 grid with drag/resize; reads `installed` prop (from marketplace store), calls `onMove(id, { x, y, w, h })` to persist positions via `dashboardService.updateModule`
- **Position Reconciliation**: Prioritizes `meta.size` (module default) over saved `position`; clamps to grid bounds; detects collisions and finds first free cell
- **Module Config Flow**: `ModuleConfigModal` auto-generates forms from Zod schemas; supports `z.string()`, `z.number()`, `z.boolean()`, `z.enum()`, and nested `z.object()`; unwraps `.default()`, `.optional()`, `.nullable()`, `.refine()` wrappers
- **Install/Remove**: `installModule(meta, config)` calls `dashboardService.addModule(pageId, { meta, config })` and updates `state.installed`; `removeModule(id)` uses `_id` for server deletion or filters locally

### Dashboard (Page) Management

- **Pages**: Multi-dashboard support via `/api/v1/dashboard/pages`; each Page has `{ _id, name, slug, description, style, active, order, modules[] }`
- **Active Page**: Only one page marked `active: true`; `activateDashboard(id)` sets active and deactivates others
- **CRUD**: `createDashboard({ name, slug?, description?, style?, active? })`, `updateDashboard(id, payload)`, `deleteDashboard(id)`
- **Reordering**: `reorderPages(items: Array<{ id, order }>)` and `reorderModules(pageId, positions: Array<{ moduleId, position }>)`

## Admin Features

- **Data Tables**: `@tanstack/react-table` in `src/components/admin/{users,agents}/data-table.tsx`; column definitions in `columns.tsx` with sort/filter/action cells
- **User Management**: CRUD via `usersService`; dialogs for edit (`user-edit-dialog.tsx`), role changes (`user-role-dialog.tsx`), password reset (`user-reset-password-dialog.tsx`)
- **Agents**: Monitor backend agents via `agentsService.list()` and `agentsService.getById(id)`
- **Toasts**: Use `sonner` lib; `<Toaster />` already mounted in layouts; prefer `toast.success("msg")` and `toast.error("msg")` for user feedback

## UI Component Conventions

- **shadcn/ui**: Primitives in `src/components/ui/` built on Radix; use `cva` for variant patterns (see `button.tsx`, `badge.tsx`, `sidebar.tsx`)
- **Composition**: Shared widgets like `BadgeSelectable` (`src/components/common/badgeSelect.tsx`) encapsulate toggle logic; reuse instead of duplicating
- **Navigation**: `AppSidebar` reads `handle` arrays from routes; `NavUser` dropdown consumes `AuthProvider`; `ClientNavbar` shows clock/logout for kiosk mode
- **Forms**: Use `src/components/ui/field.tsx` for input groups; `ModuleConfigModal` auto-generates from Zod schemas for module configs

## Development Workflows

### Commands

```bash
npm run dev          # Vite dev server (default port 5173)
npm run dev:host     # Expose to network (useful for mobile testing)
npm run build        # TypeScript check (tsc -b) + Vite production build
npm run lint         # ESLint flat config (eslint.config.js)
npm run preview      # Preview production build locally
```

### Environment Setup

1. Copy `.env.example` to `.env`
2. Set `VITE_URL_BACKEND` to backend URL (default `http://localhost:3000`)
3. For Spotify widget: add `VITE_SPOTIPY_CLIENT_ID`, `VITE_SPOTIPY_CLIENT_SECRET`, `VITE_SPOTIPY_SCOPE`

### Module Development

1. Create `/modules/<id>/module.json` with `{ id, name, size: { width, height }, entry: "./index.tsx" }`
2. Export React component from `index.tsx`: `export default function MyWidget({ config }: { config: Record<string, unknown> }) { ... }`
3. Add `config.ts` with Zod schema: `export const schema = z.object({ ... })`; defaults applied via `.default(value)`
4. Test by installing from marketplace or editing `useMarketplaceStore.installed` in dev
5. **Cache Issue**: If module not detected, run `npm run build` once to refresh `import.meta.glob` cache

### Debugging

- **Auth Issues**: Check `localStorage` for `auth_access_token`, `auth_refresh_token`, `auth_user`; token refresh happens in `api.ts` on 401 response
- **Module Loading**: Console logs in `loader.ts` show validation errors; check `module.json` against `moduleMetaSchema`
- **Grid Layout**: `GridManager` logs collision warnings; position stored as `{ x, y, w, h }` (0-indexed, cols=4, rows=5)

## Critical Patterns to Follow

- **Never import `api` directly in pages/components**; always add methods to service files in `src/services/`
- **Avoid relative imports** (`../../`); use `@/` alias for all `src/` paths
- **Module components must be pure**: Accept `{ config }` prop, no side effects in render; use `SharedContextProvider` for cross-widget state
- **Handle API errors**: Services throw `Error` on failure; wrap calls in try/catch and show `toast.error()`
- **Respect `adminOnly` routes**: Check `user.role` in `AuthProvider` before showing admin navigation or pages
- **Keep module metadata in sync**: Backend validates `module.json` structure; match `id`, `name`, `entry`, `size` fields exactly
