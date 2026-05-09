import { describe, expect, it } from "vitest";
import {
  pickPokemonForDay,
  toLocalDateString,
} from "../modules/pokemon-of-the-day-widget/lib/selection";
import type {
  Pokedex,
  TypeSlug,
} from "../modules/pokemon-of-the-day-widget/lib/types";

function tinyDex(n: number): Pokedex {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    dexNumber: i + 1,
    slug: `pkmn-${i + 1}`,
    displayName: `Pkmn ${i + 1}`,
    variant: "default",
    types: ["normal"] as TypeSlug[],
    stats: { hp: 50, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 },
    flavorText: "",
  }));
}

describe("pickPokemonForDay", () => {
  const dex = tinyDex(100);
  const date = new Date(2026, 4, 9); // 9 May 2026, local

  it("is deterministic for the same (userId, date) over 100 calls", () => {
    const first = pickPokemonForDay("user-abc", date, dex);
    for (let i = 0; i < 100; i++) {
      expect(pickPokemonForDay("user-abc", date, dex)).toEqual(first);
    }
  });

  it("returns different selections for different users on the same day (statistical)", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 50; i++) {
      seen.add(pickPokemonForDay(`user-${i}`, date, dex).entry.id);
    }
    expect(seen.size).toBeGreaterThan(5);
  });

  it("returns different selections for the same user on different days", () => {
    const a = pickPokemonForDay("user-x", new Date(2026, 4, 9), dex).entry.id;
    const b = pickPokemonForDay("user-x", new Date(2026, 4, 10), dex).entry.id;
    const c = pickPokemonForDay("user-x", new Date(2026, 4, 11), dex).entry.id;
    expect(new Set([a, b, c]).size).toBeGreaterThan(1);
  });

  it("shiny rate ≈ 1/4096 over a uniform sample", () => {
    const SAMPLES = 50_000;
    let shinies = 0;
    for (let i = 0; i < SAMPLES; i++) {
      if (pickPokemonForDay(`user-${i}`, date, dex).isShiny) shinies++;
    }
    const expected = SAMPLES / 4096;
    expect(shinies).toBeGreaterThan(expected * 0.5);
    expect(shinies).toBeLessThan(expected * 2);
  });
});

describe("toLocalDateString", () => {
  it("formats local date as YYYY-MM-DD with zero-padding", () => {
    expect(toLocalDateString(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(toLocalDateString(new Date(2026, 11, 31))).toBe("2026-12-31");
    expect(toLocalDateString(new Date(2026, 4, 9))).toBe("2026-05-09");
  });
});
