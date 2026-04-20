import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { agentsService } from "../src/services/agents";
import { usersService } from "../src/services/users";
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

describe("admin user service", () => {
  beforeEach(() => {
    installTestEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads paged users with search, role, and status filters", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          users: [
            {
              _id: "user-1",
              username: "miguel",
              email: "miguel@example.com",
              role: "admin",
              lastLogin: "2026-04-19T10:00:00.000Z",
              isActive: true,
              name: "Miguel",
              surname: "Perez",
            },
          ],
          pagination: {
            current: 2,
            pages: 4,
            total: 31,
          },
        },
      }),
    );

    const result = await usersService.listPaged({
      query: "mig",
      role: "admin",
      isActive: true,
      page: 2,
      pageSize: 10,
    });

    expect(result.total).toBe(31);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.items[0]?.email).toBe("miguel@example.com");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/v1/users?search=mig&role=admin&isActive=true&page=2&limit=10",
      ),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("creates users through the admin endpoint", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          user: {
            _id: "user-2",
            username: "operator",
            email: "operator@example.com",
            role: "operator",
            lastLogin: "",
            isActive: true,
            name: "Ops",
            surname: "Lead",
          },
        },
      }),
    );

    const user = await usersService.create({
      username: "operator",
      email: "Operator@Example.com",
      password: "long-password-123",
      role: "operator",
      name: "Ops",
      surname: "Lead",
      isActive: true,
    });

    expect(user.role).toBe("operator");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/users"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Operator@Example.com"),
      }),
    );
  });
});

describe("admin agent service", () => {
  beforeEach(() => {
    installTestEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("registers agents with description and location metadata", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          agent: {
            _id: "agent-doc-1",
            agentId: "desk-01",
            name: "Studio Desk",
            description: "Main workstation",
            location: "Studio",
            apiKey: "generated-key",
            status: "offline",
          },
        },
      }),
    );

    const agent = await agentsService.registerAgent({
      id: "desk-01",
      name: "Studio Desk",
      description: "Main workstation",
      location: "Studio",
    });

    expect(agent.id).toBe("desk-01");
    expect(agent.apiKey).toBe("generated-key");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/agents"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Main workstation"),
      }),
    );
  });

  it("deletes an agent through the admin endpoint", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: null,
      }),
    );

    await agentsService.delete("desk-01");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/agents/desk-01"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
