import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { accountService } from "../src/services/account";
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

describe("accountService", () => {
  beforeEach(() => {
    installTestEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads the normalized account payload", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
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
          linkedAccounts: {
            spotify: {
              status: "connected",
              displayName: "Mike",
              avatarUrl: null,
              connectedAt: null,
              scopes: [],
              lastError: null,
              product: null,
              externalUrl: null,
            },
            discord: {
              status: "disconnected",
              id: null,
              displayName: null,
              username: null,
              avatarUrl: null,
              connectedAt: null,
              scopes: [],
              lastError: null,
              email: null,
              verified: null,
            },
          },
        },
      }),
    );

    const result = await accountService.getAccount();

    expect(result.user.username).toBe("mike");
    expect(result.linkedAccounts.spotify.status).toBe("connected");
  });

  it("returns the authorize URL when starting Spotify linking", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          authorizeUrl: "https://accounts.spotify.com/authorize?client_id=123",
        },
      }),
    );

    const authorizeUrl = await accountService.beginSpotifyConnect(
      "https://prometeo.example",
    );

    expect(authorizeUrl).toContain("spotify.com/authorize");
  });

  it("loads the supported linked-account providers", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          providers: [
            {
              id: "spotify",
              name: "Spotify",
              description: "Playback controls and queue access.",
              kind: "oauth",
              status: "connected",
              connectedAt: "2026-04-14T12:00:00.000Z",
              scopes: ["user-read-private"],
              connectPath: "/api/v1/account/linked-accounts/spotify/connect",
              disconnectPath: "/api/v1/account/linked-accounts/spotify",
            },
            {
              id: "discord",
              name: "Discord",
              description: "Community presence and profile data.",
              kind: "oauth",
              status: "disconnected",
              connectedAt: null,
              scopes: [],
              connectPath: "/api/v1/account/linked-accounts/discord/connect",
              disconnectPath: "/api/v1/account/linked-accounts/discord",
            },
            {
              id: "google",
              name: "Google Workspace",
              description: "Calendar, Tasks and Gmail summary.",
              kind: "oauth",
              status: "connected",
              connectedAt: "2026-04-15T08:00:00.000Z",
              scopes: ["calendar.readonly", "gmail.readonly", "tasks"],
              connectPath: "/api/v1/account/linked-accounts/google/connect",
              disconnectPath: "/api/v1/account/linked-accounts/google",
            },
            {
              id: "github",
              name: "GitHub",
              description: "Pulse for pull requests and notifications.",
              kind: "oauth",
              status: "connected",
              connectedAt: "2026-04-15T08:00:00.000Z",
              scopes: ["notifications", "repo"],
              connectPath: "/api/v1/account/linked-accounts/github/connect",
              disconnectPath: "/api/v1/account/linked-accounts/github",
            },
            {
              id: "creator",
              name: "Creator Status",
              description: "Live state across creator channels.",
              kind: "internal",
              status: "connected",
              connectedAt: "2026-04-15T08:00:00.000Z",
              scopes: [],
              connectSupported: false,
              disconnectSupported: false,
              connectPath: "/api/v1/account/linked-accounts/creator/connect",
              disconnectPath: "/api/v1/account/linked-accounts/creator",
            },
          ],
        },
      }),
    );

    const providers = await accountService.listProviders();

    expect(providers).toHaveLength(5);
    expect(providers[0]?.id).toBe("spotify");
    expect(providers[0]?.status).toBe("connected");
    expect(providers[1]?.id).toBe("discord");
    expect(providers[2]?.id).toBe("google");
    expect(providers[3]?.id).toBe("github");
    expect(providers[4]?.id).toBe("creator");
    expect(providers[4]?.connectSupported).toBe(false);
  });

  it("updates profile fields", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          user: {
            id: "user-1",
            username: "miguel",
            email: "mike@example.com",
            role: "user",
            name: "Miguel",
            surname: "Perez",
            birthday: "1998-04-11T00:00:00.000Z",
          },
        },
      }),
    );

    const result = await accountService.updateProfile({
      username: "miguel",
      name: "Miguel",
      surname: "Perez",
      birthday: "1998-04-11",
    });

    expect(result.username).toBe("miguel");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/account/profile"),
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("miguel"),
      }),
    );
  });

  it("changes the account password", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: null,
      }),
    );

    await accountService.changePassword({
      currentPassword: "current-password-123",
      newPassword: "new-strong-password-123",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/account/password"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("new-strong-password-123"),
      }),
    );
  });

  it("uploads an avatar and returns the updated user", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          user: {
            id: "user-1",
            username: "mike",
            email: "mike@example.com",
            role: "user",
            avatarUrl: "/uploads/avatars/user-1.webp",
            avatarUpdatedAt: "2026-04-23T10:00:00.000Z",
          },
        },
      }),
    );

    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "me.jpg", {
      type: "image/jpeg",
    });
    const user = await accountService.uploadAvatar(file);

    expect(user.avatarUrl).toBe("/uploads/avatars/user-1.webp");
    expect(user.avatarUpdatedAt).toBe("2026-04-23T10:00:00.000Z");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/account/avatar");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    const sent = init.body as FormData;
    expect(sent.get("file")).toBeInstanceOf(File);
  });

  it("removes the avatar and returns the updated user", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          user: {
            id: "user-1",
            username: "mike",
            email: "mike@example.com",
            role: "user",
            avatarUrl: null,
            avatarUpdatedAt: null,
          },
        },
      }),
    );

    const user = await accountService.removeAvatar();

    expect(user.avatarUrl).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/account/avatar"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
