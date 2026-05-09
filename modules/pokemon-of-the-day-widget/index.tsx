import { useMemo, useState, type ReactNode } from "react";

import { Sparkles } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import {
  WidgetContent,
  WidgetSection,
  WidgetShell,
} from "@/modules/ui/WidgetShell";
import { cn } from "@/lib/utils";

import pokedex from "./data/pokedex.json";
import { pickPokemonForDay } from "./lib/selection";
import { getSpriteUrls } from "./lib/sprites";
import { TYPE_COLORS, type Pokedex, type TypeSlug } from "./lib/types";
import { computeMatchups } from "./lib/matchups";

const POKEDEX = pokedex as Pokedex;

const VARIANT_BADGE: Record<string, string | null> = {
  "default": null,
  "mega": "Mega",
  "mega-x": "Mega X",
  "mega-y": "Mega Y",
  "primal": "Primal",
  "alolan": "Alolan",
  "galarian": "Galarian",
  "hisuian": "Hisuian",
  "paldean": "Paldean",
};

type ShinySparkle = {
  pos: React.CSSProperties;
  size: string;
  delay: string;
  duration: string;
  glyph: string;
};

const SHINY_SPARKLES: ShinySparkle[] = [
  { pos: { top: "6%", left: "8%" }, size: "text-base", delay: "0s", duration: "2.4s", glyph: "✦" },
  { pos: { top: "14%", right: "9%" }, size: "text-xl", delay: "0.3s", duration: "2.6s", glyph: "✧" },
  { pos: { top: "44%", left: "4%" }, size: "text-sm", delay: "0.6s", duration: "2.2s", glyph: "✦" },
  { pos: { top: "38%", right: "5%" }, size: "text-base", delay: "0.9s", duration: "2.5s", glyph: "✧" },
  { pos: { bottom: "20%", left: "14%" }, size: "text-lg", delay: "1.2s", duration: "2.3s", glyph: "✦" },
  { pos: { bottom: "16%", right: "12%" }, size: "text-sm", delay: "1.5s", duration: "2.4s", glyph: "✧" },
  { pos: { top: "8%", left: "52%" }, size: "text-sm", delay: "1.8s", duration: "2.6s", glyph: "✦" },
  { pos: { bottom: "30%", left: "58%" }, size: "text-base", delay: "2.1s", duration: "2.5s", glyph: "✧" },
  { pos: { top: "60%", left: "30%" }, size: "text-xs", delay: "0.45s", duration: "2.0s", glyph: "✦" },
  { pos: { top: "25%", left: "30%" }, size: "text-xs", delay: "1.65s", duration: "2.1s", glyph: "✧" },
];

function MultiplierBadge({ value }: { value: 4 | 2 | 0.5 | 0.25 | 0 }) {
  const label =
    value === 0.5 ? "½×" :
    value === 0.25 ? "¼×" :
    value === 0 ? "0×" :
    `${value}×`;
  const tone =
    value >= 2
      ? "border-rose-500/60 bg-rose-500/15 text-rose-700 dark:text-rose-300"
      : value === 0
        ? "border-violet-500/60 bg-violet-500/15 text-violet-700 dark:text-violet-300"
        : "border-emerald-500/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-bold tabular-nums", tone)}>
      {label}
    </span>
  );
}

function TypeChipMini({ type }: { type: TypeSlug }) {
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white"
      style={{ backgroundColor: TYPE_COLORS[type] }}
    >
      {type}
    </span>
  );
}

