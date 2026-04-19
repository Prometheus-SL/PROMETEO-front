import { HttpResponse, http } from "msw";
import { z } from "zod";

import type {
  GoogleTaskItem,
  GoogleWorkspaceSummary,
} from "@/services/google";

import {
  createModuleDevBackendUrl,
  createModuleDevSuccessResponse,
  createMswModuleDevMockAdapter,
} from "../msw";

const googleCalendarItemSchema = z.object({
  id: z.string().nullable().default(null),
  title: z.string().default("Deep Work"),
  startAt: z.string().nullable().default(null),
  endAt: z.string().nullable().default(null),
  location: z.string().nullable().optional(),
  htmlUrl: z.string().nullable().optional(),
  meetingUrl: z.string().nullable().optional(),
  status: z.string().optional(),
  organizer: z.string().nullable().optional(),
  isAllDay: z.boolean().optional(),
});

const googleTaskItemSchema = z.object({
  id: z.string().nullable().default(null),
  taskListId: z.string().nullable().default(null),
  taskListTitle: z.string().nullable().optional(),
  title: z.string().default("Prepare daily review"),
  status: z.string().default("needsAction"),
  due: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  webViewLink: z.string().nullable().optional(),
});

const googleInboxItemSchema = z.object({
  id: z.string().nullable().default(null),
  threadId: z.string().nullable().optional(),
  subject: z.string().default("Design review follow-up"),
  from: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  snippet: z.string().nullable().optional(),
});

const googleCalendarSchema = z.object({
  busyNow: z.boolean().default(true),
  activeEventId: z.string().nullable().default("event-1"),
  nextStartAt: z.string().nullable().default("2026-04-17T12:00:00.000Z"),
  nextEndAt: z.string().nullable().default("2026-04-17T12:30:00.000Z"),
  items: z.array(googleCalendarItemSchema).default([
    {
      id: "event-1",
      title: "Deep Work Block",
      startAt: "2026-04-17T10:00:00.000Z",
      endAt: "2026-04-17T11:00:00.000Z",
      meetingUrl: "https://meet.google.com/dev-focus",
    },
    {
      id: "event-2",
      title: "PR Sync",
      startAt: "2026-04-17T12:00:00.000Z",
      endAt: "2026-04-17T12:30:00.000Z",
    },
  ]),
  error: z.string().optional(),
});

const googleTasksSchema = z.object({
  taskLists: z
    .array(
      z.object({
        id: z.string().nullable().default(null),
        title: z.string().default("Today"),
      }),
    )
    .default([
      {
        id: "task-list-1",
        title: "Today",
      },
    ]),
  items: z.array(googleTaskItemSchema).default([
    {
      id: "task-1",
      taskListId: "task-list-1",
      taskListTitle: "Today",
      title: "Ship shared mock registry",
      status: "needsAction",
      due: "2026-04-17T14:00:00.000Z",
      updatedAt: "2026-04-17T08:30:00.000Z",
    },
    {
      id: "task-2",
      taskListId: "task-list-1",
      taskListTitle: "Today",
      title: "Triage provider-backed widgets",
      status: "needsAction",
      due: "2026-04-16T18:00:00.000Z",
      updatedAt: "2026-04-16T18:00:00.000Z",
    },
  ]),
  dueTodayCount: z.number().default(1),
  overdueCount: z.number().default(1),
  error: z.string().optional(),
});

const googleInboxSchema = z.object({
  unreadCount: z.number().default(6),
  threadUnreadCount: z.number().optional(),
  items: z.array(googleInboxItemSchema).default([
    {
      id: "mail-1",
      threadId: "thread-1",
      subject: "Sandbox rollout ready",
      from: "team@prometeo.dev",
      date: "2026-04-17T07:50:00.000Z",
      snippet: "Shared adapters are ready for review.",
    },
    {
      id: "mail-2",
      threadId: "thread-2",
      subject: "Need feedback on widget presets",
      from: "product@prometeo.dev",
      date: "2026-04-17T06:20:00.000Z",
      snippet: "Please validate the new default experience.",
    },
  ]),
  error: z.string().optional(),
});

const googleFocusSchema = z.object({
  active: z.boolean().default(true),
  reason: z.string().nullable().default("Calendar focus block in progress"),
  nextTransitionAt: z.string().nullable().default("2026-04-17T11:00:00.000Z"),
  dueTodayCount: z.number().optional(),
  overdueCount: z.number().optional(),
  unreadCount: z.number().optional(),
  recommendedIntentTags: z.array(z.string()).default([
    "focus",
    "calendar",
    "tasks",
  ]),
  error: z.string().optional(),
});

