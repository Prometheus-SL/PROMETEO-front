import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSharedContext } from "@/hooks/useSharedContext";
import type { SharedAction } from "@/contexts/SharedContext";
import { Particles } from "@/components/ui/shadcn-io/particles";
import { askAI } from "./ai-service";
import TresCreusSvg from "./complements/trescreus.svg";
import SpidermanSvg from "./complements/spiderman.svg";
import PooSvg from "./complements/poo.svg";

type Mood = "happy" | "sleepy" | "angry" | "surprised";
type Accessory =
  | "none"
  | "glasses"
  | "crown"
  | "antenna"
  | "batman"
  | "spiderman"
  | "trescreus";
type PoopDrop = {
  id: string;
  left: number;
  top: number;
  rotation: number;
  scale: number;
};

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
  const accentColor = useMemo(() => lighten(color, 0.3), [color]);
  const borderColor = useMemo(() => toRgba(lighten(color, 0.2), 0.4), [color]);
  const glowColor = useMemo(() => toRgba(lighten(color, 0.5), 0.35), [color]);
  const surfaceShadow = useMemo(
    () => toRgba(darken(color, 0.65), 0.65),
    [color]
  );
  const backgroundGradient = useMemo(
    () =>
      `radial-gradient(120% 120% at 50% 0%, ${toRgba(
        lighten(color, 0.55),
        0.35
      )}, rgba(2, 6, 23, 0.94))`,
    [color]
  );

  // Estado actual (puede cambiar por inactividad)
  const [mood, setMood] = useState<Mood>(baseMood);
  const [poops, setPoops] = useState<PoopDrop[]>([]);
  const pooSpawnEnabled = (config["pooEnabled"] as boolean | undefined) ?? true;
  const spawnMin = Math.max(10000, Number(config["pooMinDelayMs"] ?? 45000));
  const spawnMax = Math.max(
    spawnMin + 1000,
    Number(config["pooMaxDelayMs"] ?? 90000)
  );
  const pooLimit = Math.max(1, Number(config["pooMaxCount"] ?? 3));
  const lastActiveRef = useRef<number>(Date.now());
  const spawnTimeoutRef = useRef<number | null>(null);

  // Auto-cambio de ánimo por inactividad (opcional)
  const autoMood = (config["autoMood"] as boolean | undefined) ?? true;
  const inactivityMs = Number(config["inactivityMs"] ?? 20000); // 20s
  const stepMs = Number(config["inactivityStepMs"] ?? 20000); // cada 20s cambia

  const { getActions, subscribeActions, registerAction, unregisterAction } =
    useSharedContext();
  const [availableActions, setAvailableActions] = useState<SharedAction[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const markActive = () => {
    lastActiveRef.current = Date.now();
    setMood(baseMood);
  };

  const handlePoopClick = (id: string) => {
    markActive();
    setPoops((prev) => prev.filter((poop) => poop.id !== id));
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

  useEffect(() => {
    if (!pooSpawnEnabled) {
      setPoops([]);
      if (spawnTimeoutRef.current) {
        window.clearTimeout(spawnTimeoutRef.current);
        spawnTimeoutRef.current = null;
      }
      return;
    }

    const scheduleNext = () => {
      const delay = spawnMin + Math.random() * (spawnMax - spawnMin);
      spawnTimeoutRef.current = window.setTimeout(() => {
        setPoops((prev) => {
          if (prev.length >= pooLimit) return prev;
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const left = 15 + Math.random() * 70;
          const top = 58 + Math.random() * 32;
          const rotation = (Math.random() - 0.5) * 40;
          const scale = 0.6 + Math.random() * 0.4;
          return [...prev, { id, left, top, rotation, scale }];
        });
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      if (spawnTimeoutRef.current) {
        window.clearTimeout(spawnTimeoutRef.current);
        spawnTimeoutRef.current = null;
      }
    };
  }, [pooSpawnEnabled, spawnMin, spawnMax, pooLimit]);

  useEffect(() => {
    setAvailableActions(getActions());
    const unsubscribe = subscribeActions(setAvailableActions);
    return unsubscribe;
  }, [getActions, subscribeActions]);

  useEffect(() => {
    const actions = [
      {
        id: "spark-widget:help",
        widgetId: "spark-widget",
        title: "Ayuda",
        description: "Explica qué cosas puedo hacer",
        intentTags: ["ayuda", "qué puedes hacer", "cómo funciona", "qué haces"],
        run: () => {
          const allActions = getActions().filter(
            (a) => a.id !== "spark-widget:help"
          );
          const names = allActions.map((a) => a.title).join(", ");
          return {
            success: true,
            message:
              allActions.length > 0
                ? `Puedo ejecutar: ${names}.`
                : "Aún no hay acciones de otros widgets. Instala o expón acciones para controlarlas.",
          };
        },
      },
      {
        id: "spark-widget:time",
        widgetId: "spark-widget",
        title: "Decir la hora",
        description: "Te dice la hora actual",
        intentTags: ["qué hora es", "hora", "dime la hora", "hora actual"],
        run: () => {
          const now = new Date();
          const hours = now.getHours();
          const minutes = now.getMinutes();
          const timeStr = `${hours}:${minutes.toString().padStart(2, "0")}`;
          return {
            success: true,
            message: `Son las ${timeStr}.`,
          };
        },
      },
      {
        id: "spark-widget:date",
        widgetId: "spark-widget",
        title: "Decir la fecha",
        description: "Te dice la fecha actual",
        intentTags: [
          "qué día es",
          "fecha",
          "dime la fecha",
          "fecha actual",
          "qué fecha es",
        ],
        run: () => {
          const now = new Date();
          const options: Intl.DateTimeFormatOptions = {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          };
          const dateStr = now.toLocaleDateString("es-ES", options);
          return {
            success: true,
            message: `Hoy es ${dateStr}.`,
          };
        },
      },
      {
        id: "spark-widget:joke",
        widgetId: "spark-widget",
        title: "Contar un chiste",
        description: "Te cuenta un chiste aleatorio",
        intentTags: [
          "cuéntame un chiste",
          "dime un chiste",
          "chiste",
          "hazme reír",
        ],
        run: () => {
          const jokes = [
            "¿Por qué los pájaros no usan Facebook? Porque ya tienen Twitter.",
            "¿Cómo se despiden los químicos? Ácido un placer.",
            "¿Qué le dice un techo a otro? Techo de menos.",
            "¿Por qué las focas del circo miran siempre hacia arriba? Porque es donde están los focos.",
            "¿Cuál es el colmo de un electricista? Que su mujer se llame Luz y sus hijos le sigan la corriente.",
          ];
          const joke = jokes[Math.floor(Math.random() * jokes.length)];
          return {
            success: true,
            message: joke,
          };
        },
      },
    ];

    actions.forEach(registerAction);
    return () => {
      actions.forEach((action) => unregisterAction(action.id));
    };
  }, [getActions, registerAction, unregisterAction]);

  // Ya no necesitamos el timeout del modal, se cierra cuando termina el TTS
  useEffect(() => {
    if (isListening) {
      setMood("surprised");
    } else {
      setMood(baseMood);
    }
  }, [isListening, baseMood]);

  const ensureRecognition = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (recognitionRef.current) return recognitionRef.current;
    const Recognition =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitSpeechRecognition;
    if (!Recognition) return null;
    const instance = new Recognition();
    instance.continuous = false;
    instance.interimResults = false;
    instance.lang = "es-ES";
    recognitionRef.current = instance;
    return instance;
  }, []);

  const speak = useCallback(
    (text: string, lang = "es-ES") => {
      if (typeof window === "undefined") return false;
      if (!("speechSynthesis" in window)) return false;
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang;

      // Cerrar modal cuando termine de hablar
      utter.onend = () => {
        setShowModal(false);
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
      return true;
    },
    [setShowModal]
  );

  const pickAction = useCallback(
    (transcript: string): SharedAction | null => {
      const normalized = transcript.toLowerCase();
      let best: { action: SharedAction; score: number } | null = null;
      for (const action of availableActions as SharedAction[]) {
        const tags = action.intentTags ?? [];
        let score = 0;
        tags.forEach((tag) => {
          if (normalized.includes(tag.toLowerCase())) score += 3;
        });
        if (normalized.includes(action.title.toLowerCase())) score += 1;
        if (score > 0 && (!best || score > best.score)) {
          best = { action, score };
        }
      }
      return best ? best.action : null;
    },
    [availableActions]
  );

  const handleTranscript = useCallback(
    async (transcript: string) => {
      setLastTranscript(transcript);
      const action = pickAction(transcript);

      if (!action) {
        setAssistantMessage("Pensando...");
        setShowModal(true);

        try {
          const aiResponse = await askAI(transcript);
          setAssistantMessage(aiResponse);
          speak(aiResponse);
        } catch (error) {
          console.error("Error calling AI:", error);
          const fallbackMessage =
            "No encontré una acción para eso y no pude consultar la IA. Prueba con 'pausa la música' o 'actualiza el clima'.";
          setAssistantMessage(fallbackMessage);
          speak(fallbackMessage);
        }
        return;
      }

      try {
        const result = await action.run({ transcript });
        const message = result?.message ?? "Acción ejecutada.";
        setAssistantMessage(message);
        setShowModal(true);
        speak(message);
      } catch (error) {
        console.error("Error executing action", error);
        const message = "Hubo un error al ejecutar la acción.";
        setAssistantMessage(message);
        setShowModal(true);
        speak(message);
        toast.error(message);
      }
    },
    [pickAction, speak]
  );

  const handleToggleListening = useCallback(() => {
    const recognition = ensureRecognition();
    if (!recognition) {
      toast.error("El navegador no soporta reconocimiento de voz.");
      return;
    }
    if (isListening) {
      recognition.stop();
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0]?.transcript)
        .join(" ")
        .trim();
      if (transcript) {
        handleTranscript(transcript);
      } else {
        toast.error("No se escuchó nada claro.");
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event);
      toast.error("Error al escuchar.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      setIsListening(true);
      recognition.start();
    } catch (error) {
      console.error("Speech recognition start error", error);
      setIsListening(false);
    }
  }, [ensureRecognition, handleTranscript, isListening]);

  return (
    <>
      <Card
        className="group relative h-full w-full overflow-hidden rounded-2xl border bg-transparent p-6 backdrop-blur-md transition-[transform,box-shadow] duration-500"
        style={{
          background: backgroundGradient,
          borderColor,
          boxShadow: `0 18px 50px ${surfaceShadow}, inset 0 0 24px ${glowColor}`,
        }}
        onMouseMove={markActive}
        onPointerDown={markActive}
        onTouchStart={markActive}
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div
            className="absolute inset-x-[-28%] top-[-35%] h-[65%] blur-[120px] opacity-60"
            style={{
              background: `radial-gradient(circle at 50% 0%, ${toRgba(
                accentColor,
                0.55
              )}, transparent 70%)`,
            }}
          />
          <div
            className="absolute inset-x-[-25%] bottom-[-45%] h-[70%] blur-[140px] opacity-70"
            style={{
              background: `radial-gradient(circle at 50% 100%, ${toRgba(
                darken(color, 0.45),
                0.48
              )}, transparent 65%)`,
            }}
          />
        </div>
        <div className="relative flex h-full w-full items-center justify-center overflow-visible">
          <div className="relative flex flex-col items-center justify-center gap-3">
            <div
              aria-hidden="true"
              className="absolute inset-x-[-35%] top-[58%] -z-10 h-40 blur-[100px] opacity-80 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                background: `radial-gradient(60% 80% at 50% 50%, ${toRgba(
                  accentColor,
                  0.65
                )}, transparent)`,
              }}
            />
            {/* Chispa */}
            <SparkSvg color={color} mood={mood} accessory={accessory} />

            {/* Nombre */}
            <div className="w-full text-center text-sm font-medium tracking-wide text-foreground/90">
              {name || "Chispa"}
            </div>
          </div>
        </div>
        {/* Interactive particles */}
        <Particles
          className="absolute inset-0 -z-20 overflow-hidden"
          quantity={220}
          ease={85}
          staticity={60}
          color={accentColor}
          size={0.45}
          refresh
        />
        <div className="pointer-events-none absolute inset-0 z-20">
          {poops.map((poop) => (
            <button
              key={poop.id}
              type="button"
              aria-label="Limpiar caca"
              onClick={() => handlePoopClick(poop.id)}
              className="pointer-events-auto absolute origin-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)] transition-transform duration-200 hover:scale-110 focus-visible:scale-110"
              style={{
                left: `${poop.left}%`,
                top: `${poop.top}%`,
                transform: `translate(-50%, -50%) rotate(${poop.rotation}deg) scale(${poop.scale})`,
              }}
            >
              <img
                src={PooSvg}
                alt=""
                className="h-14 w-14 select-none"
                draggable={false}
              />
            </button>
          ))}
        </div>
        <div className="pointer-events-auto absolute bottom-4 left-4 right-4 z-30 flex items-center justify-between gap-3">
          <Button
            type="button"
            size="sm"
            variant={isListening ? "secondary" : "outline"}
            className="rounded-full border-foreground/40 bg-black/30 px-4 text-xs font-semibold backdrop-blur transition hover:scale-105"
            onClick={handleToggleListening}
          >
            {isListening ? "Escuchando" : "Hablar"}
          </Button>
        </div>
      </Card>
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-slate-900/90 text-foreground backdrop-blur">
          <DialogHeader>
            <DialogTitle>
              {lastTranscript.charAt(0).toUpperCase() + lastTranscript.slice(1)}
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-foreground/80">
            {assistantMessage || "..."}
          </div>
        </DialogContent>
      </Dialog>
    </>
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
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const floatAnimId = useMemo(
    () => `spark-float-${Math.random().toString(36).slice(2)}`,
    []
  );
  const haloAnimId = useMemo(
    () => `spark-halo-${Math.random().toString(36).slice(2)}`,
    []
  );
  const sparkleAnimId = useMemo(
    () => `spark-sparkle-${Math.random().toString(36).slice(2)}`,
    []
  );
  const gradId = useMemo(
    () => `spark-body-${Math.random().toString(36).slice(2)}`,
    []
  );

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

  // Animate softly unless the user prefers reduced motion.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setShouldAnimate(!query.matches);
    handleChange();
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", handleChange);
      return () => query.removeEventListener("change", handleChange);
    }
    query.addListener(handleChange);
    return () => query.removeListener(handleChange);
  }, []);

  // Keyframes are injected dynamically to avoid global CSS dependencies.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const style = document.createElement("style");
    style.setAttribute("data-spark-style", gradId);
    style.textContent = `
      @keyframes ${floatAnimId} {
        0% { transform: translateY(0px) scale(1); }
        50% { transform: translateY(-6px) scale(1.02); }
        100% { transform: translateY(0px) scale(1); }
      }
      @keyframes ${haloAnimId} {
        0% { opacity: 0.18; filter: blur(0px); }
        50% { opacity: 0.46; filter: blur(1.5px); }
        100% { opacity: 0.2; filter: blur(0.2px); }
      }
      @keyframes ${sparkleAnimId} {
        0%, 100% { opacity: 0.15; transform: scale(0.85); }
        50% { opacity: 0.7; transform: scale(1.25); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, [floatAnimId, haloAnimId, sparkleAnimId, gradId]);

  const highlightId = useMemo(
    () => `spark-highlight-${Math.random().toString(36).slice(2)}`,
    []
  );
  const strokeColor = darken(color, 0.55);
  const lightColor = lighten(color, 0.22);
  const svgAnimationStyle = useMemo<CSSProperties>(
    () =>
      shouldAnimate
        ? { animation: `${floatAnimId} 7s ease-in-out infinite` }
        : {},
    [floatAnimId, shouldAnimate]
  );
  const sheenStyle = useMemo<CSSProperties>(
    () =>
      shouldAnimate
        ? { animation: `${haloAnimId} 8s ease-in-out infinite`, opacity: 0.16 }
        : { opacity: 0.12 },
    [haloAnimId, shouldAnimate]
  );

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
      className="spark relative z-10 h-auto w-full max-w-[200px] drop-shadow-[0_10px_35px_rgba(0,0,0,0.5)]"
      style={svgAnimationStyle}
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={gradId} x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor={lightColor} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        <radialGradient id={highlightId} cx="50%" cy="30%" r="55%">
          <stop offset="0%" stopColor={toRgba("#ffffff", 0.45)} />
          <stop offset="45%" stopColor={toRgba(lightColor, 0.35)} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

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
      {/* brillo superior */}
      <ellipse cx="82" cy="58" rx="14" ry="9" fill="#fff" style={sheenStyle} />
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
      {accessory === "trescreus" && (
        <image
          href={TresCreusSvg}
          viewBox="0 0 1280 1280"
          role="img"
          xmlns="http://www.w3.org/2000/svg"
          transform="translate(110,125) scale(0.2)"
        />
      )}
      {accessory === "spiderman" && (
        <image
          href={SpidermanSvg}
          role="img"
          xmlns="http://www.w3.org/2000/svg"
          transform="scale(3.5) translate(-50,-49)"
        />
      )}
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
function toRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}
