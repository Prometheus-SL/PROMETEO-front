import { z } from "zod";

export const schema = z.object({
    mode: z.enum(["auto", "agent"]).default("auto"),
    agentId: z.string().optional(),
    title: z.string().optional(),
    allowLocalEmbed: z.boolean().default(true),
    refreshFallbackMs: z.number().min(5000).default(15000),
});

export default schema;
