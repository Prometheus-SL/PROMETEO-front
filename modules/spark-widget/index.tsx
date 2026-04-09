import type { CSSProperties } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSharedContext } from "@/hooks/useSharedContext";
import type { SharedAction } from "@/contexts/SharedContext";
import { Particles } from "@/components/ui/shadcn-io/particles";
import { askAI, transcribeAudio } from "./ai-service";
import PooSvg from "./complements/poo.svg";
import { renderSparkAccessory, type Accessory } from "./spark-accessories";

type Mood = "happy" | "sleepy" | "angry" | "surprised";
type PoopDrop = {
  id: string;
  left: number;
  top: number;
  rotation: number;
  scale: number;
};

const INACTIVE_MOOD_CYCLE: Mood[] = ["sleepy", "angry", "surprised"];
const SPARK_SILENCE_RMS_THRESHOLD = 0.02;
const SPARK_SILENCE_STOP_MS = 1200;
const SPARK_NO_SPEECH_TIMEOUT_MS = 4000;

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
  const darkerSurfaceColor = useMemo(() => darken(color, 0.45), [color]);
  const surfaceShadow = useMemo(
    () => toRgba(darken(color, 0.65), 0.65),
    [color],
  );
  const backgroundGradient = useMemo(
    () =>
      `radial-gradient(120% 120% at 50% 0%, ${toRgba(
        lighten(color, 0.55),
        0.35,
      )}, rgba(2, 6, 23, 0.94))`,
    [color],
  );
  const topBackgroundGlow = useMemo(
    () =>
      `radial-gradient(circle at 50% 0%, ${toRgba(accentColor, 0.55)}, transparent 70%)`,
    [accentColor],
  );
  const bottomBackgroundGlow = useMemo(
    () =>
      `radial-gradient(circle at 50% 100%, ${toRgba(
        darkerSurfaceColor,
        0.48,
      )}, transparent 65%)`,
    [darkerSurfaceColor],
  );
  const sparkGroundGlow = useMemo(
    () =>
      `radial-gradient(60% 80% at 50% 50%, ${toRgba(
        accentColor,
        0.65,
      )}, transparent)`,
    [accentColor],
  );

  // Estado actual (puede cambiar por inactividad)
  const [mood, setMood] = useState<Mood>(baseMood);
  const [poops, setPoops] = useState<PoopDrop[]>([]);
  const pooSpawnEnabled = (config["pooEnabled"] as boolean | undefined) ?? true;
  const spawnMin = Math.max(10000, Number(config["pooMinDelayMs"] ?? 45000));
  const spawnMax = Math.max(
    spawnMin + 1000,
    Number(config["pooMaxDelayMs"] ?? 90000),
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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioMimeTypeRef = useRef("audio/webm");
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioFrameRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const noSpeechTimeoutRef = useRef<number | null>(null);
  const hasDetectedSpeechRef = useRef(false);

  const markActive = useCallback(() => {
    lastActiveRef.current = Date.now();
    setMood((prev) => (prev === baseMood ? prev : baseMood));
  }, [baseMood]);

  const handlePoopClick = useCallback(
    (id: string) => {
      markActive();
      setPoops((prev) => prev.filter((poop) => poop.id !== id));
    },
    [markActive],
  );

  useEffect(() => {
    if (!autoMood) return;
    const id = window.setInterval(() => {
      const elapsed = Date.now() - lastActiveRef.current;
      const nextMood =
        elapsed < inactivityMs
          ? baseMood
          : INACTIVE_MOOD_CYCLE[
              Math.floor((elapsed - inactivityMs) / stepMs) %
                INACTIVE_MOOD_CYCLE.length
            ];
      setMood((prev) => (prev === nextMood ? prev : nextMood));
    }, 5000);
    return () => window.clearInterval(id);
  }, [autoMood, baseMood, inactivityMs, stepMs]);

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
            (a) => a.id !== "spark-widget:help",
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
    [setShowModal],
  );

  const normalizedActions = useMemo(
    () =>
      availableActions.map((action) => ({
        action,
        title: action.title.toLowerCase(),
        tags: (action.intentTags ?? []).map((tag) => tag.toLowerCase()),
      })),
    [availableActions],
  );

  const pickAction = useCallback(
    (transcript: string): SharedAction | null => {
      const normalizedTranscript = transcript.toLowerCase();
      let best: { action: SharedAction; score: number } | null = null;

      for (const candidate of normalizedActions) {
        let score = 0;
        for (const tag of candidate.tags) {
          if (normalizedTranscript.includes(tag)) score += 3;
        }
        if (normalizedTranscript.includes(candidate.title)) score += 1;

        if (score > 0 && (!best || score > best.score)) {
          best = { action: candidate.action, score };
        }
      }

      return best?.action ?? null;
    },
    [normalizedActions],
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
    [pickAction, speak],
  );

  const stopMediaStream = useCallback((stream?: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const stopAudioMonitoring = useCallback(() => {
    if (audioFrameRef.current !== null) {
      window.cancelAnimationFrame(audioFrameRef.current);
      audioFrameRef.current = null;
    }

    if (silenceTimeoutRef.current !== null) {
      window.clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (noSpeechTimeoutRef.current !== null) {
      window.clearTimeout(noSpeechTimeoutRef.current);
      noSpeechTimeoutRef.current = null;
    }

    analyserRef.current?.disconnect();
    analyserRef.current = null;
    sourceNodeRef.current?.disconnect();
    sourceNodeRef.current = null;

    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext && audioContext.state !== "closed") {
      void audioContext.close().catch(() => undefined);
    }

    hasDetectedSpeechRef.current = false;
  }, []);

  const stopCurrentRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const startAudioMonitoring = useCallback(
    (stream: MediaStream) => {
      if (typeof AudioContext === "undefined") {
        return;
      }

      stopAudioMonitoring();

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const sourceNode = audioContext.createMediaStreamSource(stream);
      const samples = new Uint8Array(analyser.fftSize);

      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.18;
      sourceNode.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceNodeRef.current = sourceNode;
      hasDetectedSpeechRef.current = false;

      void audioContext.resume().catch(() => undefined);

      const monitor = () => {
        const activeAnalyser = analyserRef.current;
        if (!activeAnalyser) {
          return;
        }

        activeAnalyser.getByteTimeDomainData(samples);

        let sumSquares = 0;
        for (const sample of samples) {
          const normalized = (sample - 128) / 128;
          sumSquares += normalized * normalized;
        }

        const rms = Math.sqrt(sumSquares / samples.length);

        if (rms >= SPARK_SILENCE_RMS_THRESHOLD) {
          hasDetectedSpeechRef.current = true;

          if (noSpeechTimeoutRef.current !== null) {
            window.clearTimeout(noSpeechTimeoutRef.current);
            noSpeechTimeoutRef.current = null;
          }

          if (silenceTimeoutRef.current !== null) {
            window.clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
        } else if (
          hasDetectedSpeechRef.current &&
          silenceTimeoutRef.current === null
        ) {
          silenceTimeoutRef.current = window.setTimeout(() => {
            silenceTimeoutRef.current = null;
            console.info("[spark-widget:audio] auto-stop-silence");
            stopCurrentRecording();
          }, SPARK_SILENCE_STOP_MS);
        }

        audioFrameRef.current = window.requestAnimationFrame(monitor);
      };

      noSpeechTimeoutRef.current = window.setTimeout(() => {
        noSpeechTimeoutRef.current = null;

        if (!hasDetectedSpeechRef.current) {
          console.info("[spark-widget:audio] auto-stop-no-speech");
          stopCurrentRecording();
        }
      }, SPARK_NO_SPEECH_TIMEOUT_MS);

      audioFrameRef.current = window.requestAnimationFrame(monitor);
    },
    [stopAudioMonitoring, stopCurrentRecording],
  );

  useEffect(() => {
    return () => {
      stopCurrentRecording();
      stopAudioMonitoring();
      stopMediaStream(mediaStreamRef.current);
      mediaRecorderRef.current = null;
      mediaStreamRef.current = null;
      audioChunksRef.current = [];
    };
  }, [stopAudioMonitoring, stopCurrentRecording, stopMediaStream]);

  const handleRecordedListening = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      toast.error("Este navegador no soporta grabacion de audio.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      toast.error("Este entorno no soporta grabacion local.");
      return;
    }

    if (isTranscribing) {
      toast.info("Estoy procesando el audio anterior.");
      return;
    }

    const currentRecorder = mediaRecorderRef.current;
    if (isListening && currentRecorder) {
      stopCurrentRecording();
      setIsListening(false);
      return;
    }

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mimeType = getPreferredRecordingMimeType();
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);

        mediaStreamRef.current = stream;
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];
        audioMimeTypeRef.current =
          recorder.mimeType || mimeType || "audio/webm";

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onerror = (event) => {
          console.error("[spark-widget:audio] recorder-error", event);
          stopAudioMonitoring();
          stopMediaStream(stream);
          mediaRecorderRef.current = null;
          mediaStreamRef.current = null;
          audioChunksRef.current = [];
          setIsListening(false);
          setIsTranscribing(false);
          toast.error("Hubo un error al grabar el audio.");
        };

        recorder.onstop = async () => {
          const chunks = audioChunksRef.current;
          const recordedMimeType = audioMimeTypeRef.current || "audio/webm";
          const recordedStream = mediaStreamRef.current;
          const speechDetected = hasDetectedSpeechRef.current;

          stopAudioMonitoring();
          audioChunksRef.current = [];
          mediaRecorderRef.current = null;
          mediaStreamRef.current = null;
          stopMediaStream(recordedStream);
          setIsListening(false);

          if (chunks.length === 0) {
            toast.error("No se capturo audio.");
            return;
          }

          if (!speechDetected) {
            toast.error("No te oi hablar claramente.");
            return;
          }

          const audioBlob = new Blob(chunks, { type: recordedMimeType });
          const extension = getExtensionFromMimeType(recordedMimeType);

          try {
            console.info("[spark-widget:audio] transcribing", {
              size: audioBlob.size,
              mimeType: recordedMimeType,
            });
            setIsTranscribing(true);
            const transcript = await transcribeAudio(
              audioBlob,
              `speech.${extension}`,
            );

            if (!transcript) {
              toast.error("No se entendio nada claro.");
              return;
            }

            await handleTranscript(transcript);
          } catch (error) {
            console.error("[spark-widget:audio] transcription-error", error);
            toast.error("No pude transcribir el audio.");
          } finally {
            setIsTranscribing(false);
          }
        };

        console.info("[spark-widget:audio] recording-started", {
          mimeType: audioMimeTypeRef.current,
        });
        setIsListening(true);
        recorder.start();
        startAudioMonitoring(stream);
      } catch (error) {
        console.error("[spark-widget:audio] start-error", error);
        stopAudioMonitoring();
        stopMediaStream(mediaStreamRef.current);
        mediaRecorderRef.current = null;
        mediaStreamRef.current = null;
        audioChunksRef.current = [];
        setIsListening(false);
        setIsTranscribing(false);
        toast.error("No pude acceder al microfono.");
      }
    };

    void startRecording();
  }, [
    handleTranscript,
    isListening,
    isTranscribing,
    startAudioMonitoring,
    stopAudioMonitoring,
    stopCurrentRecording,
    stopMediaStream,
  ]);

  const handleSparkPress = useCallback(() => {
    markActive();
    handleRecordedListening();
  }, [handleRecordedListening, markActive]);

  return (
    <>
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          background: backgroundGradient,
          borderColor,
          boxShadow: `0 18px 50px ${surfaceShadow}, inset 0 0 24px ${glowColor}`,
        }}
      />

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-x-[-28%] top-[-35%] h-[65%] blur-[120px] opacity-60"
          style={{ background: topBackgroundGlow }}
        />
        <div
          className="absolute inset-x-[-25%] bottom-[-45%] h-[70%] blur-[140px] opacity-70"
          style={{ background: bottomBackgroundGlow }}
        />
      </div>

      <div className="relative flex h-full w-full items-center justify-center overflow-visible">
        <div className="relative flex flex-col items-center justify-center gap-3">
          <div
            aria-hidden="true"
            className="absolute inset-x-[-35%] top-[58%] -z-10 h-40 blur-[100px] opacity-80"
            style={{ background: sparkGroundGlow }}
          />

          <button
            type="button"
            aria-label={
              isListening ? "Detener grabacion de Spark" : "Hablar con Spark"
            }
            onClick={handleSparkPress}
            disabled={isTranscribing}
            className="group/spark relative rounded-full bg-transparent p-0 transition-transform duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 disabled:cursor-wait disabled:opacity-80"
          >
            {isListening ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-[-8%] rounded-full border border-white/40"
                style={{
                  boxShadow: `0 0 0 10px ${toRgba(accentColor, 0.12)}`,
                }}
              />
            ) : null}
            <SparkSvg color={color} mood={mood} accessory={accessory} />
          </button>

          <div className="min-h-5 text-center text-xs font-medium text-foreground/80">
            {isListening
              ? "Escuchando. Se parara cuando detecte silencio."
              : isTranscribing
                ? "Procesando..."
                : `Toca a ${name} para hablar`}
          </div>
        </div>
      </div>

      <Particles
        className="absolute inset-0 overflow-hidden"
        quantity={28}
        ease={85}
        staticity={60}
        color={accentColor}
        size={0.45}
      />

      <div className="pointer-events-none absolute inset-0 ">
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
              className="h-12 w-12 select-none"
              draggable={false}
            />
          </button>
        ))}
      </div>
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-slate-900/90 text-foreground backdrop-blur">
          <DialogHeader>
            <DialogTitle>
              {lastTranscript.charAt(0).toUpperCase() + lastTranscript.slice(1)}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            <div className="pr-2 text-sm text-foreground/80">
              {assistantMessage || "..."}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getPreferredRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  return (
    candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ??
    ""
  );
}

