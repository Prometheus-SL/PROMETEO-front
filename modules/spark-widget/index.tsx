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
  // Estado de parpadeo simultáneo
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimeoutRef = useRef<number | null>(null);
  const scheduleTimeoutRef = useRef<number | null>(null);
  // Dirección de mirada: -1 izquierda, 0 centro, 1 derecha
  const [gazeDir, setGazeDir] = useState<-1 | 0 | 1>(0);
  const gazeTimeoutRef = useRef<number | null>(null);

  // Programa parpadeos aleatorios a la vez para ambos ojos
  useEffect(() => {
    const scheduleNextBlink = () => {
      // Próximo parpadeo entre 2 y 6 segundos
      const delay = 2000 + Math.random() * 4000;
      scheduleTimeoutRef.current = window.setTimeout(() => {
        setIsBlinking(true);
        // Duración del parpadeo breve (100-180ms)
        const blinkDuration = 100 + Math.random() * 80;
        blinkTimeoutRef.current = window.setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, blinkDuration);
      }, delay);
    };

    scheduleNextBlink();
    return () => {
      if (blinkTimeoutRef.current) window.clearTimeout(blinkTimeoutRef.current);
      if (scheduleTimeoutRef.current)
        window.clearTimeout(scheduleTimeoutRef.current);
    };
  }, []);

  // Cambios de dirección de mirada aleatorios
  useEffect(() => {
    const scheduleNextGaze = () => {
      const delay = 1200 + Math.random() * 1800; // 1.2s - 3s
      gazeTimeoutRef.current = window.setTimeout(() => {
        // Selecciona una dirección distinta a la actual con mayor probabilidad de volver a centro
        const options: Array<-1 | 0 | 1> = [-1, 0, 1];
        const weights = options.map((o) => (o === 0 ? 0.5 : 0.25));
        const r = Math.random();
        let acc = 0;
        let next: -1 | 0 | 1 = 0;
        for (let i = 0; i < options.length; i++) {
          acc += weights[i];
          if (r <= acc) {
            next = options[i];
            break;
          }
        }
        setGazeDir(next);
        scheduleNextGaze();
      }, delay);
    };
    scheduleNextGaze();
    return () => {
      if (gazeTimeoutRef.current) window.clearTimeout(gazeTimeoutRef.current);
    };
  }, []);

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
      className="drop-shadow-md spark w-full h-auto max-w-[180px] z-10"
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

      {/* cuerpo con glow */}
      <g filter="url(#glow)">
        <path
          d="M92 164
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
            Z"
          fill={`url(#${gradId})`}
          stroke={strokeColor}
          strokeWidth="2.4"
        />
      </g>

      {/* Ojos */}
      {isBlinking ? (
        // Ojos cerrados (líneas) durante el parpadeo
        <g>
          <line
            x1={92 - eyeXOffset - eyeR}
            y1={eyeY}
            x2={92 - eyeXOffset + eyeR}
            y2={eyeY}
            stroke={strokeColor}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <line
            x1={92 + eyeXOffset - eyeR}
            y1={eyeY}
            x2={92 + eyeXOffset + eyeR}
            y2={eyeY}
            stroke={strokeColor}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      ) : (
        <g>
          {/* izquierdo */}
          <circle cx={92 - eyeXOffset} cy={eyeY} r={eyeR + 2.5} fill="#fff" />
          {/* pupila (círculo interior) con desplazamiento de mirada */}
          <circle
            cx={92 - eyeXOffset + gazeDir * 2}
            cy={eyeY}
            r={eyeR}
            fill={strokeColor}
          />
          <circle
            cx={92 - eyeXOffset + gazeDir * 2 - 2.5}
            cy={eyeY - 2.5}
            r={2}
            fill="#fff"
            opacity="0.9"
          />
          {/* derecho */}
          <circle cx={92 + eyeXOffset} cy={eyeY} r={eyeR + 2.5} fill="#fff" />
          {/* pupila (círculo interior) con desplazamiento de mirada */}
          <circle
            cx={92 + eyeXOffset + gazeDir * 2}
            cy={eyeY}
            r={eyeR}
            fill={strokeColor}
          />
          <circle
            cx={92 + eyeXOffset + gazeDir * 2 - 2.5}
            cy={eyeY - 2.5}
            r={2}
            fill="#fff"
            opacity="0.9"
          />
        </g>
      )}

      {/* Boca */}
      {mouth}

      {/* Accesorios */}
      {accessory === "glasses" && (
        <g>
          <rect
            x={92 - eyeXOffset - 12}
            y={eyeY - 10}
            width="24"
            height="20"
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
            height="20"
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
        <svg
          version="1.1"
          id="crown"
          viewBox="0 0 502 502"
          transform="translate(45,-15) scale(0.5)"
        >
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="50%" stopColor="#FFC200" />
              <stop offset="100%" stopColor="#DAA520" />
            </linearGradient>
          </defs>
          <g>
            <g>
              <g>
                <path
                  style={{ fill: "url(#goldGrad)" }}
                  d="M420.164,142.9c10.259,14.264,16.088,31.924,15.451,50.98
                  c-1.422,42.588-35.589,77.461-78.142,79.687c-47.65,2.492-87.068-35.407-87.068-82.512c0-20.307,7.332-38.895,19.487-53.278
                  c4.713-5.577,3.074-14.092-3.492-17.285c-10.097-4.908-19.22-10.765-27.119-17.392c-4.07-3.414-9.988-3.414-14.058,0
                  c-7.913,6.639-17.055,12.505-27.174,17.419c-6.542,3.177-8.171,11.663-3.473,17.215c12.607,14.897,20.036,34.313,19.495,55.481
                  c-1.089,42.647-37.957,79.439-80.606,80.444c-46.546,1.097-84.623-36.308-84.623-82.605c0-17.853,5.672-34.375,15.303-47.881
                  c4.257-5.97,1.841-14.389-5.027-16.958c-20.195-7.556-37.399-18.642-50.01-32.112C22.264,86.793,10,91.689,10,101.703v274.823
                  c0,19.259,15.612,34.871,34.871,34.871h412.258c19.259,0,34.871-15.612,34.871-34.871V104.288
                  c0-9.893-11.944-14.771-18.935-7.771c-12.377,12.393-28.729,22.616-47.726,29.716C418.549,128.771,415.931,137.016,420.164,142.9
                  z"
                />
                <path
                  d="M457.129,421.397H44.871C20.129,421.397,0,401.268,0,376.525V101.703c0-8.71,5.238-16.407,13.344-19.609
                  c8.08-3.192,17.133-1.16,23.064,5.176c11.585,12.374,27.566,22.603,46.213,29.579c6.152,2.302,10.784,7.231,12.708,13.524
                  c1.95,6.379,0.84,13.16-3.043,18.606c-8.795,12.334-13.444,26.884-13.444,42.074c0,19.724,7.772,38.178,21.885,51.962
                  c14.107,13.779,32.73,21.089,52.502,20.646c37.445-0.883,69.889-33.26,70.845-70.702c0.456-17.854-5.628-35.173-17.132-48.767
                  c-4.291-5.071-5.968-11.69-4.602-18.16c1.347-6.376,5.48-11.665,11.339-14.51c9.364-4.548,17.814-9.959,25.115-16.085
                  c7.798-6.539,19.115-6.54,26.912-0.001c7.288,6.115,15.72,11.518,25.064,16.06c5.87,2.854,10.011,8.154,11.361,14.541
                  c1.37,6.479-0.308,13.11-4.602,18.192c-11.043,13.067-17.125,29.696-17.125,46.823c0,20.121,8.041,38.833,22.642,52.689
                  c14.589,13.848,33.735,20.894,53.904,19.837c37.26-1.949,67.423-32.712,68.67-70.035c0.542-16.212-4.153-31.706-13.575-44.807
                  l0,0c-3.827-5.32-4.929-11.97-3.023-18.244c1.924-6.337,6.595-11.304,12.815-13.628c17.507-6.544,32.774-16.023,44.151-27.415
                  c6.069-6.076,15.106-7.884,23.027-4.607C496.903,88.107,502,95.74,502,104.288v272.237
                  C502,401.268,481.871,421.397,457.129,421.397z M21.149,100.597c-0.128,0-0.279,0.028-0.458,0.099
                  C20,100.969,20,101.429,20,101.703v274.822c0,13.714,11.157,24.871,24.871,24.871h412.258c13.714,0,24.871-11.157,24.871-24.871
                  V104.288c0-0.28,0-0.703-0.631-0.965c-0.685-0.282-1.038,0.07-1.228,0.261c-13.388,13.405-31.128,24.477-51.301,32.017
                  c-0.349,0.131-0.578,0.367-0.68,0.705c-0.125,0.411,0.048,0.651,0.123,0.755c12.026,16.72,18.018,36.482,17.328,57.152
                  c-1.59,47.61-40.075,86.854-87.614,89.34c-25.7,1.348-50.108-7.642-68.717-25.303c-18.62-17.671-28.874-41.535-28.874-67.196
                  c0-21.848,7.759-43.061,21.849-59.732c0.365-0.433,0.371-0.861,0.311-1.146c-0.102-0.479-0.407-0.627-0.538-0.69
                  c-10.817-5.258-20.633-11.558-29.174-18.725c-0.354-0.295-0.85-0.297-1.205,0.002c-8.557,7.179-18.393,13.488-29.232,18.752
                  c-0.134,0.065-0.412,0.2-0.508,0.653c-0.058,0.274-0.053,0.688,0.301,1.106c14.677,17.345,22.44,39.433,21.858,62.196
                  c-0.593,23.204-10.413,45.457-27.651,62.661c-17.238,17.203-39.512,26.979-62.717,27.525c-0.751,0.018-1.506,0.026-2.255,0.026
                  c-24.342,0.002-47.237-9.31-64.693-26.359c-17.999-17.579-27.911-41.114-27.911-66.27c0-19.378,5.934-37.942,17.16-53.687
                  c0.319-0.447,0.285-0.871,0.201-1.147c-0.145-0.473-0.456-0.589-0.589-0.639c-21.519-8.051-40.125-20.03-53.805-34.644
                  C21.673,100.794,21.488,100.597,21.149,100.597z"
                />
              </g>
            </g>
            <g>
              <path d="M356.297,375.654H71c-5.523,0-10-4.478-10-10s4.477-10,10-10h285.297c5.523,0,10,4.478,10,10 S361.82,375.654,356.297,375.654z" />
            </g>
            <g>
              <path d="M435,375.654h-30.497c-5.523,0-10-4.478-10-10s4.477-10,10-10H435c5.523,0,10,4.478,10,10S440.523,375.654,435,375.654z" />
            </g>
            <g>
              <path
                d="M45,288.654c-5.523,0-10-4.478-10-10v-27c0-5.522,4.477-10,10-10s10,4.478,10,10v27C55,284.177,50.523,288.654,45,288.654z"
                filter="url(#glow)"
                style={{ fill: "#ff0800ff" }}
              />
            </g>
            <g>
              <path
                d="M459,288.654c-5.523,0-10-4.478-10-10v-27c0-5.522,4.477-10,10-10s10,4.478,10,10v27 C469,284.177,464.523,288.654,459,288.654z"
                filter="url(#glow)"
                style={{ fill: "red" }}
              />
            </g>
            <g>
              <path
                d="M252,288.654c-5.523,0-10-4.478-10-10v-27c0-5.522,4.477-10,10-10c5.523,0,10,4.478,10,10v27 C262,284.177,257.523,288.654,252,288.654z"
                filter="url(#glow)"
                style={{ fill: "#ff0800ff" }}
              />
            </g>
          </g>
        </svg>
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
              strokeWidth="2"
              transform="translate(0, -40)"
            />
          </g>

          <g filter="url(#glow)" transform="translate(115,130) scale(0.09)">
            <path
              fill={`url(#${gradId})`}
              stroke="black"
              strokeWidth="1"
              transform="translate(0, -500)"
              d="M483.92 0S481.38 24.71 466 40.11c-11.74 11.74-24.09 12.66-40.26 15.07-9.42 1.41-29.7 3.77-34.81-.79-2.37-2.11-3-21-3.22-27.62-.21-6.92-1.36-16.52-2.82-18-.75 3.06-2.49 11.53-3.09 13.61S378.49 34.3 378 36a85.13 85.13 0 0 0-30.09 0c-.46-1.67-3.17-11.48-3.77-13.56s-2.34-10.55-3.09-13.61c-1.45 1.45-2.61 11.05-2.82 18-.21 6.67-.84 25.51-3.22 27.62-5.11 4.56-25.38 2.2-34.8.79-16.16-2.47-28.51-3.39-40.21-15.13C244.57 24.71 242 0 242 0H0s69.52 22.74 97.52 68.59c16.56 27.11 14.14 58.49 9.92 74.73C170 140 221.46 140 273 158.57c69.23 24.93 83.2 76.19 90 93.6 6.77-17.41 20.75-68.67 90-93.6 51.54-18.56 103-18.59 165.56-15.25-4.21-16.24-6.63-47.62 9.93-74.73C656.43 22.74 726 0 726 0z"
            />
          </g>
          <g filter="url(#glow)">
            <path
              d="
                M50 180
                C60 220, 90 280, 150 300
                C210 280, 240 220, 250 180
                C240 200, 210 250, 150 270
                C90 250, 60 200, 50 180
                Z
              "
              fill="url(#batGrad)"
              strokeWidth="2"
              transform="translate(0, -35)"
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
