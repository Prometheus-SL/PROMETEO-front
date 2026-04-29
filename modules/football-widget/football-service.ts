import { api } from "@/lib/api";

export type FootballMatchState = "live" | "upcoming" | "finished";

export interface FootballTeam {
  id: number;
  name: string;
  shortName: string;
  code: string;
  crest: string;
}

export interface FootballMatchSide {
  team: FootballTeam;
  score: number | null;
}

export interface FootballMatch {
  id: number;
  tournamentId: number;
  round: number | null;
  startTimestamp: number;
  status: string;
  statusDescription: string;
  home: FootballMatchSide;
  away: FootballMatchSide;
}

export interface FootballHighlights {
  videoId: string;
}

export interface FootballSnapshot {
  state: FootballMatchState;
  team: FootballTeam;
  lastMatch: FootballMatch | null;
  nextMatch: FootballMatch | null;
  liveMatch: FootballMatch | null;
  highlights: FootballHighlights | null;
}

export interface FootballStandingsRow {
  position: number;
  team: FootballTeam;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  form: Array<'W' | 'D' | 'L'>;
}

export interface FootballStandings {
  leagueId: string;
  rows: FootballStandingsRow[];
}

export interface FootballFeatured {
  match: FootballMatch | null;
  highlights: FootballHighlights | null;
}

export interface FootballLeague {
  id: string;
  label: string;
  country: string;
  highlightsChannelUrl: string | null;
  highlightsChannelLabel: string | null;
}

const BASE = "/api/v1/integrations/football";

export const footballApi = {
  listLeagues: () => api.getData<FootballLeague[]>(`${BASE}/leagues`),
  getSnapshotByName: (leagueId: string, name: string) =>
    api.getData<FootballSnapshot>(
      `${BASE}/leagues/${leagueId}/team-snapshot?name=${encodeURIComponent(name)}`,
    ),
  getStandings: (leagueId: string) =>
    api.getData<FootballStandings>(`${BASE}/leagues/${leagueId}/standings`),
  listTeams: (leagueId: string) =>
    api.getData<FootballTeam[]>(`${BASE}/leagues/${leagueId}/teams`),
  searchTeams: (leagueId: string, query: string) =>
    api.getData<FootballTeam[]>(
      `${BASE}/leagues/${leagueId}/teams/search?q=${encodeURIComponent(query)}`,
    ),
  getFeatured: (leagueId: string) =>
    api.getData<FootballFeatured>(`${BASE}/leagues/${leagueId}/featured`),
};
