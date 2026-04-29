import { http } from "msw";
import { z } from "zod";

import {
  createModuleDevBackendUrl,
  createModuleDevSuccessResponse,
  createMswModuleDevMockAdapter,
} from "@/dev/modules";

const teamSchema = z.object({
  id: z.number(),
  name: z.string(),
  shortName: z.string(),
  code: z.string(),
  crest: z.string(),
});

const matchSchema = z.object({
  id: z.number(),
  tournamentId: z.number(),
  round: z.number().nullable(),
  startTimestamp: z.number(),
  status: z.string(),
  statusDescription: z.string(),
  home: z.object({ team: teamSchema, score: z.number().nullable() }),
  away: z.object({ team: teamSchema, score: z.number().nullable() }),
});

const teamRMA = { id: 86, name: "Real Madrid CF", shortName: "Real Madrid", code: "RMA", crest: "https://crests.football-data.org/86.png" };
const teamFCB = { id: 81, name: "FC Barcelona", shortName: "Barça", code: "FCB", crest: "https://crests.football-data.org/81.svg" };

const lastMatchDefault = {
  id: 12345678,
  tournamentId: 2014,
  round: 32,
  startTimestamp: Math.floor(Date.now() / 1000) - 24 * 3600,
  status: "finished",
  statusDescription: "Ended",
  home: { team: teamRMA, score: 2 },
  away: { team: teamFCB, score: 1 },
};

const stateSchema = z.object({
  scenario: z.enum(["finished", "upcoming", "live", "noTeam", "unconfigured", "error"]).default("finished"),
  snapshotState: z.enum(["finished", "upcoming", "live"]).default("finished"),
  lastMatch: matchSchema.default(lastMatchDefault),
  highlightsVideoId: z.string().nullable().default("dQw4w9WgXcQ"),
});

type FootballMockState = z.infer<typeof stateSchema>;

function buildSnapshot(state: FootballMockState) {
  const last = state.lastMatch;
  const next = {
    ...last,
    id: last.id + 1,
    round: (last.round ?? 32) + 1,
    startTimestamp: Math.floor(Date.now() / 1000) + 12 * 3600,
    status: state.snapshotState === "live" ? "inprogress" : "notstarted",
    statusDescription: state.snapshotState === "live" ? "2nd half" : "Not started",
    home: { team: { id: 78, name: "Club Atlético de Madrid", shortName: "Atlético", code: "ATM", crest: "https://crests.football-data.org/78.svg" }, score: state.snapshotState === "live" ? 0 : null },
    away: { team: last.home.team, score: state.snapshotState === "live" ? 1 : null },
  };

  return {
    state: state.snapshotState,
    team: last.home.team,
    lastMatch: last,
    nextMatch: next,
    liveMatch: state.snapshotState === "live" ? next : null,
    highlights: state.highlightsVideoId
      ? { videoId: state.highlightsVideoId }
      : null,
  };
}

function buildStandings() {
  const teams = [
    { id: 81, name: "FC Barcelona", shortName: "Barça", code: "FCB", crest: "https://crests.football-data.org/81.svg" },
    teamRMA,
    { id: 78, name: "Club Atlético de Madrid", shortName: "Atlético", code: "ATM", crest: "https://crests.football-data.org/78.svg" },
    { id: 90, name: "Real Betis", shortName: "Betis", code: "BET", crest: "https://crests.football-data.org/90.svg" },
    { id: 559, name: "Sevilla FC", shortName: "Sevilla", code: "SEV", crest: "https://crests.football-data.org/559.svg" },
    { id: 77, name: "Athletic Club", shortName: "Athletic", code: "ATH", crest: "https://crests.football-data.org/77.svg" },
    { id: 94, name: "Villarreal CF", shortName: "Villarreal", code: "VIL", crest: "https://crests.football-data.org/94.svg" },
    { id: 92, name: "Real Sociedad", shortName: "Real Sociedad", code: "RSO", crest: "https://crests.football-data.org/92.svg" },
  ];
  const formSamples: Array<Array<"W" | "D" | "L">> = [
    ["W", "W", "D", "L", "W"],
    ["W", "L", "D", "W", "W"],
    ["D", "W", "W", "L", "D"],
    ["L", "W", "D", "W", "L"],
    ["W", "L", "L", "D", "W"],
    ["D", "D", "W", "L", "W"],
    ["L", "D", "W", "L", "D"],
    ["L", "L", "D", "W", "L"],
  ];
  return {
    leagueId: "laliga",
    rows: teams.map((team, i) => ({
      position: i + 1,
      team,
      matches: 32,
      wins: 24 - i * 2,
      draws: 5,
      losses: 3 + i,
      goalsFor: 80 - i * 5,
      goalsAgainst: 30 + i * 4,
      goalDiff: 50 - i * 9,
      points: 76 - i * 5,
      form: formSamples[i % formSamples.length],
    })),
  };
}

function buildHandlers(state: FootballMockState) {
  return [
    http.get(createModuleDevBackendUrl("/api/v1/integrations/football/leagues"), () =>
      createModuleDevSuccessResponse([{
        id: "laliga",
        label: "LaLiga",
        country: "Spain",
        highlightsChannelUrl: "https://www.youtube.com/@LaLiga",
        highlightsChannelLabel: "LaLiga on YouTube",
      }]),
    ),
    http.get(createModuleDevBackendUrl("/api/v1/integrations/football/leagues/laliga/standings"), () =>
      createModuleDevSuccessResponse(buildStandings()),
    ),
    http.get(createModuleDevBackendUrl("/api/v1/integrations/football/leagues/laliga/featured"), () =>
      createModuleDevSuccessResponse({
        match: state.lastMatch,
        highlights: state.highlightsVideoId
          ? { videoId: state.highlightsVideoId }
          : null,
      }),
    ),
    http.get(createModuleDevBackendUrl("/api/v1/integrations/football/leagues/laliga/teams"), () =>
      createModuleDevSuccessResponse([teamRMA, teamFCB]),
    ),
    http.get(createModuleDevBackendUrl("/api/v1/integrations/football/leagues/:leagueId/team-snapshot"), () =>
      createModuleDevSuccessResponse(buildSnapshot(state)),
    ),
  ];
}

const adapter = createMswModuleDevMockAdapter<FootballMockState>({
  stateSchema,
  buildHandlers,
});

export default adapter;
