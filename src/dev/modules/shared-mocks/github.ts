import { http } from "msw";
import { z } from "zod";

import type { GithubPulse } from "@/services/github";

import {
  createModuleDevBackendUrl,
  createModuleDevSuccessResponse,
  createMswModuleDevMockAdapter,
} from "../msw";

const githubAssignedPullRequestSchema = z.object({
  id: z.number().nullable().default(null),
  number: z.number().nullable().optional(),
  repository: z.string().nullable().optional(),
  title: z.string().default("Shared mocks for provider widgets"),
  updatedAt: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  hasFailingChecks: z.boolean().default(false),
  checksState: z.string().optional(),
  checksCount: z.number().optional(),
});

const githubNotificationSchema = z.object({
  id: z.string().nullable().default(null),
  reason: z.string().default("review_requested"),
  repository: z.string().nullable().optional(),
  title: z.string().default("Please review the sandbox branch"),
  type: z.string().optional(),
  unread: z.boolean().default(true),
  updatedAt: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
});

const githubPulseSchema = z.object({
  provider: z
    .object({
      status: z.string().default("connected"),
      connectedAt: z.string().nullable().default("2026-04-17T07:40:00.000Z"),
      tokenExpiresAt: z.string().nullable().default("2026-04-17T19:40:00.000Z"),
      lastError: z.string().nullable().default(null),
      profile: z.record(z.string(), z.unknown()).nullable().default({
        login: "migue",
      }),
      scopes: z.array(z.string()).default(["repo", "notifications"]),
    })
    .optional(),
  profile: z.object({
    login: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
    htmlUrl: z.string().nullable().optional(),
  }),
  assignedPullRequests: z.array(githubAssignedPullRequestSchema).default([
    {
      id: 204,
      number: 204,
      repository: "prometeo/front",
      title: "Implement shared adapters for DevModules",
      updatedAt: "2026-04-17T09:10:00.000Z",
      hasFailingChecks: false,
      checksState: "success",
      checksCount: 6,
    },
    {
      id: 205,
      number: 205,
      repository: "prometeo/api",
      title: "Tighten provider-backed widget contracts",
      updatedAt: "2026-04-17T08:05:00.000Z",
      hasFailingChecks: true,
      checksState: "failure",
      checksCount: 3,
    },
  ]),
  notifications: z.array(githubNotificationSchema).default([
    {
      id: "notif-1",
      reason: "review_requested",
      repository: "prometeo/front",
      title: "Review the DevModules mock registry",
      unread: true,
      updatedAt: "2026-04-17T09:12:00.000Z",
    },
    {
      id: "notif-2",
      reason: "mention",
      repository: "prometeo/api",
      title: "Mentioned in release checklist",
      unread: true,
      updatedAt: "2026-04-17T07:15:00.000Z",
    },
  ]),
  mentionsCount: z.number().default(2),
  failingChecksCount: z.number().default(1),
  error: z.string().optional(),
});

const DEFAULT_GITHUB_PULSE = githubPulseSchema.parse({
  profile: {
    login: "migue",
    displayName: "Miguel",
    email: "migue@prometeo.dev",
    avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
    htmlUrl: "https://github.com/migue",
  },
});

const githubMockStateSchema = z.object({
  pulse: githubPulseSchema.default(DEFAULT_GITHUB_PULSE),
});

type GithubMockState = z.infer<typeof githubMockStateSchema>;

const adapter = createMswModuleDevMockAdapter<GithubMockState>({
  stateSchema: githubMockStateSchema,
  buildHandlers(state) {
    return [
      http.get(createModuleDevBackendUrl("/api/v1/github/pulse"), () =>
        createModuleDevSuccessResponse<GithubPulse>(state.pulse),
      ),
    ];
  },
});

export default adapter;
