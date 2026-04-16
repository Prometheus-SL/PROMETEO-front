# Storybook For PROMETEO Modules Design

## Goal

Add Storybook to `PROMETEO-front` so the team can preview and exercise all widgets in `modules/*` quickly and visually, without depending on the live backend for basic rendering. Also expose Storybook's MCP server so agents can inspect documented UI states and stories directly from the project.

## Current Context

`PROMETEO-front` is a `React + Vite + TypeScript` application with a widget system centered on:

- `modules/*/module.json` for metadata
- `modules/*/index*.tsx` for widget entry points
- `src/modules/loader.ts` for dynamic module discovery
- `src/modules/ui/WidgetShell.tsx` and `modules/_shared/prometeo-widget-kit.tsx` for shared widget UI patterns

The widget surface is already strongly componentized, but many modules depend on one or more of the following:

- `ThemeProvider`
- `SharedContextProvider`
- router context
- toast rendering via `sonner`
- remote APIs through `fetch` or service wrappers
- runtime config that may be absent in local preview mode

This means Storybook should not be configured as a plain component catalog. It needs a widget-aware preview environment that can render modules in realistic dashboard conditions and can degrade gracefully when a widget has no live data source.

## Approaches Considered

### 1. Manual story file per module

Create one or more `.stories.tsx` files inside every widget folder and hand-author scenarios individually.

Pros:

- Excellent long-term documentation quality
- Fine-grained control per widget
- Clear ownership of scenarios

Cons:

- Too much upfront authoring for the current number of modules
- High maintenance cost as widgets grow
- Slower path to universal coverage

### 2. Central module registry plus widget sandbox

Build Storybook around a central module preview system that discovers `modules/*`, renders each widget inside a dashboard-like shell, and optionally consumes per-module Storybook metadata when available.

Pros:

- Covers all modules quickly
- Reuses the existing module system instead of inventing a second catalog
- Lets the project start broad and deepen scenario quality over time

Cons:

- Requires a little infrastructure up front
- Some widgets will initially show fallback or unconfigured states until richer fixtures are added

### 3. Gallery only

Create only one large Storybook gallery page that renders all modules and stop there.

Pros:

- Fastest setup

Cons:

- Weak for focused testing
- Poor for debugging one module at a time
- Harder to attach rich scenarios and controls later

## Recommendation

Use approach 2.

This gives the best balance for PROMETEO: immediate coverage of all `modules/*`, a clear path to richer scenarios where needed, and a Storybook structure that matches the app's real module architecture.

## Proposed Design

### Storybook Foundation

Install Storybook with the React Vite framework and keep it inside `PROMETEO-front`.

The base configuration should:

- use the Vite builder so aliases and TS setup match the app
- load `src/index.css` so widgets render with the same global styles
- include `public/` as a static dir
- include standard Storybook addons for controls, docs, and accessibility
- include `@storybook/addon-mcp`

The Storybook Vite config should merge in the same alias behavior used by the app, especially for `@/`.

### Widget-Aware Preview Environment

Storybook should provide the same runtime wrappers that widgets expect in the app:

- `ThemeProvider`
- `SharedContextProvider`
- `MemoryRouter`
- global `Toaster`

These should live in `.storybook/preview.tsx` so every story gets a stable baseline environment.

This makes the common widget dependencies available without forcing each story to wire them manually.

### Module Sandbox Layer

Create a small Storybook-only module sandbox that sits between Storybook and the actual widget components.

Its responsibilities:

- discover available modules from `modules/*`
- load the selected module definition
- provide a realistic widget frame and size
- pass config data to the widget
- seed optional shared-context data
- catch rendering failures and show a readable error state instead of crashing the whole story

This sandbox becomes the canonical Storybook entry point for widgets.

### Coverage Model For All `modules/*`

Every module should appear in Storybook from day one.

To achieve that without hand-writing every story:

- create a central gallery story that renders every discovered module
- create a focused playground story that renders one selected module at a time
- default any module without custom fixtures to a fallback scenario based on its `module.json`

Fallback behavior:

- use empty config `{}` by default
- use the size declared in `module.json`, or a safe default if absent
- render the module's own unconfigured, loading, empty, or default state if that is what the widget does

This ensures broad visibility immediately while still allowing richer module-specific scenarios later.

### Optional Per-Module Storybook Metadata

Some widgets need more than empty config. For those, add an optional per-module metadata file such as:

`modules/<module-id>/storybook.ts`

This file should be lightweight and Storybook-specific. It can define:

- default config
- named scenarios
- seeded shared-context values
- MSW handlers
- preferred viewport or widget size overrides

