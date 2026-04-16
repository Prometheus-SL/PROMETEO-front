import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { githubService } from "../src/services/github";
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

describe("githubService", () => {
  beforeEach(() => {
    installTestEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads the pulse summary", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          profile: {
            login: "mike",
          },
          assignedPullRequests: [
            {
              id: 101,
              title: "Improve account page",
              hasFailingChecks: true,
            },
          ],
          notifications: [],
          mentionsCount: 1,
          failingChecksCount: 1,
        },
      }),
    );

    const pulse = await githubService.getPulse();

    expect(pulse.profile.login).toBe("mike");
    expect(pulse.assignedPullRequests[0]?.hasFailingChecks).toBe(true);
    expect(pulse.mentionsCount).toBe(1);
  });
});
