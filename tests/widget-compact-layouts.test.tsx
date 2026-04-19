import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { loadModulesIndex } from "../src/modules/loader";
import type { GithubPulse } from "../src/services/github";
import type { GoogleWorkspaceSummary } from "../src/services/google";
import { CalendarAgendaCompactView } from "../modules/calendar-agenda-widget/compact";
import { GithubPulseCompactView } from "../modules/github-pulse-widget/compact";

function createGoogleSummary(): GoogleWorkspaceSummary {
  return {
    calendar: {
      busyNow: true,
      activeEventId: "event-1",
      nextStartAt: "2026-04-17T11:00:00.000Z",
      nextEndAt: "2026-04-17T11:42:00.000Z",
      items: [
        {
          id: "event-1",
          title: "Design sync",
          startAt: "2026-04-17T11:00:00.000Z",
          endAt: "2026-04-17T11:42:00.000Z",
          location: "Room 3B",
          meetingUrl: "https://meet.google.com/design-sync",
        },
        {
          id: "event-2",
          title: "Retrospective",
          startAt: "2026-04-17T13:00:00.000Z",
          endAt: "2026-04-17T13:30:00.000Z",
        },
      ],
    },
    tasks: {
      items: [],
      dueTodayCount: 2,
      overdueCount: 1,
    },
    inbox: {
      unreadCount: 6,
      items: [],
    },
    focus: {
      active: true,
      reason: "focus on",
      nextTransitionAt: "2026-04-17T11:42:00.000Z",
      recommendedIntentTags: ["focus", "calendar"],
    },
  };
}

function createGithubPulse(): GithubPulse {
  return {
    profile: {
      login: "migue",
    },
    assignedPullRequests: [
      {
        id: 101,
        number: 101,
        repository: "prometeo/front",
        title: "Review requested",
        updatedAt: "2026-04-17T09:12:00.000Z",
        hasFailingChecks: true,
      },
      {
        id: 102,
        number: 102,
        repository: "prometeo/api",
        title: "Follow-up cleanup",
        updatedAt: "2026-04-17T08:00:00.000Z",
        hasFailingChecks: false,
      },
    ],
    notifications: [
      {
        id: "notif-1",
        reason: "review_requested",
        repository: "prometeo/front",
        title: "Review requested",
        unread: true,
      },
      {
        id: "notif-2",
        reason: "mention",
        repository: "prometeo/api",
        title: "Secondary thread",
        unread: true,
      },
    ],
    mentionsCount: 3,
    failingChecksCount: 1,
  };
}

describe("compact provider widgets", () => {
  it("registers dedicated compact entries for Google and GitHub widgets", async () => {
    const entries = await loadModulesIndex();
    const byId = new Map(
      entries.map((entry) => [entry.meta.id, entry.meta.entry]),
    );

    expect(byId.get("calendar-agenda-widget")).toBe("./index.tsx");
    expect(byId.get("calendar-agenda-widget-compact")).toBe("./compact.tsx");
    expect(byId.get("github-pulse-widget")).toBe("./index.tsx");
    expect(byId.get("github-pulse-widget-compact")).toBe("./compact.tsx");
  });

  it("renders a compact Google agenda summary with next event and busy state", () => {
    const html = renderToStaticMarkup(
      <CalendarAgendaCompactView
        title="Calendar Agenda"
        summary={createGoogleSummary()}
        loading={false}
        error={null}
      />,
    );

    expect(html).toContain("Busy");
    expect(html).toContain("Design sync");
    expect(html).toContain("Now");
  });

  it("renders a compact GitHub pulse summary with the main signal and quick facts only", () => {
    const html = renderToStaticMarkup(
      <GithubPulseCompactView
        title="GitHub Pulse"
        pulse={createGithubPulse()}
        loading={false}
        error={null}
      />,
    );

    expect(html).toContain("Review requested");
    expect(html).toContain("prometeo/front");
    expect(html).toContain("2 PRs");
    expect(html).toContain("1 failing");
    expect(html).not.toContain("Secondary thread");
  });
});
