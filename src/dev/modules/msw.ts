import { HttpResponse, type RequestHandler } from "msw";
import { setupWorker } from "msw/browser";
import { z } from "zod";

import { API_URL } from "@/lib/api";

import type { ModuleDevMockAdapter } from "./types";

const DEV_BACKEND_URL = API_URL || "https://dev-modules.prometeo.local";

export function cloneModuleDevMockValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export function createModuleDevBackendUrl(pathname: string) {
  try {
    return new URL(pathname, DEV_BACKEND_URL).toString();
  } catch {
    return `${DEV_BACKEND_URL}${pathname}`;
  }
}

export function createModuleDevSuccessResponse<T>(data: T) {
  return HttpResponse.json({ success: true, data });
}

export function createMswModuleDevMockAdapter<TState>({
  buildHandlers,
  stateSchema,
}: {
  buildHandlers: (state: TState) => RequestHandler[];
  stateSchema: z.ZodType<TState>;
}): ModuleDevMockAdapter<TState> {
  let worker: ReturnType<typeof setupWorker> | null = null;

  async function ensureWorker() {
    if (worker) {
      return worker;
    }

    worker = setupWorker();
    await worker.start({ onUnhandledRequest: "bypass", quiet: true });
    return worker;
  }

  return {
    stateSchema,
    createInitialState: () => stateSchema.parse({}),
    async apply(state) {
      const nextState = cloneModuleDevMockValue(state);
      const nextWorker = await ensureWorker();
      nextWorker.use(...buildHandlers(nextState));
    },
    async cleanup() {
      worker?.resetHandlers();
    },
  };
}
