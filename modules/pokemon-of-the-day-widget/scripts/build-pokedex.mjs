// Run with: node PROMETEO-front/modules/pokemon-of-the-day-widget/scripts/build-pokedex.mjs
//
// Pulls all species 1..1025 from PokeAPI, plus their default variety and any
// regional / mega / primal variants, and emits data/pokedex.json.
//
// PokeAPI does not enforce a hard rate limit, but we throttle to 25 requests
// in flight at a time to be polite. Total runtime: ~2-4 minutes.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const POKEAPI = "https://pokeapi.co/api/v2";
const TOTAL_SPECIES = 1025;
const CONCURRENCY = 25;

const VARIANT_BY_SUFFIX = [
  { suffix: "-mega-x",  variant: "mega-x" },
  { suffix: "-mega-y",  variant: "mega-y" },
  { suffix: "-mega",    variant: "mega" },
  { suffix: "-primal",  variant: "primal" },
  { suffix: "-alola",   variant: "alolan" },
  { suffix: "-galar",   variant: "galarian" },
  { suffix: "-hisui",   variant: "hisuian" },
  { suffix: "-paldea",  variant: "paldean" },
];

const VARIANT_LABEL = {
  "default":   "",
  "mega":      "Mega",
  "mega-x":    "Mega X",
  "mega-y":    "Mega Y",
  "primal":    "Primal",
  "alolan":    "Alolan",
  "galarian":  "Galarian",
  "hisuian":   "Hisuian",
  "paldean":   "Paldean",
};

// Suffixes that mean "skip this variety entirely".
const SKIP_SUFFIXES = [
  "-gmax", "-totem", "-cap", "-cosplay", "-starter", "-eternamax",
  "-busted", "-school", "-meal", "-build", "-rider", "-noice",
  "-zen", "-galar-zen", "-original", "-roaming", "-stellar",
];

function classifyVariety(name) {
  for (const skip of SKIP_SUFFIXES) {
    if (name.endsWith(skip) || name.includes(`${skip}-`)) return null;
  }
  for (const { suffix, variant } of VARIANT_BY_SUFFIX) {
    if (name.endsWith(suffix)) return variant;
  }
  return null; // unknown form → skip; default form is handled separately
}

function titleCase(slug) {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

async function fetchJson(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  throw new Error(`Failed: ${url}`);
}

function pickFlavorText(species) {
  const entries = species.flavor_text_entries ?? [];
  const clean = (s) => s.replace(/[\f\n\r­]/g, " ").replace(/\s+/g, " ").trim();
  const es = entries.find((e) => e.language?.name === "es");
  if (es) return clean(es.flavor_text);
  const en = entries.find((e) => e.language?.name === "en");
  if (en) return clean(en.flavor_text);
  return "";
}

async function buildEntryFromVariety(varietyName, dexNumber, variant, baseDisplayName, flavorText) {
  const data = await fetchJson(`${POKEAPI}/pokemon/${varietyName}`);
  if (!data) return null;
  const stats = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  const STAT_KEYS = {
    "hp": "hp", "attack": "atk", "defense": "def",
    "special-attack": "spa", "special-defense": "spd", "speed": "spe",
  };
  for (const s of data.stats) {
    const k = STAT_KEYS[s.stat.name];
    if (k) stats[k] = s.base_stat;
  }
  let displayName = baseDisplayName;
  if (variant === "mega") {
    displayName = `Mega ${baseDisplayName}`;
  } else if (variant === "mega-x") {
    displayName = `Mega ${baseDisplayName} X`;
  } else if (variant === "mega-y") {
    displayName = `Mega ${baseDisplayName} Y`;
  } else if (variant === "primal") {
    displayName = `Primal ${baseDisplayName}`;
  } else if (variant !== "default") {
    displayName = `${baseDisplayName} (${VARIANT_LABEL[variant]})`;
  }
  return {
    id: data.id,
    dexNumber,
    slug: data.name,
    displayName,
    variant,
    types: data.types
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name),
    stats,
    flavorText,
  };
}

async function buildSpecies(speciesId) {
  const species = await fetchJson(`${POKEAPI}/pokemon-species/${speciesId}`);
  if (!species) return [];
  const baseDisplayName = titleCase(species.name);
  const flavorText = pickFlavorText(species);
  const out = [];
  for (const v of species.varieties) {
    const name = v.pokemon.name;
    if (v.is_default) {
      const e = await buildEntryFromVariety(name, speciesId, "default", baseDisplayName, flavorText);
      if (e) out.push(e);
      continue;
    }
    const variant = classifyVariety(name);
    if (!variant) continue;
    const e = await buildEntryFromVariety(name, speciesId, variant, baseDisplayName, flavorText);
    if (e) out.push(e);
  }
  return out;
}

async function pool(items, worker, concurrency) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
      if (i % 50 === 0) {
        process.stdout.write(`\r  progress: ${i}/${items.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, run));
  process.stdout.write(`\r  progress: ${items.length}/${items.length}\n`);
  return results;
}

async function main() {
  console.log(`Fetching ${TOTAL_SPECIES} species from PokeAPI…`);
  const ids = Array.from({ length: TOTAL_SPECIES }, (_, i) => i + 1);
  const groups = await pool(ids, buildSpecies, CONCURRENCY);
  const entries = groups.flat();

  // Stable sort: by dexNumber, then variant order.
  const VARIANT_ORDER = ["default", "alolan", "galarian", "hisuian", "paldean", "mega", "mega-x", "mega-y", "primal"];
  entries.sort((a, b) => {
    if (a.dexNumber !== b.dexNumber) return a.dexNumber - b.dexNumber;
    return VARIANT_ORDER.indexOf(a.variant) - VARIANT_ORDER.indexOf(b.variant);
  });

  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, "..", "data", "pokedex.json");
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(entries, null, 2) + "\n", "utf8");
  console.log(`Wrote ${entries.length} entries to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