function MatchupsPanel({ types }: { types: TypeSlug[] }) {
  const m = computeMatchups(types);
  const rows: Array<{ label: string; multiplier: 4 | 2 | 0.5 | 0.25 | 0; types: TypeSlug[] }> = [];

  for (const w of m.weaknesses) {
    rows.push({ label: "Weak", multiplier: w.multiplier, types: w.types });
  }
  for (const r of m.resistances) {
    if (r.multiplier === 0) {
      rows.push({ label: "Immune", multiplier: 0, types: r.types });
    } else {
      rows.push({ label: "Resist", multiplier: r.multiplier, types: r.types });
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground">
        No type matchups (rare!).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-1.5 text-[11px]">
          <span className="w-14 shrink-0 font-medium text-muted-foreground">
            {row.label}
          </span>
          <MultiplierBadge value={row.multiplier} />
          <div className="flex flex-wrap gap-1">
            {row.types.map((t) => (
              <TypeChipMini key={t} type={t} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LorePanel({ text, name }: { text: string; name: string }) {
  if (!text) {
    return (
      <p className="text-center text-[11px] italic text-muted-foreground">
        The stars are silent about {name} today.
      </p>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-500/80">
        Pokédex
      </span>
      <p className="text-center text-[11px] italic leading-snug text-foreground/90">
        &ldquo;{text}&rdquo;
      </p>
    </div>
  );
}

export default function PokemonOfTheDayWidget() {
  const { user } = useAuth();
  const userId = user?.id ?? "anonymous";

  const selection = useMemo(
    () => pickPokemonForDay(userId, new Date(), POKEDEX),
    [userId],
  );

  const { entry, isShiny } = selection;
  const sprites = getSpriteUrls(entry.id, isShiny);
  const [spriteStage, setSpriteStage] = useState<"primary" | "fallback" | "missing">("primary");
  const [loreOpen, setLoreOpen] = useState(false);
  const spriteSrc =
    spriteStage === "primary" ? sprites.primary :
    spriteStage === "fallback" ? sprites.fallback :
    null;

  const variantBadge = VARIANT_BADGE[entry.variant];

  return (
    <WidgetShell accent="amber">
      <WidgetContent className="flex flex-col gap-2 p-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-xs text-muted-foreground">
              #{String(entry.dexNumber).padStart(3, "0")}
            </span>
            <span className="truncate text-sm font-semibold">
              {entry.displayName}
            </span>
            {entry.types.map((t) => (
              <span
                key={t}
                className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white"
                style={{ backgroundColor: TYPE_COLORS[t] }}
              >
                {t}
              </span>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {variantBadge && (
              <span className="rounded-md border border-border/50 bg-background/60 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                {variantBadge}
              </span>
            )}
            {isShiny && (
              <span className="rounded-md border border-amber-500/60 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                ✦ Shiny
              </span>
            )}
          </div>
        </div>

        {/* Sprite frame — hover (desktop) or tap (mobile) to reveal lore */}
        <SpriteFrame
          src={spriteSrc}
          alt={entry.displayName}
          isShiny={isShiny}
          onError={() =>
            setSpriteStage((prev) =>
              prev === "primary" ? "fallback" : "missing",
            )
          }
          hoverOverlay={<LorePanel text={entry.flavorText} name={entry.displayName} />}
          isOverlayOpen={loreOpen}
          onToggleOverlay={() => setLoreOpen((v) => !v)}
        />

        {/* Matchups */}
        <WidgetSection accent="amber" className="bg-background/60 p-2">
          <MatchupsPanel types={entry.types} />
        </WidgetSection>
      </WidgetContent>
    </WidgetShell>
  );
}

function SpriteFrame({
  src,
  alt,
  isShiny,
  onError,
  hoverOverlay,
  isOverlayOpen,
  onToggleOverlay,
}: {
  src: string | null;
  alt: string;
  isShiny: boolean;
  onError: () => void;
  hoverOverlay?: ReactNode;
  isOverlayOpen?: boolean;
  onToggleOverlay?: () => void;
}) {
  return (
    <>
      {isShiny && (
        <style>{`
          @keyframes pkm-shiny-flow {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }
          @keyframes pkm-shiny-burst {
            0%   { opacity: 0; transform: translate(0, 0) scale(0) rotate(0deg); }
            15%  { opacity: 1; transform: translate(0, -2px) scale(1.4) rotate(60deg); }
            45%  { opacity: 0.9; transform: translate(0, -6px) scale(1) rotate(180deg); }
            75%  { opacity: 0.5; transform: translate(0, -10px) scale(1.1) rotate(280deg); }
            100% { opacity: 0; transform: translate(0, -14px) scale(0.3) rotate(360deg); }
          }
          @keyframes pkm-shiny-aura {
            0%, 100% { opacity: 0.55; box-shadow: inset 0 0 22px 0 rgba(246, 211, 101, 0.35), inset 0 0 8px 0 rgba(253, 160, 133, 0.25); }
            50%      { opacity: 1;    box-shadow: inset 0 0 38px 4px rgba(246, 211, 101, 0.55), inset 0 0 14px 2px rgba(253, 160, 133, 0.4); }
          }
        `}</style>
      )}
      <div
        className={cn(
          "group relative w-full flex-1 min-h-[160px] overflow-hidden rounded-lg",
          isShiny ? "p-[2px]" : "border border-border/50",
          hoverOverlay && onToggleOverlay && "cursor-pointer select-none",
        )}
        style={
          isShiny
            ? {
                backgroundImage:
                  "linear-gradient(120deg, #f6d365 0%, #fda085 20%, #fff7c2 35%, #fda085 50%, #f6d365 65%, #fda085 80%, #f6d365 100%)",
                backgroundSize: "300% 100%",
                animation: "pkm-shiny-flow 5s linear infinite",
              }
            : undefined
        }
        onClick={onToggleOverlay}
        role={onToggleOverlay ? "button" : undefined}
        aria-pressed={onToggleOverlay ? isOverlayOpen : undefined}
      >
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-md bg-background/90">
        {src ? (
          <img
            src={src}
            alt={alt}
            onError={onError}
            className="h-full w-full object-contain p-3"
          />
        ) : (
          <Sparkles className="size-10 text-muted-foreground" aria-label={alt} />
        )}
        {isShiny && (
          <>
            <div
              className="pointer-events-none absolute inset-0 rounded-md"
              style={{ animation: "pkm-shiny-aura 2.6s ease-in-out infinite" }}
            />
            {SHINY_SPARKLES.map((s, i) => (
              <span
                key={i}
                className={cn("pointer-events-none absolute text-amber-300", s.size)}
                style={{
                  ...s.pos,
                  animation: `pkm-shiny-burst ${s.duration} ease-out infinite`,
                  animationDelay: s.delay,
                  filter: "drop-shadow(0 0 6px rgba(253, 224, 71, 0.85))",
                }}
              >
                {s.glyph}
              </span>
            ))}
          </>
        )}
        {hoverOverlay && (
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 bg-background/95 p-3 backdrop-blur-sm transition-transform duration-200",
              isOverlayOpen ? "translate-y-0" : "translate-y-full group-hover:translate-y-0",
            )}
          >
            {hoverOverlay}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
