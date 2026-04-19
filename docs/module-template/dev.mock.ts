import { http } from "msw";
import { z } from "zod";

import {
  createModuleDevBackendUrl,
  createModuleDevSuccessResponse,
  createMswModuleDevMockAdapter,
} from "@/dev/modules";

const yourWidgetMockStateSchema = z.object({
  summary: z
    .object({
      status: z.enum(["ready", "warning"]).default("ready"),
      value: z.string().default("42"),
      updatedAt: z.string().default("2026-04-17T08:00:00.000Z"),
    })
    .default({}),
});

type YourWidgetMockState = z.infer<typeof yourWidgetMockStateSchema>;

const adapter = createMswModuleDevMockAdapter<YourWidgetMockState>({
  stateSchema: yourWidgetMockStateSchema,
  buildHandlers(state) {
    return [
      http.get(createModuleDevBackendUrl("/api/v1/your-widget/summary"), () =>
        createModuleDevSuccessResponse(state.summary),
      ),
    ];
  },
});

export default adapter;
