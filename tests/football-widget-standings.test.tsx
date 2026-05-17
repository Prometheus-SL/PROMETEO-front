// @vitest-environment jsdom
// Tell React that act() is expected in this test environment.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";

import {
  HighlightVideo,
  StandingsTable,
} from "../modules/football-widget/widget-ui";
import type {
  FootballStandings,
} from "../modules/football-widget/football-service";
import { SharedContextProvider } from "../src/providers/SharedContextProvider";
import FootballWidget3x3 from "../modules/football-widget/index3x3";

// ---------------------------------------------------------------------------
// Mock the network boundary: footballApi. All methods default to a promise
// that never resolves so tests that don't configure them fail-fast rather
// than silently passing.
// ---------------------------------------------------------------------------
vi.mock("../modules/football-widget/football-service", async (importOriginal) => {
  const original = await importOriginal<typeof import("../modules/football-widget/football-service")>();
  return {
    ...original,
    footballApi: {
      listLeagues: vi.fn().mockResolvedValue([]),
      getStandings: vi.fn().mockResolvedValue({ leagueId: "laliga", rows: [] }),
      getSnapshotByName: vi.fn().mockResolvedValue(null),
      getFeatured: vi.fn().mockResolvedValue({ match: null, highlights: null }),
      resolveTeam: vi.fn().mockResolvedValue({ leagueId: "laliga", team: { id: 86, name: "Real Madrid", shortName: "Real Madrid", code: "RMA", crest: "" } }),
      listTeams: vi.fn().mockResolvedValue([]),
      searchTeams: vi.fn().mockResolvedValue([]),
    },
  };
});

// Pull the mocked api reference so we can inspect spy calls in tests.
const { footballApi } = await import("../modules/football-widget/football-service");

const teamRMA = { id: 86, name: "Real Madrid", shortName: "Real Madrid", code: "RMA", crest: "https://crests.football-data.org/86.png" };
const teamFCB = { id: 81, name: "Barcelona", shortName: "Barcelona", code: "BAR", crest: "https://crests.football-data.org/81.svg" };
const teamATM = { id: 78, name: "Atlético", shortName: "Atlético", code: "ATM", crest: "https://crests.football-data.org/78.svg" };

const standings: FootballStandings = {
  leagueId: "laliga",
  rows: [
    { position: 1, team: teamFCB, matches: 32, wins: 22, draws: 5, losses: 5, goalsFor: 70, goalsAgainst: 30, goalDiff: 40, points: 71, form: ['W','W','D','L','W'] },
    { position: 2, team: teamRMA, matches: 32, wins: 21, draws: 6, losses: 5, goalsFor: 65, goalsAgainst: 28, goalDiff: 37, points: 69, form: ['W','L','D','W','W'] },
    { position: 3, team: teamATM, matches: 32, wins: 18, draws: 8, losses: 6, goalsFor: 55, goalsAgainst: 32, goalDiff: 23, points: 62, form: ['D','W','W','L','D'] },
  ],
};

describe("Football StandingsTable", () => {
  it("marks the favorite team's row with data-favorite", () => {
    const html = renderToStaticMarkup(
      <StandingsTable standings={standings} favoriteTeamName="Real Madrid" />,
    );
    expect(html).toContain('data-favorite="true"');
    expect(html).toMatch(/data-favorite="true"[^>]*>[\s\S]*?Real Madrid/);
  });

  it("shows positive goal difference with a leading +", () => {
    const html = renderToStaticMarkup(
      <StandingsTable standings={standings} favoriteTeamName="" />,
    );
    expect(html).toContain("+40");
    expect(html).toContain("+37");
  });

  it("does not mark any row as favorite when favoriteTeamName is empty", () => {
    const html = renderToStaticMarkup(
      <StandingsTable standings={standings} favoriteTeamName="" />,
    );
    expect(html).not.toContain('data-favorite="true"');
  });
});

describe("Football HighlightVideo", () => {
  it("renders the embed when videoId is present", () => {
    const html = renderToStaticMarkup(
      <HighlightVideo videoId="abc123" channelUrl={null} channelLabel="" />,
    );
    expect(html).toContain("<iframe");
    expect(html).toContain("youtube.com/embed/abc123");
  });

  it("falls back to channel link when only channelUrl is set", () => {
    const html = renderToStaticMarkup(
      <HighlightVideo videoId={null} channelUrl="https://www.youtube.com/@LaLiga" channelLabel="LaLiga on YouTube" />,
    );
    expect(html).toContain('href="https://www.youtube.com/@LaLiga"');
    expect(html).toContain("Watch on YouTube");
    expect(html).toContain("LaLiga on YouTube");
    expect(html).not.toContain("<iframe");
  });

  it("renders the placeholder when neither is available", () => {
    const html = renderToStaticMarkup(
      <HighlightVideo videoId={null} channelUrl={null} channelLabel="" />,
    );
    expect(html).toContain("Highlights unavailable");
  });
});

// ---------------------------------------------------------------------------
// Step 3: empty-team state — 3x3 widget renders "Type a team" and makes no
// network calls when leagueId="leagues" and teamName="".
// ---------------------------------------------------------------------------
describe("Football 3x3 widget — leagues mode / empty team", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("renders the empty-team state without resolving a team or fetching standings", async () => {
    await act(async () => {
      root.render(
        <SharedContextProvider persist={false}>
          <FootballWidget3x3 config={{ leagueId: "leagues", teamName: "" }} />
        </SharedContextProvider>,
      );
    });

    expect(container.textContent).toContain("Type a team to see its league.");
    expect(footballApi.resolveTeam).not.toHaveBeenCalled();
    expect(footballApi.getStandings).not.toHaveBeenCalled();
  });
});
