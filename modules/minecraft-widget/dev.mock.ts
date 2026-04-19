import { HttpResponse, http } from "msw";
import { z } from "zod";

import { createMswModuleDevMockAdapter } from "@/dev/modules";

const playerSchema = z.object({
    name_raw: z.string(),
    uuid: z.string().default("00000000-0000-0000-0000-000000000000"),
});

const minecraftMockStateSchema = z.object({
    online: z.boolean().default(true),
    host: z.string().default("mc.diosesmc.net"),
    port: z.number().default(25565),
    version: z.string().default("Paper 1.21.4"),
    motd: z.string().default("§aDiosesMC §7- §bBienvenido al servidor"),
    playersOnline: z.number().default(12),
    playersMax: z.number().default(100),
    players: z
        .array(playerSchema)
        .default([
            { name_raw: "xMigueZ", uuid: "a1b2c3d4-0000-0000-0000-000000000001" },
            { name_raw: "DiosesMC", uuid: "a1b2c3d4-0000-0000-0000-000000000002" },
            { name_raw: "CraftKing", uuid: "a1b2c3d4-0000-0000-0000-000000000003" },
            { name_raw: "BuilderPro", uuid: "a1b2c3d4-0000-0000-0000-000000000004" },
            { name_raw: "PvPGod99", uuid: "a1b2c3d4-0000-0000-0000-000000000005" },
        ]),
});

type MinecraftMockState = z.infer<typeof minecraftMockStateSchema>;

function buildHandlers(state: MinecraftMockState) {
    return [
        http.get("https://api.mcstatus.io/v2/status/java/:address", () => {
            if (!state.online) {
                return HttpResponse.json({
                    online: false,
                    host: state.host,
                    port: state.port,
                });
            }

            return HttpResponse.json({
                online: true,
                host: state.host,
                port: state.port,
                version: { name_raw: state.version },
                motd: {
                    clean: state.motd.replace(/§[0-9a-fk-or]/gi, ""),
                    html: state.motd,
                },
                players: {
                    online: state.playersOnline,
                    max: state.playersMax,
                    list: state.players,
                },
            });
        }),
    ];
}

const adapter = createMswModuleDevMockAdapter<MinecraftMockState>({
    stateSchema: minecraftMockStateSchema,
    buildHandlers,
});

export default adapter;
