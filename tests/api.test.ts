import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, configureApi, unwrapApiData } from "../src/lib/api";
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

describe("lib/api", () => {
  beforeEach(() => {
    installTestEnvironment();
    configureApi({
      getAccessToken: () => localStorage.getItem("auth_access_token"),
      tryRefreshTokens: async () => false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("unwraps the normalized success envelope", () => {
    expect(
      unwrapApiData({
        success: true,
        data: { ok: true },
      }),
    ).toEqual({ ok: true });
  });

  it("includes the auth token and returns envelope data", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: { value: 42 },
      }),
    );

    const data = await api.getData<{ value: number }>("/status");

    expect(data).toEqual({ value: 42 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer token-123");
  });

  it("throws ApiError with code, status, and details from the failure envelope", async () => {
    const { fetchMock } = installTestEnvironment();
    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          success: false,
          error: {
            code: "BROKEN",
            message: "Failure",
            details: { reason: "boom" },
          },
        },
        { status: 409 },
      ),
    );

    await expect(api.getData("/status")).rejects.toMatchObject({
      name: "ApiError",
      status: 409,
      code: "BROKEN",
      message: "Failure",
      details: { reason: "boom" },
    });
  });
});
