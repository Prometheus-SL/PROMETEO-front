# Pokémon of the Day Widget

A 2×3 dashboard widget that assigns each user one Pokémon per day, showing its
sprite, types, level-50 stats and type matchups. There is a 1/4096 chance the
Pokémon appears as shiny (matching the Gen VI+ in-game shiny rate).

## How the daily selection works

The Pokémon for the day is chosen deterministically from
`(userId, localDate)` using a 128-bit cyrb hash:

- Index = `hash[0] mod pokedex.length`
- Shiny = `hash[1] mod 4096 === 0`

Two users on the same day see different Pokémon. The same user across two
days sees independent draws. Everything is computed client-side with no
network calls at runtime.

## Pokédex coverage

`data/pokedex.json` is a static snapshot of all 1025 base species (Gen 1–9
including Scarlet/Violet DLC) plus regional forms (Alolan, Galarian, Hisuian,
Paldean), Mega Evolutions and Primal forms. Gigantamax forms are intentionally
not included.

## Regenerating the dataset

When a new Pokémon generation ships, regenerate the dataset:

```bash
node PROMETEO-front/modules/pokemon-of-the-day-widget/scripts/build-pokedex.mjs
```

The script pulls from PokeAPI (rate-friendly: 25 concurrent requests). Total
runtime is roughly 2–4 minutes. It overwrites `data/pokedex.json`.

## Sprite source

Sprites are loaded directly from the PokeAPI Sprites GitHub Repository:

- Primary: `…/sprites/pokemon/other/official-artwork/{id}.png`
- Shiny: `…/sprites/pokemon/other/official-artwork/shiny/{id}.png`
- Pixel-sprite fallback: `…/sprites/pokemon/{id}.png` (and `/shiny/`)

The widget falls back to the pixel sprite automatically if the official
artwork URL 404s, and to a Lucide `Sparkles` placeholder if both fail.

## Known quirks

- Shedinja's level-50 HP shows as 76 (formula output from base 1) instead
  of the in-game hardcoded 1. Documented and intentional in v1.