Example shape:

```ts
export type ModuleStorybookDefinition = {
  defaultConfig?: Record<string, unknown>;
  scenarios?: Array<{
    id: string;
    name: string;
    config?: Record<string, unknown>;
    shared?: Record<string, unknown>;
    mswHandlers?: unknown[];
  }>;
};
```

This is optional by design:

- modules without this file still render through the fallback flow
- modules with stronger data needs can progressively add high-value scenarios

### Story Structure

The initial Storybook structure should focus on two high-value entry points.

#### `Modules/Gallery`

Shows all discovered modules in a scannable grid using realistic widget sizing.

Purpose:

- quick visual sweep
- layout sanity check
- smoke test for rendering coverage

#### `Modules/Playground`

Renders a single selected module with controls for:

- module id
- scenario
- theme
- widget surface size if relevant

Purpose:

- focused development
- debugging one widget at a time
- easier iteration on config-heavy modules

### Data Mocking Strategy

A large part of successful widget coverage is mocking the runtime environment well enough that modules can mount without talking to the live backend.

Use MSW for network interception in Storybook.

Global setup should:

- install `msw` and `msw-storybook-addon`
- generate the service worker into `public/`
- initialize MSW in `.storybook/preview.tsx`

Mocking rules:

- widgets that hit backend services should receive scenario-specific handlers
- widgets with no custom handlers may still render their own empty or unconfigured states
- polling widgets should never require a real backend just to preview their shell

Shared context rules:

- widgets that consume `SharedContext` should be able to receive seeded values from the sandbox
- widgets that publish actions should be able to mount without errors even when no other widget is active

This combination gives the project a reliable baseline and keeps Storybook useful even for data-driven modules.

### MCP Integration

Storybook's MCP capability should be enabled through `@storybook/addon-mcp`.

When Storybook is running, the MCP endpoint will be available at:

`http://localhost:6006/mcp`

The MCP server should be registered for the project scope, not globally, so it only applies when working inside this repo.

Preferred setup path:

- run Storybook MCP addon inside the project
- register the MCP server using Storybook's recommended `mcp-add --scope project` flow

This keeps the configuration aligned with Storybook's official workflow and avoids baking a hardcoded global agent dependency into unrelated repos.

### Agent Instructions

Add a small project-level `AGENTS.md` instruction for UI work so agents know to consult the Storybook MCP server before making assumptions about documented widget states or stories.

This should be specific to component and widget work, not a general instruction for every backend task.

### Error Handling

Storybook infrastructure must fail softly.

Expected failure modes:

- module entry missing or invalid
- widget throws during mount
- no config supplied
- scenario metadata missing
- mocked request not defined

Desired behavior:

- the gallery should continue rendering other modules
- the failing module should display an explicit error card with the module id and error message
- missing metadata should fall back, not break the story catalog

### Testing And Verification

The Storybook integration is complete only when all of the following are true:

- `npm run storybook` starts correctly in `PROMETEO-front`
- `npm run build-storybook` succeeds
- the gallery renders all discovered `modules/*`
- modules with no fixtures still appear through fallback behavior
- modules with remote data can be previewed through MSW-backed scenarios
- the MCP endpoint responds while Storybook is running

### Out Of Scope

This design does not include:

- writing exhaustive hand-authored documentation pages for every widget immediately
- refactoring every module to remove all runtime side effects
- introducing a full visual regression pipeline in the same step
- backend API redesign for Storybook convenience

Those can come later once the baseline visual workflow is in place.

### Risks And Tradeoffs

#### Broad coverage first means uneven richness

All modules will be visible quickly, but not every module will have rich mock data on day one.

This is acceptable because visibility across all `modules/*` is the user's primary goal.

#### Some widgets may need Storybook-specific fixture authoring

Modules with polling, service orchestration, or cross-widget interaction will benefit from dedicated `storybook.ts` metadata over time.

This is intentional and scales better than forcing full manual stories up front.

#### Project-scoped MCP depends on the Storybook dev server

The MCP server only exists while Storybook is running. That is fine, but the team should treat it as a live project tool, not a permanent global service.

## Final Design Decision

PROMETEO should add Storybook as a widget-focused preview system centered on `modules/*`, using:

- Storybook React Vite
- a central module sandbox
- a gallery plus a single-module playground
- fallback coverage for all discovered modules
- optional per-module Storybook metadata for richer scenarios
- MSW for backend-independent previews
- Storybook's MCP addon registered at project scope

This gives the fastest path to full module visibility while keeping the system maintainable as the widget library grows.
