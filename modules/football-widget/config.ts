import { z } from "zod";

export const schema = z.object({
  leagueId: z.enum(["laliga"]).default("laliga"),
  teamName: z.string().default(""),
});

export type FootballWidgetConfig = z.infer<typeof schema>;

export default schema;
