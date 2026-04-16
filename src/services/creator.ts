import { api } from "@/lib/api";

export type CreatorSource = {
  id: string;
  label?: string;
  status: "live" | "offline" | "unavailable" | string;
  headline: string;
  url?: string | null;
  startedAt?: string | null;
};

export type CreatorStatus = {
  online: boolean;
  liveCount: number;
  sources: CreatorSource[];
};

export const creatorService = {
  async getStatus(): Promise<CreatorStatus> {
    return api.getData<CreatorStatus>("/api/v1/creator/status");
  },
};