const DEFAULT_GOOGLE_CALENDAR = googleCalendarSchema.parse({});
const DEFAULT_GOOGLE_TASKS = googleTasksSchema.parse({});
const DEFAULT_GOOGLE_INBOX = googleInboxSchema.parse({});
const DEFAULT_GOOGLE_FOCUS = googleFocusSchema.parse({});

const googleWorkspaceSummarySchema = z.object({
  provider: z
    .object({
      status: z.string().default("connected"),
      connectedAt: z.string().nullable().default("2026-04-17T08:45:00.000Z"),
      tokenExpiresAt: z.string().nullable().default("2026-04-17T20:45:00.000Z"),
      lastError: z.string().nullable().default(null),
      profile: z.record(z.string(), z.unknown()).nullable().default({
        email: "migue@prometeo.dev",
        name: "Miguel",
      }),
      scopes: z.array(z.string()).default([
        "calendar.readonly",
        "gmail.readonly",
        "tasks",
      ]),
    })
    .optional(),
  calendar: googleCalendarSchema.default(DEFAULT_GOOGLE_CALENDAR),
  tasks: googleTasksSchema.default(DEFAULT_GOOGLE_TASKS),
  inbox: googleInboxSchema.default(DEFAULT_GOOGLE_INBOX),
  focus: googleFocusSchema.default(DEFAULT_GOOGLE_FOCUS),
});

const DEFAULT_GOOGLE_WORKSPACE_SUMMARY = googleWorkspaceSummarySchema.parse({});

const googleWorkspaceMockStateSchema = z.object({
  summary: googleWorkspaceSummarySchema.default(DEFAULT_GOOGLE_WORKSPACE_SUMMARY),
});

type GoogleWorkspaceMockState = z.infer<typeof googleWorkspaceMockStateSchema>;

function parseDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameUtcDay(left: Date, right: Date) {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
}

function recomputeTaskCounts(summary: GoogleWorkspaceSummary) {
  const now = new Date();
  let dueTodayCount = 0;
  let overdueCount = 0;

  for (const task of summary.tasks.items) {
    if (task.status === "completed") {
      continue;
    }

    const due = parseDate(task.due);
    if (!due) {
      continue;
    }

    if (isSameUtcDay(due, now)) {
      dueTodayCount += 1;
      continue;
    }

    if (due.getTime() < now.getTime()) {
      overdueCount += 1;
    }
  }

  summary.tasks.dueTodayCount = dueTodayCount;
  summary.tasks.overdueCount = overdueCount;
  summary.focus.dueTodayCount = dueTodayCount;
  summary.focus.overdueCount = overdueCount;
  summary.focus.unreadCount = summary.inbox.unreadCount;
}

function findTask(
  summary: GoogleWorkspaceSummary,
  taskListId: string,
  taskId: string,
) {
  return summary.tasks.items.find((task) => {
    return task.taskListId === taskListId && task.id === taskId;
  });
}

const adapter = createMswModuleDevMockAdapter<GoogleWorkspaceMockState>({
  stateSchema: googleWorkspaceMockStateSchema,
  buildHandlers(state) {
    recomputeTaskCounts(state.summary);

    return [
      http.get(createModuleDevBackendUrl("/api/v1/google/summary"), () =>
        createModuleDevSuccessResponse(state.summary),
      ),
      http.post(
        createModuleDevBackendUrl("/api/v1/google/tasks/:taskListId/:taskId/complete"),
        ({ params }) => {
          const taskListId = String(params.taskListId ?? "");
          const taskId = String(params.taskId ?? "");
          const task = findTask(state.summary, taskListId, taskId);

          if (!task) {
            return HttpResponse.json(
              { success: false, message: "Task not found" },
              { status: 404 },
            );
          }

          task.status = "completed";
          task.updatedAt = new Date().toISOString();
          state.summary.tasks.items = state.summary.tasks.items.filter((item) => {
            return !(item.taskListId === taskListId && item.id === taskId);
          });
          recomputeTaskCounts(state.summary);

          return createModuleDevSuccessResponse<{ task: GoogleTaskItem }>({
            task: {
              ...task,
              status: "completed",
            },
          });
        },
      ),
      http.post(
        createModuleDevBackendUrl("/api/v1/google/tasks/:taskListId/:taskId/reschedule"),
        async ({ params, request }) => {
          const taskListId = String(params.taskListId ?? "");
          const taskId = String(params.taskId ?? "");
          const task = findTask(state.summary, taskListId, taskId);

          if (!task) {
            return HttpResponse.json(
              { success: false, message: "Task not found" },
              { status: 404 },
            );
          }

          const payload = (await request.json()) as { due?: string };
          task.due = payload.due ?? task.due;
          task.updatedAt = new Date().toISOString();
          recomputeTaskCounts(state.summary);

          return createModuleDevSuccessResponse<{ task: GoogleTaskItem }>({
            task,
          });
        },
      ),
    ];
  },
});

export default adapter;
