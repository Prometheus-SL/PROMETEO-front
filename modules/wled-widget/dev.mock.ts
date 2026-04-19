import { HttpResponse, http } from "msw";
import { z } from "zod";

import { createMswModuleDevMockAdapter } from "@/dev/modules";
import type { WledFullResponse, WledState } from "./types";

const WLED_EFFECTS = [
    "Solid",
    "Blink",
    "Breathe",
    "Wipe",
    "Color Wipe",
    "Rainbow",
    "Theater Chase",
    "Twinkle",
    "Fire Flicker",
    "Colorloop",
    "Scan",
    "Dual Scan",
    "Fade",
    "Chase",
    "Running Lights",
    "Sparkle",
    "Fire 2012",
    "Fireworks",
    "Rain",
    "Meteor",
];

const WLED_PALETTES = [
    "Default",
    "Random Cycle",
    "Primary Color",
    "Based on Primary",
    "Set Colors",
    "Based on Set",
    "Party",
    "Cloud",
    "Lava",
    "Ocean",
    "Forest",
    "Rainbow",
    "Rainbow Bands",
    "Sunset",
    "Rivendell",
    "Breeze",
];

const segmentSchema = z.object({
    id: z.number(),
    start: z.number(),
    stop: z.number(),
    on: z.boolean().default(true),
    bri: z.number().default(255),
    col: z.array(z.array(z.number())).default([
        [255, 100, 0],
        [0, 0, 0],
        [0, 0, 0],
    ]),
    fx: z.number().default(0),
    sx: z.number().default(128),
    ix: z.number().default(128),
    pal: z.number().default(0),
});

const wledMockStateSchema = z.object({
    ip: z.string().default("192.168.1.50"),
    name: z.string().default("WLED Escritorio"),
    on: z.boolean().default(true),
    bri: z.number().default(180),
    ledCount: z.number().default(60),
    segments: z
        .array(segmentSchema)
        .default([
            {
                id: 0,
                start: 0,
                stop: 30,
                on: true,
                bri: 255,
                col: [
                    [255, 60, 0],
                    [0, 0, 0],
                    [0, 0, 0],
                ],
                fx: 0,
                sx: 128,
                ix: 128,
                pal: 0,
            },
            {
                id: 1,
                start: 30,
                stop: 60,
                on: true,
                bri: 200,
                col: [
                    [0, 120, 255],
                    [0, 0, 0],
                    [0, 0, 0],
                ],
                fx: 5,
                sx: 100,
                ix: 128,
                pal: 11,
            },
        ]),
});

type WledMockState = z.infer<typeof wledMockStateSchema>;

function buildState(state: WledMockState): WledState {
    return {
        on: state.on,
        bri: state.bri,
        transition: 7,
        ps: -1,
        pl: -1,
        nl: { on: false, dur: 60, mode: 1, tbri: 0, rem: -1 },
        udpn: { send: false, recv: true },
        seg: state.segments.map((s) => ({
            id: s.id,
            start: s.start,
            stop: s.stop,
            len: s.stop - s.start,
            grp: 1,
            spc: 0,
            of: 0,
            on: s.on,
            bri: s.bri,
            cct: 127,
            col: s.col,
            fx: s.fx,
            sx: s.sx,
            ix: s.ix,
            pal: s.pal,
            sel: s.id === 0,
            rev: false,
            mi: false,
        })),
        mainseg: 0,
    };
}

function buildFullResponse(state: WledMockState): WledFullResponse {
    return {
        state: buildState(state),
        info: {
            ver: "0.14.4",
            vid: 2404290,
            leds: {
                count: state.ledCount,
                rgbw: false,
                wv: false,
                cct: false,
                fps: 42,
                pwr: 350,
                maxpwr: 850,
                maxseg: 32,
                seglc: state.segments.map((s) => s.stop - s.start),
                lc: state.segments.length,
            },
            name: state.name,
            udpport: 21324,
            live: false,
            fxcount: WLED_EFFECTS.length,
            palcount: WLED_PALETTES.length,
            wifi: { bssid: "AA:BB:CC:DD:EE:FF", signal: 78, channel: 6 },
            arch: "esp32",
            core: "v4.4.7",
            freeheap: 118784,
            uptime: 86400,
            brand: "WLED",
            product: "FOSS",
            mac: "AABBCCDDEEFF",
            ip: state.ip,
        },
        effects: WLED_EFFECTS,
        palettes: WLED_PALETTES,
    };
}

function buildHandlers(state: WledMockState) {
    const live = structuredClone(state);

    return [
        http.get(/^https?:\/\/[^/]+\/json$/, () => {
            return HttpResponse.json(buildFullResponse(live));
        }),
        http.get(/^https?:\/\/[^/]+\/json\/eff$/, () => {
            return HttpResponse.json(WLED_EFFECTS);
        }),
        http.get(/^https?:\/\/[^/]+\/json\/pal$/, () => {
            return HttpResponse.json(WLED_PALETTES);
        }),
        http.post(/^https?:\/\/[^/]+\/json\/state$/, async ({ request }) => {
            const body = (await request.json()) as Record<string, unknown>;

            if (typeof body.on === "boolean") live.on = body.on;
            if (body.on === "t") live.on = !live.on;
            if (typeof body.bri === "number") live.bri = body.bri;
            if (typeof body.ps === "number") {
                // preset — just acknowledge
            }

            if (Array.isArray(body.seg)) {
                for (const patch of body.seg as Record<string, unknown>[]) {
                    const segId = patch.id as number | undefined;
                    const seg = live.segments.find((s) => s.id === segId);
                    if (!seg) continue;

                    if (typeof patch.on === "boolean") seg.on = patch.on;
                    if (patch.on === "t") seg.on = !seg.on;
                    if (typeof patch.bri === "number") seg.bri = patch.bri;
                    if (typeof patch.fx === "number") seg.fx = patch.fx;
                    if (typeof patch.sx === "number") seg.sx = patch.sx;
                    if (typeof patch.ix === "number") seg.ix = patch.ix;
                    if (typeof patch.pal === "number") seg.pal = patch.pal;
                    if (Array.isArray(patch.col)) seg.col = patch.col as number[][];
                }
            }

            return HttpResponse.json(buildState(live));
        }),
    ];
}

const adapter = createMswModuleDevMockAdapter<WledMockState>({
    stateSchema: wledMockStateSchema,
    buildHandlers,
});

export default adapter;
