import type { Pokedex, PokedexEntry } from "./types";

export type Selection = {
  entry: PokedexEntry;
  isShiny: boolean;
};

const SHINY_RATE_DENOMINATOR = 4096;

/**
 * cyrb128 — small, fast, non-cryptographic 128-bit hash.
 * Source: https://stackoverflow.com/a/47593316 (public domain).
 * Returns 4 unsigned 32-bit integers. Deterministic across all JS engines.
 */
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [
    (h1 ^ h2 ^ h3 ^ h4) >>> 0,
    (h2 ^ h1) >>> 0,
    (h3 ^ h1) >>> 0,
    (h4 ^ h1) >>> 0,
  ];
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Local-timezone YYYY-MM-DD. */
export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function pickPokemonForDay(
  userId: string,
  date: Date,
  pokedex: Pokedex,
): Selection {
  if (pokedex.length === 0) {
    throw new Error("pickPokemonForDay called with an empty pokedex");
  }
  const seed = `${userId}|${toLocalDateString(date)}`;
  const [h1, h2] = cyrb128(seed);
  const entry = pokedex[h1 % pokedex.length];
  const isShiny = h2 % SHINY_RATE_DENOMINATOR === 0;
  return { entry, isShiny };
}
