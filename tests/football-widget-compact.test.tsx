// @vitest-environment jsdom
// Tell React that act() is expected in this test environment.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";

import { ScoreLine, Crest } from "../modules/football-widget/widget-ui";
import type {
  FootballMatch,
  FootballMatchState,
} from "../modules/football-widget/football-service";
import { SharedContextProvider } from "../src/providers/SharedContextProvider";
import FootballWidget1x1 from "../modules/football-widget/index1x1";

// ---------------------------------------------------------------------------
// Mock the network boundary: footballApi.
// vi.mock is hoisted — data used inside the factory must be defined via
// vi.hoisted so the reference is available at hoist time.
// ---------------------------------------------------------------------------
const mockApi = vi.hoisted(() => {
  const teamMCI = { id: 65, name: "Manchester City FC", shortName: "Man City", code: "MCI", crest: "" };
  const teamRMA_mock = { id: 86, name: "Real Madrid CF", shortName: "Real Madrid", code: "RMA", crest: "" };
  const mockSnapshot = {
    state: "finished" as const,
    team: teamMCI,
    lastMatch: {
      id: 1, tournamentId: 8, round: 32,
      startTimestamp: 1_700_000_000,
      status: "finished", statusDescription: "Ended",
      home: { team: teamMCI, score: 2 },
      away: { team: teamRMA_mock, score: 1 },
    },
    nextMatch: null,
    liveMatch: null,
    highlights: null,
  };
  return {
    listLeagues: vi.fn().mockResolvedValue([]),
    getStandings: vi.fn().mockResolvedValue({ leagueId: "premier", rows: [] }),
    getSnapshotByName: vi.fn().mockResolvedValue(mockSnapshot),
    getFeatured: vi.fn().mockResolvedValue({ match: null, highlights: null }),
    resolveTeam: vi.fn().mockResolvedValue({ leagueId: "premier", team: teamMCI }),
    listTeams: vi.fn().mockResolvedValue([]),
    searchTeams: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("../modules/football-widget/football-service", async (importOriginal) => {
  const original = await importOriginal<typeof import("../modules/football-widget/football-service")>();
  return {
    ...original,
    footballApi: mockApi,
  };
});

// ---------------------------------------------------------------------------
// Original test data (unchanged from before).
// ---------------------------------------------------------------------------
const teamRMA = { id: 86, name: "Real Madrid", shortName: "Real Madrid", code: "RMA", crest: "https://crests.football-data.org/86.png" };
const teamFCB = { id: 81, name: "Barcelona", shortName: "Barcelona", code: "BAR", crest: "https://crests.football-data.org/81.svg" };

function makeMatch(state: FootballMatchState): FootballMatch {
  return {
    id: 1,
    tournamentId: 8,
    round: 32,
    startTimestamp: Math.floor(Date.now() / 1000) + (state === "upcoming" ? 7200 : -3600),
    status: state === "live" ? "inprogress" : state === "upcoming" ? "notstarted" : "finished",
    statusDescription: state === "live" ? "2nd half" : state === "upcoming" ? "Not started" : "Ended",
    home: { team: teamRMA, score: state === "upcoming" ? null : 2 },
    away: { team: teamFCB, score: state === "upcoming" ? null : 1 },
  };
}

describe("Football compact primitives", () => {
  it("ScoreLine renders the home and away scores", () => {
    const html = renderToStaticMarkup(<ScoreLine match={makeMatch("finished")} compact />);
    expect(html).toContain("2");
    expect(html).toContain("1");
    expect(html).toContain("-");
  });

  it("ScoreLine renders zeros when scores are null", () => {
    const match = makeMatch("upcoming");
    const html = renderToStaticMarkup(<ScoreLine match={match} compact />);
    expect(html).toContain("0");
  });

  it("Crest renders the team code as fallback when crest URL is empty", () => {
    const html = renderToStaticMarkup(
      <Crest team={{ id: 0, code: "RMA", shortName: "Real Madrid", name: "Real Madrid", crest: "" }} />,
    );
    expect(html).toContain("RMA");
  });

  it("Crest renders an img tag when crest URL is present", () => {
    const html = renderToStaticMarkup(<Crest team={teamRMA} />);
    expect(html).toContain("<img");
    expect(html).toContain(teamRMA.crest);
  });
});

// ---------------------------------------------------------------------------
// Step 4: leagues mode with a team — the 1x1 widget calls resolveTeam and
// then getSnapshotByName with the resolved league id.
// ---------------------------------------------------------------------------
describe("Football 1x1 widget — leagues mode / resolves team", () => {
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

  it("calls resolveTeam then getSnapshotByName with the resolved leagueId", async () => {
    await act(async () => {
      root.render(
        <SharedContextProvider persist={false}>
          <FootballWidget1x1
            config={{ leagueId: "leagues", teamName: "Manchester City" }}
          />
        </SharedContextProvider>,
      );
    });

    expect(mockApi.resolveTeam).toHaveBeenCalledWith("Manchester City");
    expect(mockApi.getSnapshotByName).toHaveBeenCalledWith("premier", "Manchester City");
    // Verify the resolved snapshot data is actually rendered (not just fetched).
    // mockSnapshot.lastMatch.home.team.code is "MCI" — the compact widget
    // renders team codes in the score line, so this string must be present.
    expect(container.textContent).toContain("MCI");
  });
});
