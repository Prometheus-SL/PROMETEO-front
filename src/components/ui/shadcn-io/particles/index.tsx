"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef } from "react";

type Circle = {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
};

export interface ParticlesProps {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  refresh?: boolean;
  color?: string;
  vx?: number;
  vy?: number;
  active?: boolean;
  interactive?: boolean;
  maxFps?: number;
  pixelRatioCap?: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalizedHex = hex.replace("#", "");

  const fullHex =
    normalizedHex.length === 3
      ? normalizedHex
          .split("")
          .map((char) => char + char)
          .join("")
      : normalizedHex;

  const hexInt = parseInt(fullHex, 16);
  return [(hexInt >> 16) & 255, (hexInt >> 8) & 255, hexInt & 255];
}

export function Particles({
  className = "",
  quantity = 100,
  staticity = 50,
  ease = 50,
  size = 0.4,
  refresh = false,
  color = "#ffffff",
  vx = 0,
  vy = 0,
  active = true,
  interactive = true,
  maxFps = 30,
  pixelRatioCap = 1.5,
}: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const circlesRef = useRef<Circle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const canvasSizeRef = useRef({ w: 0, h: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);
  const pixelRatioRef = useRef(1);
  const documentVisibleRef = useRef(true);
  const viewportVisibleRef = useRef(true);

  const rgb = useMemo(() => hexToRgb(color), [color]);
  const frameInterval = useMemo(
    () => 1000 / Math.max(1, maxFps),
    [maxFps],
  );

  const clearContext = useCallback(() => {
    const context = contextRef.current;
    const { w, h } = canvasSizeRef.current;

    if (!context || w === 0 || h === 0) {
      return;
    }

    context.clearRect(0, 0, w, h);
  }, []);

  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    lastFrameTimeRef.current = 0;
  }, []);

  const createCircle = useCallback((): Circle => {
    const { w, h } = canvasSizeRef.current;

    return {
      x: Math.floor(Math.random() * Math.max(w, 1)),
      y: Math.floor(Math.random() * Math.max(h, 1)),
      translateX: 0,
      translateY: 0,
      size: Math.floor(Math.random() * 2) + size,
      alpha: 0,
      targetAlpha: parseFloat((Math.random() * 0.6 + 0.1).toFixed(1)),
      dx: (Math.random() - 0.5) * 0.1,
      dy: (Math.random() - 0.5) * 0.1,
      magnetism: 0.1 + Math.random() * 4,
    };
  }, [size]);

  const drawCircle = useCallback(
    (circle: Circle) => {
      const context = contextRef.current;
      if (!context) {
        return;
      }

      context.translate(circle.translateX, circle.translateY);
      context.beginPath();
      context.arc(circle.x, circle.y, circle.size, 0, 2 * Math.PI);
      context.fillStyle = `rgba(${rgb.join(", ")}, ${circle.alpha})`;
      context.fill();
      context.setTransform(pixelRatioRef.current, 0, 0, pixelRatioRef.current, 0, 0);
    },
    [rgb],
  );

  const resizeCanvas = useCallback(() => {
    const container = canvasContainerRef.current;
    const canvas = canvasRef.current;
    const context = contextRef.current;

    if (!container || !canvas || !context) {
      return;
    }

    const width = container.offsetWidth;
    const height = container.offsetHeight;

    if (width === 0 || height === 0) {
      return;
    }

    pixelRatioRef.current =
      typeof window === "undefined"
        ? 1
        : Math.min(window.devicePixelRatio || 1, pixelRatioCap);

    canvasSizeRef.current = { w: width, h: height };
    canvas.width = Math.floor(width * pixelRatioRef.current);
    canvas.height = Math.floor(height * pixelRatioRef.current);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(pixelRatioRef.current, pixelRatioRef.current);
  }, [pixelRatioCap]);

  const drawParticles = useCallback(() => {
    clearContext();
    circlesRef.current = [];

    for (let i = 0; i < quantity; i += 1) {
      const circle = createCircle();
      circlesRef.current.push(circle);
      drawCircle(circle);
    }
  }, [clearContext, createCircle, drawCircle, quantity]);

  const initCanvas = useCallback(() => {
    resizeCanvas();
    drawParticles();
  }, [drawParticles, resizeCanvas]);

  const animate = useCallback(
    (timestamp: number) => {
      if (!active || !documentVisibleRef.current || !viewportVisibleRef.current) {
        stopAnimation();
        return;
      }

      if (
        lastFrameTimeRef.current > 0 &&
        timestamp - lastFrameTimeRef.current < frameInterval
      ) {
        animationFrameRef.current = window.requestAnimationFrame(animate);
        return;
      }

      lastFrameTimeRef.current = timestamp;
      clearContext();

      const nextCircles: Circle[] = [];

      for (const circle of circlesRef.current) {
        const nextCircle: Circle = {
          ...circle,
          x: circle.x + circle.dx + vx,
          y: circle.y + circle.dy + vy,
          translateX:
            circle.translateX +
            (mouseRef.current.x / (staticity / circle.magnetism) -
              circle.translateX) /
              ease,
          translateY:
            circle.translateY +
            (mouseRef.current.y / (staticity / circle.magnetism) -
              circle.translateY) /
              ease,
        };

        const edge = [
          nextCircle.x + nextCircle.translateX - nextCircle.size,
          canvasSizeRef.current.w -
            nextCircle.x -
            nextCircle.translateX -
            nextCircle.size,
          nextCircle.y + nextCircle.translateY - nextCircle.size,
          canvasSizeRef.current.h -
            nextCircle.y -
            nextCircle.translateY -
            nextCircle.size,
        ];
        const closestEdge = edge.reduce((smallest, value) =>
          Math.min(smallest, value),
        );
        const remappedEdge = Math.max(
          0,
          ((closestEdge - 0) * (1 - 0)) / (20 - 0) + 0,
        );

        if (remappedEdge > 1) {
          nextCircle.alpha = Math.min(
            nextCircle.targetAlpha,
            nextCircle.alpha + 0.02,
          );
        } else {
          nextCircle.alpha = nextCircle.targetAlpha * remappedEdge;
        }

        const isOutOfBounds =
          nextCircle.x < -nextCircle.size ||
          nextCircle.x > canvasSizeRef.current.w + nextCircle.size ||
          nextCircle.y < -nextCircle.size ||
          nextCircle.y > canvasSizeRef.current.h + nextCircle.size;

        const drawableCircle = isOutOfBounds ? createCircle() : nextCircle;
        nextCircles.push(drawableCircle);
        drawCircle(drawableCircle);
      }

      circlesRef.current = nextCircles;
      animationFrameRef.current = window.requestAnimationFrame(animate);
    },
    [
      active,
      clearContext,
      createCircle,
      drawCircle,
      ease,
      frameInterval,
      staticity,
      stopAnimation,
      vx,
      vy,
    ],
  );

  const startAnimation = useCallback(() => {
    if (
      !active ||
      animationFrameRef.current !== null ||
      !documentVisibleRef.current ||
      !viewportVisibleRef.current
    ) {
      return;
    }

    lastFrameTimeRef.current = 0;
    animationFrameRef.current = window.requestAnimationFrame(animate);
  }, [active, animate]);

  useEffect(() => {
    if (canvasRef.current) {
      contextRef.current = canvasRef.current.getContext("2d", {
        alpha: true,
        desynchronized: true,
      });
    }

    initCanvas();

    if (active) {
      startAnimation();
    } else {
      stopAnimation();
    }

    return stopAnimation;
  }, [active, color, initCanvas, refresh, startAnimation, stopAnimation]);

  useEffect(() => {
    const handleResize = () => {
      initCanvas();
      if (active) {
        startAnimation();
      }
    };

    window.addEventListener("resize", handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (
      typeof ResizeObserver !== "undefined" &&
      canvasContainerRef.current
    ) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(canvasContainerRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
    };
  }, [active, initCanvas, startAnimation]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      documentVisibleRef.current = document.visibilityState !== "hidden";

      if (documentVisibleRef.current) {
        if (circlesRef.current.length === 0) {
          initCanvas();
        }
        startAnimation();
      } else {
        stopAnimation();
      }
    };

    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [initCanvas, startAnimation, stopAnimation]);

  useEffect(() => {
    const node = canvasContainerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        viewportVisibleRef.current = entry.isIntersecting;

        if (entry.isIntersecting) {
          if (circlesRef.current.length === 0) {
            initCanvas();
          }
          startAnimation();
        } else {
          stopAnimation();
        }
      },
      { threshold: 0.05 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [initCanvas, startAnimation, stopAnimation]);

  useEffect(() => {
    if (!interactive || !active) {
      mouseRef.current = { x: 0, y: 0 };
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const { w, h } = canvasSizeRef.current;
      const x = event.clientX - rect.left - w / 2;
      const y = event.clientY - rect.top - h / 2;
      const inside = x < w / 2 && x > -w / 2 && y < h / 2 && y > -h / 2;

      mouseRef.current = inside ? { x, y } : { x: 0, y: 0 };
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [active, interactive]);

  return (
    <div
      className={cn("pointer-events-none", className)}
      ref={canvasContainerRef}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}

Particles.displayName = "Particles";
