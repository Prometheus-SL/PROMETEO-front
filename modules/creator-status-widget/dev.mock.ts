import { http } from "msw";
import { z } from "zod";

import {
  createModuleDevBackendUrl,
  createModuleDevSuccessResponse,
  createMswModuleDevMockAdapter,
} from "@/dev/modules";
import type { CreatorStatus } from "@/services/creator";

const sourceSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  status: z.string().default("offline"),
  headline: z.string(),
  url: z.string().nullable().default(null),
  startedAt: z.string().nullable().default(null),
});

const creatorMockStateSchema = z.object({
  online: z.boolean().default(true),
  liveCount: z.number().default(1),
  sources: z
    .array(sourceSchema)
    .default([
      {
        id: "yt-main",
        label: "YouTube",
        status: "live",
        headline: "🔴 Building PROMETEO live — dashboard widgets",
        url: "https://youtube.com/live/mock",
        startedAt: new Date(Date.now() - 45 * 60_000).toISOString(),
      },
      {
        id: "twitch-main",
        label: "Twitch",
        status: "offline",
        headline: "Last stream: Creative coding session",
        url: "https://twitch.tv/mock",
        startedAt: null,
      },
    ]),
});

type CreatorMockState = z.infer<typeof creatorMockStateSchema>;

function buildHandlers(state: CreatorMockState) {
  const live: CreatorStatus = {
    online: state.online,
    liveCount: state.liveCount,
    sources: state.sources.map((s) => ({
      id: s.id,
      label: s.label,
      status: s.status as CreatorStatus["sources"][number]["status"],
      headline: s.headline,
      url: s.url,
      startedAt: s.startedAt,
    })),
  };

  return [
    http.get(createModuleDevBackendUrl("/api/v1/creator/status"), () =>
      createModuleDevSuccessResponse(live),
    ),
  ];
}

const adapter = createMswModuleDevMockAdapter<CreatorMockState>({
  stateSchema: creatorMockStateSchema,
  buildHandlers,
});

export default adapter;
