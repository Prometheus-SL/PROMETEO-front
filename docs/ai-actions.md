# AI Actions Reference

Widgets can expose their data and controls to the PROMETEO AI assistant (Spark) by declaring **AI actions** in `module.json`.

When a user talks to Spark, the backend reads the `meta.ai.actions` array of every module instance on the active dashboard, builds a set of live tools from those actions, and lets the model call them. The widget itself does not need to handle any of this — the driver layer in `PROMETEO-back` takes care of it.

---

## Declaring actions in `module.json`

Add an optional `ai` block inside a module entry:

```json
{
  "id": "my-widget",
  "name": "My Widget",
  "ai": {
    "actions": ["weather.current"]
  }
}
```

The `actions` array holds string action IDs. Only IDs that have a registered backend driver are processed; unknown IDs are silently ignored.

Rules:

- The block is optional. Omit it completely if the module has nothing useful to expose.
- List only the actions that make sense for this module. Do not declare actions from unrelated drivers.
- When a `module.json` exports multiple entries (variants), each entry carries its own `ai` block independently.

---

## Available actions by driver

### `lighting` — smart lights

Supported modules: `lifx-widget`, `wled-controller`, `wled-compact`

| Action ID              | What it does                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `lighting.power.set`   | Turn lights on or off. LIFX uses a server-side API call; WLED sends a client action. |
| `lighting.effect.next` | Advance to the next effect on a WLED device.                                         |

Config fields read by the driver:

| Module        | Config field         | Required | Notes                                |
| ------------- | -------------------- | -------- | ------------------------------------ |
| `lifx-widget` | `config.apiToken`    | Yes      | LIFX Cloud Bearer token              |
| `lifx-widget` | `config.groupFilter` | No       | LIFX group name to scope the command |
| `wled-*`      | `config.deviceIp`    | Yes      | Device IP or hostname                |
| `wled-*`      | `config.useSsl`      | No       | Boolean; uses `https://` if true     |

---

### `weather` — weather widget

Supported modules: `weather-widget`

| Action ID         | What it does                                     |
| ----------------- | ------------------------------------------------ |
| `weather.current` | Returns current weather for the configured city. |

Config fields read by the driver:

| Config field      | Required | Notes                                    |
| ----------------- | -------- | ---------------------------------------- |
| `config.city`     | Yes      | No target is created if empty            |
| `config.units`    | No       | `'metric'` (default) or `'imperial'`     |
| `config.language` | No       | `'es'` (default), `'en'`, `'fr'`, `'de'` |

---

### `football` — football widget

Supported modules: `football-widget`, `football-widget-compact`

| Action ID                   | What it does                                     |
| --------------------------- | ------------------------------------------------ |
| `football.team.summary`     | Team summary for the configured league and team. |
| `football.featured.summary` | Featured match or highlight summary.             |
| `football.standings`        | Current standings for the configured league.     |

Any combination of these three can be declared. The AI tool dynamically exposes only the enabled modes.

Config fields read by the driver:

| Config field      | Required | Notes                                                 |
| ----------------- | -------- | ----------------------------------------------------- |
| `config.leagueId` | No       | Must be a supported league ID; defaults to `'laliga'` |
| `config.teamName` | No       | Team name used as a target identifier                 |

---

### `minecraft` — Minecraft server

Supported modules: `minecraft-widget`

| Action ID          | What it does                                   |
| ------------------ | ---------------------------------------------- |
| `minecraft.status` | Returns online player count and server status. |

Config fields read by the driver:

| Config field       | Required | Notes                                               |
| ------------------ | -------- | --------------------------------------------------- |
| `config.ipAddress` | Yes      | No target is created if empty                       |
| `config.port`      | No       | Appended as `ip:port` when provided                 |
| `config.name`      | No       | Display name; falls back to `'Minecraft <address>'` |

---

### `spotify` — Spotify playback

Supported modules: any (no module ID filter applied)

