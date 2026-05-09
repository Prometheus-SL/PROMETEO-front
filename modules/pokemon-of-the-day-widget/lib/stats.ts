import type { BaseStats, ComputedStats } from "./types";

const LEVEL = 50;
const IV = 31;
const EV = 0;

function nonHpStat(base: number): number {
  return Math.floor(((2 * base + IV + Math.floor(EV / 4)) * LEVEL) / 100) + 5;
}

function hpStat(base: number): number {
  return Math.floor(((2 * base + IV + Math.floor(EV / 4)) * LEVEL) / 100) + LEVEL + 10;
}

export function computeStatsAtLevel50(base: BaseStats): ComputedStats {
  return {
    hp: hpStat(base.hp),
    atk: nonHpStat(base.atk),
    def: nonHpStat(base.def),
    spa: nonHpStat(base.spa),
    spd: nonHpStat(base.spd),
    spe: nonHpStat(base.spe),
  };
}
