import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dashboardService } from "../src/services/dashboards";
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

describe("dashboardService", () => {
  beforeEach(() => {
    installTestEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns dashboard pages from the normalized envelope", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          pages: [
            {
              _id: "page-1",
              name: "Main",
              slug: "main",
              description: "",
              modules: [],
              style: {},
              active: true,
              order: 0,
            },
          ],
        },
      }),
    );

    const pages = await dashboardService.listPages();

    expect(pages).toHaveLength(1);
    expect(pages[0]?.slug).toBe("main");
  });

  it("returns the created page payload", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          page: {
            _id: "page-2",
            name: "Now Playing",
            slug: "now-playing",
            description: "",
            modules: [],
            style: {},
            active: false,
            order: 1,
          },
        },
      }),
    );

    const page = await dashboardService.createPage({
      name: "Now Playing",
      slug: "now-playing",
    });

    expect(page.name).toBe("Now Playing");
    expect(page.slug).toBe("now-playing");
  });
});