| Action ID             | Tool action                                                          |
| --------------------- | -------------------------------------------------------------------- |
| `spotify.status`      | `status` — current track and playback state                          |
| `spotify.play`        | `play` — resume playback                                             |
| `spotify.track.play`  | `play_track` — search and play a specific track                      |
| `spotify.pause`       | `pause`                                                              |
| `spotify.next`        | `next`                                                               |
| `spotify.previous`    | `previous`                                                           |
| `spotify.volume.up`   | `volume_up`                                                          |
| `spotify.volume.down` | `volume_down`                                                        |
| `spotify.volume.set`  | `set_volume` — accepts `volumePercent` (0–100)                       |
| `spotify.shuffle.set` | `set_shuffle` — accepts `enabled` boolean                            |
| `spotify.repeat.set`  | `set_repeat` — accepts `repeatMode`: `'off'`, `'track'`, `'context'` |
| `spotify.seek.to`     | `seek_to` — accepts `positionMs` (≥0)                                |
| `spotify.seek.by`     | `seek_by` — accepts `offsetSeconds` (±3600)                          |

The driver does not read module `config`. Any Spotify widget can declare any subset of these actions.

---

### `google` — Google Workspace

Supported modules by area:

| Module ID                                                  | Area       |
| ---------------------------------------------------------- | ---------- |
| `calendar-agenda-widget`, `calendar-agenda-widget-compact` | `calendar` |
| `tasks-today-widget`, `tasks-today-widget-compact`         | `tasks`    |
| `inbox-summary-widget`, `inbox-summary-widget-compact`     | `inbox`    |

| Action ID                 | What it does                               |
| ------------------------- | ------------------------------------------ |
| `google.summary.calendar` | Upcoming meetings and busy state.          |
| `google.summary.tasks`    | Pending tasks due today or overdue.        |
| `google.summary.inbox`    | Unread thread count and priority messages. |

When more than one Google area is active across the dashboard the AI tool also exposes an `'all'` mode that queries all areas at once.

Config fields read by the driver:

| Config field      | Required | Notes                                                        |
| ----------------- | -------- | ------------------------------------------------------------ |
| `config.maxItems` | No       | Clamped 1–20; defaults differ per area (inbox: 5, others: 6) |

---

### `github` — GitHub Pulse

Supported modules: `github-pulse-widget`, `github-pulse-widget-compact`

| Action ID      | What it does                                                    |
| -------------- | --------------------------------------------------------------- |
| `github.pulse` | Returns assigned PRs, unread notifications, and failing checks. |

Config fields read by the driver:

| Config field      | Required | Notes                   |
| ----------------- | -------- | ----------------------- |
| `config.maxItems` | No       | Clamped 1–12, default 6 |

---

### `creator` — Creator Status

Supported modules: `creator-status-widget`, `creator-status-widget-compact`

| Action ID        | What it does                                    |
| ---------------- | ----------------------------------------------- |
| `creator.status` | Live status across YouTube and Twitch channels. |

No config fields are read by this driver.

---

### `whatsapp` — WhatsApp Personal

Supported modules: `whatsapp-personal-widget`

| Action ID                     | What it does                                                     |
| ----------------------------- | ---------------------------------------------------------------- |
| `whatsapp.status`             | WhatsApp connection state.                                       |
| `whatsapp.conversations.list` | Recent conversations list. Respects `limit` and `includeGroups`. |

Config fields read by the driver:

| Config field           | Required | Notes                                                 |
| ---------------------- | -------- | ----------------------------------------------------- |
| `config.limit`         | No       | Clamped 3–20, default 8                               |
| `config.includeGroups` | No       | Boolean; defaults to `true` unless explicitly `false` |

---

### `discord` — Discord

Supported modules: `discord-widget`

| Action ID            | What it does                                                       |
| -------------------- | ------------------------------------------------------------------ |
| `discord.guild.info` | Server info: member count, active voice channels, recent activity. |

Config fields read by the driver:

| Config field      | Required | Notes                         |
| ----------------- | -------- | ----------------------------- |
| `config.serverId` | Yes      | No target is created if empty |

