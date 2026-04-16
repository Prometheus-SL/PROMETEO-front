import { api } from "@/lib/api";

export type GithubPulseNotification = {
  id: string | null;
  reason: string;
  repository?: string | null;
  title: string;
  type?: string;
  unread: boolean;
  updatedAt?: string | null;
  url?: string | null;
};

export type GithubAssignedPullRequest = {
  id: number | null;
  number?: number | null;
  repository?: string | null;
  title: string;
  updatedAt?: string | null;
  url?: string | null;
  hasFailingChecks: boolean;
  checksState?: string;
  checksCount?: number;
};

export type GithubPulse = {
  provider?: {
    status?: string;
    connectedAt?: string | null;
    tokenExpiresAt?: string | null;
    lastError?: string | null;
    profile?: Record<string, unknown> | null;
    scopes?: string[];
  };
  profile: {
    login?: string | null;
    displayName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    htmlUrl?: string | null;
  };
  assignedPullRequests: GithubAssignedPullRequest[];
  notifications: GithubPulseNotification[];
  mentionsCount: number;
  failingChecksCount: number;
  error?: string;
};

export const githubService = {
  async getPulse(): Promise<GithubPulse> {
    return api.getData<GithubPulse>("/api/v1/github/pulse");
  },
};
