import { describe, expect, it } from "vitest";
import { computeMatchups } from "../modules/pokemon-of-the-day-widget/lib/matchups";
import { TYPE_SLUGS } from "../modules/pokemon-of-the-day-widget/lib/types";

describe("computeMatchups", () => {
  it("Charizard (Fire/Flying) — 4× Rock; 2× Water, Electric; ½× Fire, Fighting, Steel, Fairy; ¼× Grass, Bug; 0× Ground", () => {
    const m = computeMatchups(["fire", "flying"]);

    expect(m.weaknesses).toEqual([
      { multiplier: 4, types: ["rock"] },
      { multiplier: 2, types: expect.arrayContaining(["water", "electric"]) },
    ]);
    expect(m.weaknesses[1].types).toHaveLength(2);

    const half = m.resistances.find((r) => r.multiplier === 0.5);
    expect(half?.types).toEqual(
      expect.arrayContaining(["fire", "fighting", "steel", "fairy"]),
    );
    expect(half?.types).toHaveLength(4);

    const quarter = m.resistances.find((r) => r.multiplier === 0.25);
    expect(quarter?.types).toEqual(expect.arrayContaining(["grass", "bug"]));
    expect(quarter?.types).toHaveLength(2);

    expect(m.resistances.find((r) => r.multiplier === 0)?.types).toEqual(["ground"]);
  });

  it("Sableye (Dark/Ghost) — immune to Normal, Fighting, Psychic", () => {
    const m = computeMatchups(["dark", "ghost"]);
    const immune = m.resistances.find((r) => r.multiplier === 0);
    expect(immune?.types).toEqual(
      expect.arrayContaining(["normal", "fighting", "psychic"]),
    );
    expect(immune?.types).toHaveLength(3);
  });

  it("single-type Pokémon (pure Normal) — only Fighting weakness, immune to Ghost", () => {
    const m = computeMatchups(["normal"]);
    expect(m.weaknesses).toEqual([{ multiplier: 2, types: ["fighting"] }]);
    expect(m.resistances).toEqual([{ multiplier: 0, types: ["ghost"] }]);
  });

  it("uses every type in the chart (chart-completeness sanity)", () => {
    for (const t of TYPE_SLUGS) {
      const m = computeMatchups([t]);
      const total =
        m.weaknesses.reduce((n, r) => n + r.types.length, 0) +
        m.resistances.reduce((n, r) => n + r.types.length, 0);
      expect(total).toBeGreaterThan(0);
    }
  });
});