---

### `hermes` — Hermes Windows agent

Supported modules: `hermes-pc-widget`, `hermes-now-playing-widget`, `hermes-volume-widget`

The Hermes driver splits actions into **status reads** and **commands**.

**Status reads**

| Action ID              | What it reads                                          |
| ---------------------- | ------------------------------------------------------ |
| `hermes.status.system` | CPU, RAM, disk and process info from the agent         |
| `hermes.status.audio`  | Current volume level, mute state, active audio outputs |
| `hermes.status.media`  | Now-playing title, source, and playback state          |

**Commands** — sent to the agent via the WebSocket command channel

| Action ID                              | Command sent            | Notes                            |
| -------------------------------------- | ----------------------- | -------------------------------- |
| `hermes.command.volume.set`            | `volume_set`            | Requires `volumePercent` (0–100) |
| `hermes.command.volume.mute`           | `volume_mute`           |                                  |
| `hermes.command.volume.unmute`         | `volume_unmute`         |                                  |
| `hermes.command.volume.up`             | `volume_up`             |                                  |
| `hermes.command.volume.down`           | `volume_down`           |                                  |
| `hermes.command.audio_output.set`      | `audio_output_set`      | Requires `outputId`              |
| `hermes.command.media.refresh`         | `media_refresh`         |                                  |
| `hermes.command.media.toggle_playback` | `media_toggle_playback` |                                  |
| `hermes.command.media.play`            | `media_play`            |                                  |
| `hermes.command.media.pause`           | `media_pause`           |                                  |
| `hermes.command.media.next`            | `media_next`            |                                  |
| `hermes.command.media.previous`        | `media_previous`        |                                  |

Config fields read by the driver:

| Config field     | Required    | Notes                                                              |
| ---------------- | ----------- | ------------------------------------------------------------------ |
| `config.mode`    | No          | `'auto'` (default) or `'agent'`; `'agent'` mode requires `agentId` |
| `config.agentId` | Conditional | Required when `mode` is `'agent'`; otherwise ignored               |

---

## Marketplace variants (`marketplace` field)

When a `module.json` exports more than one size variant of the same widget, use the `marketplace` block to group them into a single family in the module marketplace:

```json
{
  "id": "my-widget",
  "marketplace": {
    "familyId": "my-widget",
    "familyName": "My Widget",
    "variantLabel": "Standard",
    "variantOrder": 1
  }
}
```

| Field          | Type   | Description                                                       |
| -------------- | ------ | ----------------------------------------------------------------- |
| `familyId`     | string | Shared ID across all variants of the same module family           |
| `familyName`   | string | Display name shown in the marketplace family card                 |
| `variantLabel` | string | Label for this specific variant (`"Standard"`, `"Compact"`, etc.) |
| `variantOrder` | number | Sort order within the family (1 = first)                          |

The `marketplace` block is optional. Omit it for standalone modules that have no variants.

---

## `preview` field

Point to a local PNG or image relative to the module folder to show a screenshot in the marketplace and admin UI:

```json
{
  "id": "my-widget",
  "preview": "./preview.png"
}
```

The field is optional. If absent, no preview image is shown.

---

## How the system works end-to-end

1. Each module instance stored in the dashboard has a `meta.ai.actions` array populated from the `module.json` `ai.actions` field at install time (and kept up to date by the backfill script).
2. When the user sends a message to Spark, `buildWidgetAiContext` in `widgetRegistry.js` reads all active module instances on the current page, groups actions by driver, and calls each driver's `collectTargets` to build a list of live, permission-scoped targets.
3. From those targets each driver's `getToolDefinitions` generates the OpenAI-compatible tool schemas, scoped only to the actions that are declared.
4. The model calls tools as needed; `executeWidgetAiTool` routes each call to the correct driver's `execute` function.
5. Drivers that control devices (WLED, Hermes) may return `clientActions` inside the result, which the frontend picks up to trigger local side effects without a second round-trip.

No frontend code is needed in the widget to participate in this flow.
