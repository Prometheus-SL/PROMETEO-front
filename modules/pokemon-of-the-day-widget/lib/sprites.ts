const SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

export type SpriteUrls = {
  /** Higher-quality official artwork. May 404 for some forms. */
  primary: string;
  /** Pixel sprite fallback. Available for every form. */
  fallback: string;
};

export function getSpriteUrls(id: number, shiny: boolean): SpriteUrls {
  const shinyDir = shiny ? "/shiny" : "";
  return {
    primary: `${SPRITE_BASE}/other/official-artwork${shinyDir}/${id}.png`,
    fallback: `${SPRITE_BASE}${shinyDir}/${id}.png`,
  };
}
