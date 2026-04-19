import { HttpResponse, http } from "msw";
import { z } from "zod";

import { createMswModuleDevMockAdapter } from "@/dev/modules";
import type { LifxLight } from "./types";

const lifxLightSchema = z.object({
    id: z.string(),
    label: z.string(),
    power: z.enum(["on", "off"]).default("on"),
    brightness: z.number().default(0.8),
    hue: z.number().default(220),
    saturation: z.number().default(0.65),
    kelvin: z.number().default(3500),
    hasColor: z.boolean().default(true),
    groupName: z.string().default("Oficina"),
});

const lifxMockStateSchema = z.object({
    lights: z
        .array(lifxLightSchema)
        .default([
            {
                id: "d073d5aabbcc",
                label: "Escritorio",
                power: "on",
                brightness: 0.85,
                hue: 250,
                saturation: 0.7,
                kelvin: 3500,
                hasColor: true,
                groupName: "Oficina",
            },
            {
                id: "d073d5ddeeff",
                label: "Tira LED",
                power: "on",
                brightness: 0.5,
                hue: 120,
                saturation: 0.9,
                kelvin: 3500,
                hasColor: true,
                groupName: "Oficina",
            },
            {
                id: "d073d5112233",
                label: "Lámpara techo",
                power: "off",
                brightness: 1.0,
                hue: 0,
                saturation: 0,
                kelvin: 4000,
                hasColor: false,
                groupName: "Salón",
            },
        ]),
});

type LifxMockState = z.infer<typeof lifxMockStateSchema>;

function toLifxLight(light: LifxMockState["lights"][number]): LifxLight {
    return {
        id: light.id,
        uuid: `${light.id}-0000-0000-0000-000000000000`,
        label: light.label,
        connected: true,
        power: light.power,
        brightness: light.brightness,
        color: {
            hue: light.hue,
            saturation: light.saturation,
            kelvin: light.kelvin,
        },
        product: {
            name: light.hasColor ? "LIFX A19" : "LIFX Mini White",
            identifier: light.hasColor ? "lifx_a19" : "lifx_mini_white",
            company: "LIFX",
            capabilities: {
                has_color: light.hasColor,
                has_variable_color_temp: true,
                has_infrared: false,
                has_multizone: false,
                min_kelvin: 1500,
                max_kelvin: 9000,
            },
        },
        last_seen: new Date().toISOString(),
        seconds_since_seen: 0,
        group: {
            id: light.groupName.toLowerCase().replace(/\s+/g, "-"),
            name: light.groupName,
        },
    };
}

function buildHandlers(state: LifxMockState) {
    const live = { lights: state.lights.map((l) => ({ ...l })) };

    function findLight(selector: string) {
        const id = selector.replace(/^id:/, "");
        return live.lights.find((l) => l.id === id);
    }

    return [
        http.get("https://api.lifx.com/v1/lights", () => {
            return HttpResponse.json(live.lights.map(toLifxLight));
        }),
        http.get("https://api.lifx.com/v1/lights/:selector", ({ params }) => {
            const light = findLight(String(params.selector));
            if (!light) return HttpResponse.json([], { status: 200 });
            return HttpResponse.json([toLifxLight(light)]);
        }),
        http.post("https://api.lifx.com/v1/lights/:selector/toggle", ({ params }) => {
            const light = findLight(String(params.selector));
            if (light) light.power = light.power === "on" ? "off" : "on";
            return HttpResponse.json({
                results: light ? [{ id: light.id, status: "ok" }] : [],
            });
        }),
        http.post("https://api.lifx.com/v1/lights/:selector/on", ({ params }) => {
            const light = findLight(String(params.selector));
            if (light) light.power = "on";
            return HttpResponse.json({
                results: light ? [{ id: light.id, status: "ok" }] : [],
            });
        }),
        http.post("https://api.lifx.com/v1/lights/:selector/off", ({ params }) => {
            const light = findLight(String(params.selector));
            if (light) light.power = "off";
            return HttpResponse.json({
                results: light ? [{ id: light.id, status: "ok" }] : [],
            });
        }),
        http.put(
            "https://api.lifx.com/v1/lights/:selector/state",
            async ({ params, request }) => {
                const light = findLight(String(params.selector));
                if (!light) {
                    return HttpResponse.json({ results: [] });
                }

                const body = (await request.json()) as Record<string, unknown>;

                if (typeof body.brightness === "number") {
                    light.brightness = body.brightness;
                }
                if (typeof body.color === "string") {
                    const colorStr = body.color as string;
                    const kelvinMatch = colorStr.match(/kelvin:(\d+)/);
                    if (kelvinMatch) {
                        light.kelvin = Number(kelvinMatch[1]);
                        light.saturation = 0;
                    }
                    const hueMatch = colorStr.match(/hue:(\d+)/);
                    const satMatch = colorStr.match(/saturation:([\d.]+)/);
                    if (hueMatch) light.hue = Number(hueMatch[1]);
                    if (satMatch) light.saturation = Number(satMatch[1]);
                }

                return HttpResponse.json({
                    results: [{ id: light.id, status: "ok" }],
                });
            },
        ),
    ];
}

const adapter = createMswModuleDevMockAdapter<LifxMockState>({
    stateSchema: lifxMockStateSchema,
    buildHandlers,
});

export default adapter;