function getExtensionFromMimeType(mimeType: string) {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

type SparkSvgProps = {
  color: string;
  mood: Mood;
  accessory: Accessory;
};

const SparkSvg = memo(function SparkSvg({
  color,
  mood,
  accessory,
}: SparkSvgProps) {
  const eyeY = 94;
  const eyeXOffset = 26;
  const eyeR = 7.5;

  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimeoutRef = useRef<number | null>(null);
  const scheduleTimeoutRef = useRef<number | null>(null);

  const [gazeDir, setGazeDir] = useState<-1 | 0 | 1>(0);
  const gazeTimeoutRef = useRef<number | null>(null);
  const [shouldAnimate, setShouldAnimate] = useState(true);

  const gradId = useMemo(
    () => `spark-body-${Math.random().toString(36).slice(2)}`,
    [],
  );
  const highlightId = useMemo(
    () => `spark-highlight-${Math.random().toString(36).slice(2)}`,
    [],
  );
  const glowFilterId = useMemo(
    () => `spark-glow-${Math.random().toString(36).slice(2)}`,
    [],
  );
  const crownGradientId = useMemo(
    () => `spark-crown-${Math.random().toString(36).slice(2)}`,
    [],
  );
  const batGradientId = useMemo(
    () => `spark-bat-${Math.random().toString(36).slice(2)}`,
    [],
  );
  const batGlowFilterId = useMemo(
    () => `spark-bat-glow-${Math.random().toString(36).slice(2)}`,
    [],
  );

  useEffect(() => {
    const scheduleNextBlink = () => {
      const delay = 2000 + Math.random() * 4000;
      scheduleTimeoutRef.current = window.setTimeout(() => {
        setIsBlinking(true);
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

  useEffect(() => {
    const scheduleNextGaze = () => {
      const delay = 1200 + Math.random() * 1800;
      gazeTimeoutRef.current = window.setTimeout(() => {
        const options: Array<-1 | 0 | 1> = [-1, 0, 1];
        const weights = options.map((option) => (option === 0 ? 0.5 : 0.25));
        const random = Math.random();
        let accumulated = 0;
        let next: -1 | 0 | 1 = 0;

        for (let i = 0; i < options.length; i++) {
          accumulated += weights[i];
          if (random <= accumulated) {
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

  const strokeColor = useMemo(() => darken(color, 0.55), [color]);
  const lightColor = useMemo(() => lighten(color, 0.22), [color]);
  const svgAnimationStyle = useMemo<CSSProperties>(
    () =>
      shouldAnimate
        ? { animation: "spark-widget-float 7s ease-in-out infinite" }
        : {},
    [shouldAnimate],
  );
  const sheenStyle = useMemo<CSSProperties>(
    () =>
      shouldAnimate
        ? {
            animation: "spark-widget-halo 8s ease-in-out infinite",
            opacity: 0.16,
          }
        : { opacity: 0.12 },
    [shouldAnimate],
  );

  const mouth = useMemo(() => {
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
  }, [mood]);

  const accessoryNode = useMemo(
    () =>
      renderSparkAccessory({
        accessory,
        eyeY,
        eyeXOffset,
        strokeColor,
        bodyGradientId: gradId,
        bodyGlowFilterId: glowFilterId,
        crownGradientId,
        batGradientId,
        batGlowFilterId,
      }),
    [
      accessory,
      eyeY,
      eyeXOffset,
      strokeColor,
      gradId,
      glowFilterId,
      crownGradientId,
      batGradientId,
      batGlowFilterId,
    ],
  );

  return (
    <svg
      viewBox="0 0 184 184"
      role="img"
      aria-label="Spark preview"
      className="spark relative z-10 h-auto w-full max-w-[200px] drop-shadow-[0_10px_35px_rgba(0,0,0,0.5)]"
      style={svgAnimationStyle}
    >
      <defs>
        <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
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

      <g filter={`url(#${glowFilterId})`}>
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

      {isBlinking ? (
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
          <circle cx={92 - eyeXOffset} cy={eyeY} r={eyeR + 2.5} fill="#fff" />
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
          <circle cx={92 + eyeXOffset} cy={eyeY} r={eyeR + 2.5} fill="#fff" />
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

      {mouth}
      <ellipse cx="82" cy="58" rx="14" ry="9" fill="#fff" style={sheenStyle} />
      {accessoryNode}
    </svg>
  );
});

SparkSvg.displayName = "SparkSvg";
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
