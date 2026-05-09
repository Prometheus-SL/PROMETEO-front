import { describe, expect, it } from "vitest";
import { computeStatsAtLevel50 } from "../modules/pokemon-of-the-day-widget/lib/stats";

describe("computeStatsAtLevel50 — neutral baseline (31 IV, 0 EV, neutral nature)", () => {
  it("Charizard (78/84/78/109/85/100) → 153/104/98/129/105/120", () => {
    expect(
      computeStatsAtLevel50({ hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 }),
    ).toEqual({ hp: 153, atk: 104, def: 98, spa: 129, spd: 105, spe: 120 });
  });

  it("Blissey HP base 255 → 330 at level 50", () => {
    const stats = computeStatsAtLevel50({ hp: 255, atk: 10, def: 10, spa: 75, spd: 135, spe: 55 });
    expect(stats.hp).toBe(330);
  });

  it("Shedinja HP base 1 → 76 at level 50 (formula, not the in-game 1)", () => {
    const stats = computeStatsAtLevel50({ hp: 1, atk: 90, def: 45, spa: 30, spd: 30, spe: 40 });
    expect(stats.hp).toBe(76);
  });

  it("Shuckle Def base 230 → 250 at level 50", () => {
    const stats = computeStatsAtLevel50({ hp: 20, atk: 10, def: 230, spa: 10, spd: 230, spe: 5 });
    expect(stats.def).toBe(250);
  });
});
