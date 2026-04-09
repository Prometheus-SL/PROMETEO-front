# Widget UI Guidelines

## Goal

Widgets in `PROMETEO-front/modules` should feel like one product family:

- Mobile-first
- Compact and touch-friendly
- Based on `shadcn` primitives
- Consistent before decorative

Use [`WidgetShell`](../src/modules/ui/WidgetShell.tsx) as the default frame for new modules.

## Preferred Building Blocks

Default to these `shadcn` components first:

- `Card` via `WidgetShell`
- `Button`
- `Badge`
- `Progress`
- `Slider`
- `Select`
- `ScrollArea`
- `Sheet` or `Dialog`
- `Skeleton`

Only add custom visuals when they support recognition without harming readability.

## Size Rules

The client dashboard grid maxes out at `984 x 494.396` with a `4 x 5` layout:

- Base cell: `246 x 98.879`
- `1x1` usable budget: about `230 x 82.879`
- `2x1` usable budget: about `476 x 82.879`
- `2x2` usable budget: about `476 x 181.758`
- `2x3` usable budget: about `476 x 280.637`
- `3x3` usable budget: about `722 x 280.637`

Treat those numbers as the real budget. If a design only works in a roomy mock, it does not fit this dashboard.

### `1x1`

- Show only the icon, the main value or state, and one primary action.
- Avoid supporting text unless it changes the decision the user makes.

### `2x1`

- Prioritize one main value, one status, and one compact action row.
- Prefer `Progress`, `Badge`, and short labels over paragraphs.

### `2x2`

- Allow a main panel plus 1 to 3 secondary blocks.
- Keep the action cluster visible without scrolling.

### `2x3` and taller

- Use `ScrollArea` for lists.
- Move details into `Sheet` when the module would otherwise become cramped.

## Interaction Rules

- Primary touch targets should be comfortable on small screens.
- Keep the main action visible at first glance.
- Use icon-only buttons only when the meaning is obvious.
- Prefer short labels like `Online`, `Muted`, `Refresh`, `Queue`.
- Truncate long text intentionally instead of wrapping everything.

## State Rules

Each widget should have consistent states:

- Loading: compact `Skeleton` or `WidgetState`
- Empty: short explanation and no filler copy
- Error: short actionable message
- Unconfigured: clear message about the missing token, account, or device
- Offline: show the state directly in the header badge

## Accent Rules

Use one accent per widget through `WidgetShell`:

- `sky` for system, runtime, or infrastructure
- `emerald` for messaging, music, or connected services
- `amber` for devices, voice helpers, or warm utility states
- `rose` for degraded or offline-heavy modules
- `violet` only when a night or media context benefits from it
- `slate` as the neutral fallback

The accent should appear as a subtle tint, never as a full custom theme that changes spacing or structure.
