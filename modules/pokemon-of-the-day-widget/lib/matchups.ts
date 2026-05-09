import { TYPE_CHART, TYPE_SLUGS, type TypeSlug } from "./types";

type WeaknessGroup = { multiplier: 4 | 2; types: TypeSlug[] };
type ResistanceGroup = { multiplier: 0.5 | 0.25 | 0; types: TypeSlug[] };

export type Matchups = {
  weaknesses: WeaknessGroup[];   // sorted high → low (4×, then 2×)
  resistances: ResistanceGroup[]; // sorted strong → weak (0×, then ¼×, then ½×)
};

export function computeMatchups(defendingTypes: TypeSlug[]): Matchups {
  if (defendingTypes.length === 0) {
    throw new Error("computeMatchups requires at least one defending type");
  }

  const buckets = new Map<number, TypeSlug[]>();

  for (const attacker of TYPE_SLUGS) {
    let mult = 1;
    for (const def of defendingTypes) {
      mult *= TYPE_CHART[attacker][def] ?? 1;
    }
    if (mult === 1) continue;
    const list = buckets.get(mult) ?? [];
    list.push(attacker);
    buckets.set(mult, list);
  }

  const weaknesses: WeaknessGroup[] = [];
  for (const m of [4, 2] as const) {
    const types = buckets.get(m);
    if (types && types.length > 0) weaknesses.push({ multiplier: m, types });
  }

  const resistances: ResistanceGroup[] = [];
  for (const m of [0, 0.25, 0.5] as const) {
    const types = buckets.get(m);
    if (types && types.length > 0) resistances.push({ multiplier: m, types });
  }

  return { weaknesses, resistances };
}
