import { api } from "@/lib/api";

export type GoogleCalendarItem = {
  id: string | null;
  title: string;
  startAt: string | null;
  endAt: string | null;
  location?: string | null;
  htmlUrl?: string | null;
  meetingUrl?: string | null;
  status?: string;
  organizer?: string | null;
  isAllDay?: boolean;
};

export type GoogleTaskItem = {
  id: string | null;
  taskListId: string | null;
  taskListTitle?: string | null;
  title: string;
  status: string;
  due?: string | null;
  updatedAt?: string | null;
  notes?: string | null;
  webViewLink?: string | null;
};

export type GoogleInboxItem = {
  id: string | null;
  threadId?: string | null;
  subject: string;
  from?: string | null;
  date?: string | null;
  snippet?: string | null;
};

export type GoogleWorkspaceSummary = {
  provider?: {
    status?: string;
    connectedAt?: string | null;
    tokenExpiresAt?: string | null;
    lastError?: string | null;
    profile?: Record<string, unknown> | null;
    scopes?: string[];
  };
  calendar: {
    busyNow: boolean;
    activeEventId?: string | null;
    nextStartAt?: string | null;
    nextEndAt?: string | null;
    items: GoogleCalendarItem[];
    error?: string;
  };
  tasks: {
    taskLists?: Array<{ id: string | null; title: string }>;
    items: GoogleTaskItem[];
    dueTodayCount: number;
    overdueCount?: number;
    error?: string;
  };
  inbox: {
    unreadCount: number;
    threadUnreadCount?: number;
    items: GoogleInboxItem[];
    error?: string;
  };
  focus: {
    active: boolean;
    reason?: string | null;
    nextTransitionAt?: string | null;
    dueTodayCount?: number;
    overdueCount?: number;
    unreadCount?: number;
    recommendedIntentTags?: string[];
    error?: string;
  };
};

export const googleService = {
  async getSummary(): Promise<GoogleWorkspaceSummary> {
    return api.getData<GoogleWorkspaceSummary>("/api/v1/google/summary");
  },

  async completeTask(taskListId: string, taskId: string): Promise<GoogleTaskItem> {
    const data = await api.postData<{ task: GoogleTaskItem }>(
      `/api/v1/google/tasks/${encodeURIComponent(taskListId)}/${encodeURIComponent(taskId)}/complete`,
    );
    return data.task;
  },

  async rescheduleTask(
    taskListId: string,
    taskId: string,
    due: string,
  ): Promise<GoogleTaskItem> {
    const data = await api.postData<{ task: GoogleTaskItem }>(
      `/api/v1/google/tasks/${encodeURIComponent(taskListId)}/${encodeURIComponent(taskId)}/reschedule`,
      { due },
    );
    return data.task;
  },
};
