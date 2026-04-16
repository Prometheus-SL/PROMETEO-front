import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { googleService } from "../src/services/google";
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

describe("googleService", () => {
  beforeEach(() => {
    installTestEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads the aggregated workspace summary", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          calendar: {
            busyNow: true,
            items: [{ id: "event-1", title: "Daily Standup" }],
          },
          tasks: {
            dueTodayCount: 2,
            items: [{ id: "task-1", title: "Ship bundle" }],
          },
          inbox: {
            unreadCount: 5,
            items: [{ id: "message-1", subject: "Review requested" }],
          },
          focus: {
            active: true,
            reason: "calendar",
          },
        },
      }),
    );

    const summary = await googleService.getSummary();

    expect(summary.calendar.busyNow).toBe(true);
    expect(summary.tasks.items[0]?.id).toBe("task-1");
    expect(summary.inbox.unreadCount).toBe(5);
  });

  it("marks a task as completed", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "token-123");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          task: {
            id: "task-1",
            taskListId: "primary",
            status: "completed",
          },
        },
      }),
    );

    const task = await googleService.completeTask("primary", "task-1");

    expect(task.status).toBe("completed");
  });
});
