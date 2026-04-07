import type { LifxLight } from "./types";

const LIFX_API_BASE = "https://api.lifx.com/v1";

export class LifxApi {
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    private async request<T>(
        endpoint: string,
        options?: RequestInit
    ): Promise<T> {
        const response = await fetch(`${LIFX_API_BASE}${endpoint}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
                ...options?.headers,
            },
        });

        if (!response.ok) {
            throw new Error(
                `LIFX API error: ${response.status} ${response.statusText}`
            );
        }

        return response.json() as Promise<T>;
    }

    async getLights(selector?: string): Promise<LifxLight[]> {
        const endpoint = selector ? `/lights/${selector}` : "/lights";
        return this.request<LifxLight[]>(endpoint);
    }

    async toggleLight(lightId: string): Promise<void> {
        await this.request(`/lights/${lightId}/toggle`, {
            method: "POST",
        });
    }

    async turnOnLight(lightId: string): Promise<void> {
        await this.request(`/lights/${lightId}/on`, {
            method: "POST",
        });
    }

    async turnOffLight(lightId: string): Promise<void> {
        await this.request(`/lights/${lightId}/off`, {
            method: "POST",
        });
    }

    async setBrightness(lightId: string, brightness: number): Promise<void> {
        await this.request(`/lights/${lightId}/state`, {
            method: "PUT",
            body: JSON.stringify({
                brightness: Math.max(0, Math.min(1, brightness / 100)),
            }),
        });
    }

    async setColor(
        lightId: string,
        hue: number,
        saturation: number,
        brightness?: number
    ): Promise<void> {
        const body: Record<string, unknown> = {
            color: `hsl(${hue},${saturation}%,50%)`,
        };

        if (brightness !== undefined) {
            body.brightness = Math.max(0, Math.min(1, brightness / 100));
        }

        await this.request(`/lights/${lightId}/state`, {
            method: "PUT",
            body: JSON.stringify(body),
        });
    }

    async setTemperature(lightId: string, kelvin: number): Promise<void> {
        await this.request(`/lights/${lightId}/state`, {
            method: "PUT",
            body: JSON.stringify({
                color: `kelvin:${Math.max(1500, Math.min(4000, kelvin))}`,
            }),
        });
    }
}

export default LifxApi;
