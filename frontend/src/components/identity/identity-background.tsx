"use client";

import { useEffect, useRef } from "react";

import styles from "@/styles/identity/identity-background.module.css";

type Strand = {
  color: string;
  curve: number;
  offset: number;
  opacity: number;
  width: number;
};

const STRAND_COUNT = 56;
const FAN_SPREAD = Math.PI * 0.27;
const ROTATION_DURATION_MS = 60_000;

const COLOR_STOPS = [
  [255, 106, 0],
  [255, 164, 46],
  [189, 91, 255],
  [75, 93, 255],
  [0, 0, 128],
] as const;

function interpolateColor(
  position: number,
): [number, number, number] {
  const scaled = position * (COLOR_STOPS.length - 1);

  const index = Math.min(
    Math.floor(scaled),
    COLOR_STOPS.length - 2,
  );

  const progress = scaled - index;
  const start = COLOR_STOPS[index];
  const end = COLOR_STOPS[index + 1];

  return [
    Math.round(start[0] + (end[0] - start[0]) * progress),
    Math.round(start[1] + (end[1] - start[1]) * progress),
    Math.round(start[2] + (end[2] - start[2]) * progress),
  ];
}

function createStrands(): Strand[] {
  return Array.from({ length: STRAND_COUNT }, (_, index) => {
    const position = index / (STRAND_COUNT - 1);
    const offset = position * 2 - 1;
    const [red, green, blue] = interpolateColor(position);

    return {
      color: `rgb(${red} ${green} ${blue})`,
      curve: offset * 0.08,
      offset,
      opacity: 0.38 + (1 - Math.abs(offset)) * 0.4,
      width: 0.65 + (1 - Math.abs(offset)) * 0.55,
    };
  });
}

function runAnimation(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
) {
  const reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  const strands = createStrands();

  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;

  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();

    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      1.5,
    );

    width = bounds.width;
    height = bounds.height;

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);

    context.setTransform(
      pixelRatio,
      0,
      0,
      pixelRatio,
      0,
      0,
    );
  }

  function drawFan(
    rotation: number,
    side: number,
    centerX: number,
    centerY: number,
    radius: number,
  ) {
    const sideRotation = rotation + side * Math.PI;

    strands.forEach((strand) => {
      const direction =
        side === 0 ? strand.offset : -strand.offset;

      const angle =
        sideRotation + direction * FAN_SPREAD;

      const controlAngle =
        sideRotation +
        direction * FAN_SPREAD * 0.3 +
        strand.curve;

      const endX =
        centerX + Math.cos(angle) * radius;

      const endY =
        centerY + Math.sin(angle) * radius;

      const controlX =
        centerX +
        Math.cos(controlAngle) * radius * 0.42;

      const controlY =
        centerY +
        Math.sin(controlAngle) * radius * 0.42;

      context.beginPath();
      context.moveTo(centerX, centerY);

      context.quadraticCurveTo(
        controlX,
        controlY,
        endX,
        endY,
      );

      context.globalAlpha = strand.opacity;
      context.strokeStyle = strand.color;
      context.lineWidth = strand.width;
      context.stroke();
    });
  }

  function draw(timestamp: number) {
    context.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    const radius =
      Math.hypot(width, height) * 0.72;

    const rotation = reducedMotionQuery.matches
      ? Math.PI * -0.2
      : (timestamp / ROTATION_DURATION_MS) *
        Math.PI *
        2;

    context.save();
    context.globalCompositeOperation = "lighter";
    context.lineCap = "round";

    drawFan(
      rotation,
      0,
      centerX,
      centerY,
      radius,
    );

    drawFan(
      rotation,
      1,
      centerX,
      centerY,
      radius,
    );

    context.restore();

    if (!reducedMotionQuery.matches) {
      animationFrame =
        window.requestAnimationFrame(draw);
    }
  }

  function restartAnimation() {
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
    }

    resizeCanvas();

    animationFrame =
      window.requestAnimationFrame(draw);
  }

  const resizeObserver = new ResizeObserver(
    restartAnimation,
  );

  resizeObserver.observe(canvas);

  reducedMotionQuery.addEventListener(
    "change",
    restartAnimation,
  );

  restartAnimation();

  return () => {
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
    }

    resizeObserver.disconnect();

    reducedMotionQuery.removeEventListener(
      "change",
      restartAnimation,
    );
  };
}

export function IdentityBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas === null) {
      return;
    }

    const context = canvas.getContext("2d");

    if (context === null) {
      return;
    }

    return runAnimation(canvas, context);
  }, []);

  return (
    <div className={styles.background} aria-hidden="true">
      <canvas className={styles.canvas} ref={canvasRef} />
    </div>
  );
}