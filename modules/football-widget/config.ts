import { z } from "zod";

export const schema = z.object({
  // "leagues": global mode — the team's domestic league is auto-detected
  // from teamName. "champions": separate Champions League mode (unchanged).
  leagueId: z.enum(["leagues", "champions"]).default("leagues"),
  teamName: z.string().default(""),
});

export type FootballWidgetConfig = z.infer<typeof schema>;

export default schema;
