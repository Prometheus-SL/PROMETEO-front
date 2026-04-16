import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { creatorService } from "../src/services/creator";
import { installTestEnvironment } from "./helpers/testEnvironment";

function createJsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

describe("creatorService", () => {
  beforeEach(() => {
    installTestEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads the creator sources status", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          online: true,
          liveCount: 1,
          sources: [
            {
              id: "youtube",
              status: "live",
              headline: "PROMETEO Deep Dive",
            },
          ],
        },
      }),
    );

    const status = await creatorService.getStatus();

    expect(status.online).toBe(true);
    expect(status.sources[0]?.id).toBe("youtube");
  });
});
