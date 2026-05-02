import type { WledFullResponse, WledState } from "./types";

const DEFAULT_WLED_REQUEST_TIMEOUT_MS = 8000;

export class WledApi {
    private baseUrl: string;

    constructor(ip: string, useSsl = false) {
        const protocol = useSsl ? "https" : "http";
        this.baseUrl = `${protocol}://${ip}`;
    }

    private async request<T>(
        endpoint: string,
        options?: RequestInit,
    ): Promise<T> {
        const controller = new AbortController();
        const timeoutId = globalThis.setTimeout(() => {
            controller.abort();
        }, DEFAULT_WLED_REQUEST_TIMEOUT_MS);

        let response: Response;
        try {
            response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                method: options?.method ?? "GET",
                headers: {
                    "Content-Type": "application/json",
                    ...options?.headers,
                },
                signal: controller.signal,
            });
        } catch (error) {
            globalThis.clearTimeout(timeoutId);
            if (controller.signal.aborted) {
                throw new Error(
                    `WLED API timeout after ${DEFAULT_WLED_REQUEST_TIMEOUT_MS}ms`,
                );
            }
            throw error;
        }

        globalThis.clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(
                `WLED API error: ${response.status} ${response.statusText}`,
            );
        }

        return response.json() as Promise<T>;
    }

    async getFullState(): Promise<WledFullResponse> {
        return this.request<WledFullResponse>("/json");
    }

    async getEffects(): Promise<string[]> {
        return this.request<string[]>("/json/eff");
    }

    async getPalettes(): Promise<string[]> {
        return this.request<string[]>("/json/pal");
    }

    async setState(
        partial: Record<string, unknown>,
    ): Promise<WledState> {
        return this.request<WledState>("/json/state", {
            method: "POST",
            body: JSON.stringify({ ...partial, v: true }),
        });
    }

    async toggle(): Promise<WledState> {
        return this.setState({ on: "t" });
    }

    async turnOn(): Promise<WledState> {
        return this.setState({ on: true });
    }

    async turnOff(): Promise<WledState> {
        return this.setState({ on: false });
    }

    async setBrightness(bri: number): Promise<WledState> {
        return this.setState({ bri: Math.max(1, Math.min(255, Math.round(bri))) });
    }

    async setSegmentColor(
        segId: number,
        col: number[][],
    ): Promise<WledState> {
        return this.setState({ seg: [{ id: segId, col }] });
    }

    async setSegmentEffect(
        segId: number,
        fx: number,
        sx?: number,
        ix?: number,
    ): Promise<WledState> {
        const seg: Record<string, unknown> = { id: segId, fx };
        if (sx !== undefined) seg.sx = sx;
        if (ix !== undefined) seg.ix = ix;
        return this.setState({ seg: [seg] });
    }

    async setSegmentPalette(
        segId: number,
        pal: number,
    ): Promise<WledState> {
        return this.setState({ seg: [{ id: segId, pal }] });
    }

    async toggleSegment(segId: number): Promise<WledState> {
        return this.setState({ seg: [{ id: segId, on: "t" }] });
    }

    async setPreset(ps: number): Promise<WledState> {
        return this.setState({ ps });
    }
}

export default WledApi;
