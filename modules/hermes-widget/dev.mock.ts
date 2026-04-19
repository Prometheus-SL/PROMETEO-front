import type { ModuleDevMockAdapter } from "@/dev/modules/types";
import { z } from "zod";

import type {
    HermesAgent,
    HermesCommandResult,
    HermesMediaSnapshot,
    HermesSnapshot,
} from "./hermes-service";

export type HermesMockState = {
    agents: HermesAgent[];
    systemByAgentId: Record<string, HermesSnapshot>;
    mediaByAgentId: Record<string, HermesMediaSnapshot>;
    commandResults: HermesCommandResult[];
};

export type HermesMockHandlers = {
    onAgentData?: (snapshot: HermesSnapshot | HermesMediaSnapshot) => void;
    onAgentConnected?: (payload: { agentId: string }) => void;
    onAgentDisconnected?: (payload: { agentId: string }) => void;
    onCommandResult?: (payload: HermesCommandResult) => void;
    onError?: (message: string) => void;
};

declare global {
    interface Window {
        __PROMETEO_STORYBOOK_HERMES__?: HermesMockState;
        __PROMETEO_STORYBOOK_HERMES_HANDLERS__?: HermesMockHandlers[];
    }
}

function cloneValue<T>(value: T): T {
    if (typeof structuredClone === "function") {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
}

const DEFAULT_HERMES_STATE: HermesMockState = {
    agents: [
        {
            _id: "hermes-pc-1",
            agentId: "hermes-pc-1",
            name: "Studio PC",
            status: "online",
            lastSeen: "2026-04-16T10:30:00.000Z",
            lastData: "2026-04-16T10:30:00.000Z",
            updatedAt: "2026-04-16T10:30:00.000Z",
            computerInfo: {
                hostname: "studio-pc",
                os: { platform: "win32", release: "11", arch: "x64" },
                network: { ip: "192.168.1.42" },
            },
        },
    ],
    systemByAgentId: {
        "hermes-pc-1": {
            agentId: "hermes-pc-1",
            dataType: "system_status",
            timestamp: "2026-04-16T10:30:00.000Z",
            system: {
                hostname: "studio-pc",
                username: "migue",
                uptimeSeconds: 128000,
                os: { platform: "win32", release: "11", arch: "x64" },
            },
            resources: {
                cpu: { model: "AMD Ryzen 9", cores: 16, speedMHz: 4200, percent: 23 },
                memory: {
                    totalBytes: 68719476736,
                    freeBytes: 21474836480,
                    usedBytes: 47244640256,
                    percent: 68,
                },
                disks: [
                    {
                        drive: "C:",
                        totalBytes: 1000204886016,
                        freeBytes: 412316860416,
                        usedBytes: 587888025600,
                        percent: 58,
                    },
                ],
            },
            network: { ip: "192.168.1.42" },
            audio: {
                available: true,
                volumePercent: 42,
                muted: false,
                defaultOutputId: "speakers",
                defaultOutputName: "Studio Speakers",
                outputDevices: [
                    { id: "speakers", name: "Studio Speakers", isDefault: true },
                    { id: "headphones", name: "Desk Headphones" },
                ],
            },
        },
    },
    mediaByAgentId: {
        "hermes-pc-1": {
            agentId: "hermes-pc-1",
            dataType: "media_update",
            timestamp: "2026-04-16T10:30:00.000Z",
            media: {
                available: true,
                sourceAppId: "spotify",
                sourceAppName: "Spotify",
                provider: "spotify",
                title: "Nightcall",
                artist: "Kavinsky",
                album: "OutRun",
                artworkUrl:
                    "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80",
                playbackStatus: "playing",
                positionMs: 83000,
                durationMs: 262000,
                canPlay: true,
                canPause: true,
                canNext: true,
                canPrevious: true,
            },
        },
    },
    commandResults: [],
};

const hermesRecordSchema = z.record(z.string(), z.unknown());
const hermesAgentSchema = hermesRecordSchema as unknown as z.ZodType<HermesAgent>;
const hermesSnapshotSchema =
    hermesRecordSchema as unknown as z.ZodType<HermesSnapshot>;
const hermesMediaSnapshotSchema =
    hermesRecordSchema as unknown as z.ZodType<HermesMediaSnapshot>;
const hermesCommandResultSchema =
    hermesRecordSchema as unknown as z.ZodType<HermesCommandResult>;

const hermesMockStateSchema = z.object({
    agents: z.array(hermesAgentSchema).default(
        cloneValue(DEFAULT_HERMES_STATE.agents),
    ),
    systemByAgentId: z.record(
        z.string(),
        hermesSnapshotSchema,
    ).default(cloneValue(DEFAULT_HERMES_STATE.systemByAgentId)),
    mediaByAgentId: z.record(
        z.string(),
        hermesMediaSnapshotSchema,
    ).default(cloneValue(DEFAULT_HERMES_STATE.mediaByAgentId)),
    commandResults: z.array(hermesCommandResultSchema).default(
        cloneValue(DEFAULT_HERMES_STATE.commandResults),
    ),
}) as unknown as z.ZodType<HermesMockState>;

function applyWindowState(state: HermesMockState) {
    if (typeof window === "undefined") {
        return;
    }
    window.__PROMETEO_STORYBOOK_HERMES__ = cloneValue(state);
    window.__PROMETEO_STORYBOOK_HERMES_HANDLERS__ =
        window.__PROMETEO_STORYBOOK_HERMES_HANDLERS__ ?? [];
}

function cleanupWindowState() {
    if (typeof window === "undefined") {
        return;
    }
    delete window.__PROMETEO_STORYBOOK_HERMES__;
    delete window.__PROMETEO_STORYBOOK_HERMES_HANDLERS__;
}

const adapter: ModuleDevMockAdapter<HermesMockState> = {
    stateSchema: hermesMockStateSchema,

    createInitialState: () => hermesMockStateSchema.parse({}),

    apply(state) {
        applyWindowState(state);
    },

    cleanup() {
        cleanupWindowState();
    },
};

export default adapter;
