import { defineModuleDev } from "@/dev/modules/helpers";

export default defineModuleDev({
  presets: [
    {
      entryId: "football-widget",
      id: "finished-with-team",
      name: "Finished + team",
      config: { leagueId: "leagues", teamName: "Real Madrid" },
    },
    {
      entryId: "football-widget",
      id: "no-team",
      name: "No favorite team",
      config: { leagueId: "leagues", teamName: "" },
    },
    {
      entryId: "football-widget-compact",
      id: "compact-finished",
      name: "Compact · finished",
      config: { leagueId: "leagues", teamName: "Real Madrid" },
    },
    {
      entryId: "football-widget-compact",
      id: "compact-upcoming",
      name: "Compact · upcoming",
      config: { leagueId: "leagues", teamName: "Real Madrid" },
    },
    {
      entryId: "football-widget-compact",
      id: "compact-live",
      name: "Compact · live",
      config: { leagueId: "leagues", teamName: "Real Madrid" },
    },
    {
      entryId: "football-widget-compact",
      id: "compact-no-team",
      name: "Compact · no team (empty state)",
      config: { leagueId: "leagues", teamName: "" },
    },
  ],
});
