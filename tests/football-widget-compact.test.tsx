import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ScoreLine, Crest } from "../modules/football-widget/widget-ui";
import type {
  FootballMatch,
  FootballMatchState,
} from "../modules/football-widget/football-service";

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
