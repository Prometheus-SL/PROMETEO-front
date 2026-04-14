import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../src/lib/api";
import { authService, getAuthErrorMessage } from "../src/services/auth";
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

describe("authService", () => {
  beforeEach(() => {
    installTestEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("logs in with the normalized success envelope", async () => {
    const { fetchMock } = installTestEnvironment();
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          user: {
            id: "user-1",
            username: "mike",
            email: "mike@example.com",
            role: "user",
          },
          tokens: {
            accessToken: "access-token",
            refreshToken: "refresh-token",
          },
        },
      }),
    );

    const result = await authService.login("mike", "secret");

    expect(result.user.username).toBe("mike");
    expect(result.tokens.accessToken).toBe("access-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps known API errors to friendly auth messages", () => {
    const message = getAuthErrorMessage(
      new ApiError("Invalid credentials", 401, {
        code: "INVALID_CREDENTIALS",
      }),
      "Fallback message",
    );

    expect(message).toBe("The username/email and password do not match.");
  });
});
