import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Particles } from "@/components/ui/shadcn-io/particles";
// El widget es de solo lectura: no se muestran controles ni confetti

type Mood = "happy" | "sleepy" | "angry" | "surprised";
type Accessory = "none" | "glasses" | "crown" | "antenna" | "batman";

export default function SparkChispaCard({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const name = String(config["name"] ?? "Chispa");
  const color = String(config["color"] ?? "#facc15"); // amber-400
  const baseMood = (String(config["mood"] ?? "happy") as Mood) || "happy";
  const accessory =
    (String(config["accessory"] ?? "none") as Accessory) || "none";

  // Estado actual (puede cambiar por inactividad)
  const [mood, setMood] = useState<Mood>(baseMood);

  // Auto-cambio de ánimo por inactividad (opcional)
  const autoMood = (config["autoMood"] as boolean | undefined) ?? true;
  const inactivityMs = Number(config["inactivityMs"] ?? 20000); // 20s
  const stepMs = Number(config["inactivityStepMs"] ?? 20000); // cada 20s cambia
  const lastActiveRef = useRef<number>(Date.now());

  const markActive = () => {
    lastActiveRef.current = Date.now();
    setMood(baseMood);
  };

  useEffect(() => {
    if (!autoMood) return;
    const cycle: Mood[] = ["sleepy", "angry", "surprised"]; // rotación
    const id = window.setInterval(() => {
      const elapsed = Date.now() - lastActiveRef.current;
      if (elapsed < inactivityMs) {
        if (mood !== baseMood) setMood(baseMood);
        return;
      }
      const idx = Math.floor((elapsed - inactivityMs) / stepMs) % cycle.length;
      const next = cycle[idx];
      if (mood !== next) setMood(next);
    }, 1000);
    return () => window.clearInterval(id);
  }, [autoMood, baseMood, inactivityMs, stepMs, mood]);

  // Fondo derivado del color principal para cohesión
  const bgCircle = useMemo(() => rgba(darken(color, 0.5), 0.35), [color]);

  return (
    <Card
      className="relative h-full w-full rounded-xl p-4 overflow-hidden bg-black"
      onMouseMove={markActive}
      onPointerDown={markActive}
      onTouchStart={markActive}
    >
      <div className="flex h-full w-full items-center justify-center">
        <div className="relative flex flex-col items-center">
          {/* Fondo circular bien centrado detrás de la chispa */}
          <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              className="size-48 md:size-56 rounded-full shadow-[0_0_80px_-10px_rgba(0,0,0,0.6)]"
              style={{ backgroundColor: bgCircle }}
            />
          </div>

          {/* Chispa */}
          <SparkSvg color={color} mood={mood} accessory={accessory} />

          {/* Nombre */}
          <div className="mt-2 w-full text-center text-sm font-medium text-foreground/80">
            {name || "Chispa"}
          </div>
        </div>
      </div>
      {/* Interactive particles */}
      <Particles
        className="absolute inset-0 z--1 overflow-hidden"
        quantity={200}
        ease={80}
        staticity={50}
        color={lighten(color, 0.3)}
        size={0.3}
      />
    </Card>
  );
}

function SparkSvg({
  color,
  mood,
  accessory,
}: {
  color: string;
  mood: Mood;
  accessory: Accessory;
  size?: number;
}) {
  // Elementos de cara según estado
  const eyeY = 94;
  const eyeXOffset = 26;
  const eyeR = 7.5;

  const gradId = useMemo(
    () => `spark-body-${Math.random().toString(36).slice(2)}`,
    []
  );
  const strokeColor = darken(color, 0.55);
  const lightColor = lighten(color, 0.22);

  const mouth = (() => {
    switch (mood) {
      case "happy":
        return (
          <path
            d="M70 115 Q 90 130 110 115"
            stroke="#111"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        );
      case "sleepy":
        return (
          <path
            d="M78 116 H112"
            stroke="#111"
            strokeWidth="4"
            strokeLinecap="round"
          />
        );
      case "angry":
        return (
          <path
            d="M75 120 Q 90 108 105 120"
            stroke="#111"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        );
      case "surprised":
        return <circle cx="92" cy="118" r="6" fill="#111" />;
    }
  })();

  return (
    <svg
      viewBox="0 0 184 184"
      role="img"
      aria-label="Spark preview"
      className="drop-shadow-md spark w-full h-auto max-w-[180px]"
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={gradId} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor={lightColor} />
          <stop offset="100%" stopColor={color} />
        </radialGradient>
      </defs>

      {/* halo sutil */}
      <circle cx="92" cy="82" r="38" fill={lightColor} opacity="0.08" />

      {/* cuerpo chispa suavizado */}
      <g filter="url(#glow)">
        <path
          d="
      M92 164
      C118 152, 144 132, 152 106
      C156 92, 154 80, 140 60
      C146 52, 154 42, 142 36
      C134 32, 128 38, 120 28
      C112 20, 104 18, 92 20
      C80 18, 72 20, 64 28
      C56 38, 50 32, 42 36
      C30 42, 38 52, 44 60
      C30 80, 28 92, 32 106
      C40 132, 66 152, 92 164
      Z
    "
          fill={`url(#${gradId})`}
          stroke={strokeColor}
          strokeWidth="2.4"
        />
      </g>

      {/* chispas flotantes dinámicas */}
      <g>
        <circle cx="70" cy="40" r="2.5" fill={lightColor} opacity="0.6">
          <animate
            attributeName="cy"
            values="40;30;40"
            dur="1.4s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.6;1;0.6"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="120" cy="38" r="2.8" fill={lightColor} opacity="0.7">
          <animate
            attributeName="cy"
            values="38;26;38"
            dur="1.1s"
            repeatCount="indefinite"
            begin="0.2s"
          />
        </circle>
        <circle cx="92" cy="18" r="2.2" fill={lightColor} opacity="0.5">
          <animate
            attributeName="r"
            values="2.2;3;2.2"
            dur="1s"
            repeatCount="indefinite"
            begin="0.6s"
          />
        </circle>
      </g>

      {/* Ojos */}
      <g>
        {/* izquierdo */}
        <circle cx={92 - eyeXOffset} cy={eyeY} r={eyeR + 2.5} fill="#fff" />
        <circle cx={92 - eyeXOffset} cy={eyeY} r={eyeR} fill={strokeColor} />
        <circle
          cx={92 - eyeXOffset - 2.5}
          cy={eyeY - 2.5}
          r={2}
          fill="#fff"
          opacity="0.9"
        />
        {/* derecho */}
        <circle cx={92 + eyeXOffset} cy={eyeY} r={eyeR + 2.5} fill="#fff" />
        <circle cx={92 + eyeXOffset} cy={eyeY} r={eyeR} fill={strokeColor} />
        <circle
          cx={92 + eyeXOffset - 2.5}
          cy={eyeY - 2.5}
          r={2}
          fill="#fff"
          opacity="0.9"
        />
      </g>

      {/* Boca */}
      {mouth}

      {/* Accesorios */}
      {accessory === "glasses" && (
        <g>
          <rect
            x={92 - eyeXOffset - 12}
            y={eyeY - 10}
            width="24"
            height="16"
            rx="4"
            ry="4"
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
          />
          <rect
            x={92 + eyeXOffset - 12}
            y={eyeY - 10}
            width="24"
            height="16"
            rx="4"
            ry="4"
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
          />
          <line
            x1={92 - eyeXOffset + 12}
            y1={eyeY - 2}
            x2={92 + eyeXOffset - 12}
            y2={eyeY - 2}
            stroke={strokeColor}
            strokeWidth="2"
          />
        </g>
      )}
      {accessory === "crown" && (
        <g>
          <path
            d="M60 52 L78 36 L92 52 L106 36 L124 52 Z"
            fill="#fde047"
            stroke={strokeColor}
            strokeWidth="2"
          />
        </g>
      )}
      {accessory === "antenna" && (
        <g>
          <line
            x1="92"
            y1="24"
            x2="92"
            y2="8"
            stroke={strokeColor}
            strokeWidth="3"
          />
          <circle
            cx="92"
            cy="6"
            r="4"
            fill="#fca5a5"
            stroke={strokeColor}
            strokeWidth="1.5"
          />
        </g>
      )}
      {accessory === "batman" && (
        <svg
          viewBox="0 0 300 300"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Batman Spark accessory"
        >
          <defs>
            <linearGradient id="batGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                style={{ stopColor: "#000000", stopOpacity: 1 }}
              />
              <stop
                offset="100%"
                style={{ stopColor: "#222222", stopOpacity: 1 }}
              />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g filter="url(#glow)">
            <path
              d="
                M150 50
                L140 100
                L120 80
                L100 100
                L90 50
                L60 90
                L70 140
                L50 180
                L80 180
                L100 160
                L130 180
                L170 180
                L200 160
                L220 180
                L250 180
                L230 140
                L240 90
                L210 50
                L190 100
                L170 80
                L150 100
                Z
              "
              fill="url(#batGrad)"
              stroke="#fff"
              strokeWidth="2"
              transform="translate(0, -40)"
            />
          </g>
        </svg>
      )}

      {/* brillo superior */}
      <ellipse cx="82" cy="58" rx="14" ry="9" fill="#fff" opacity="0.1" />
    </svg>
  );
}

// Utilidades de color
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function rgba(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(a, 0, 1)})`;
}
function mixChannel(from: number, to: number, p: number) {
  return Math.round(from + (to - from) * clamp(p, 0, 1));
}
function adjust(hex: string, p: number) {
  // p>0 aclara; p<0 oscurece
  const { r, g, b } = hexToRgb(hex);
  const t = p < 0 ? 0 : 255;
  const pp = Math.abs(p);
  const R = mixChannel(r, t, pp);
  const G = mixChannel(g, t, pp);
  const B = mixChannel(b, t, pp);
  return `#${[R, G, B].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
function lighten(hex: string, p: number) {
  return adjust(hex, Math.abs(p));
}
function darken(hex: string, p: number) {
  return adjust(hex, -Math.abs(p));
}
