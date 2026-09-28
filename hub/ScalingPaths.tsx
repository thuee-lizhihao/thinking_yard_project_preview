"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BASE_CURVE,
  ROUTE_ONE_EXTENSION,
  ROUTE_THREE_BRANCHES,
  ROUTE_THREE_CONTACT_POINTS,
  ROUTE_THREE_CURVE,
  ROUTE_THREE_ENVELOPE_FRAGMENTS,
  ROUTE_TWO_CURVE,
  clamp,
} from "./curve-math";
import type { Point } from "./curve-math";

import registry from "../config/projects.json";
import projectCategories from "../config/categories.json";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
const projectCards = registry.map(project => ({
  ...project,
  route: project.route as "02" | "03",
  url: `${base}/projects/${project.slug}/`,
  logo: `${base}/${project.logo}`,
}));
const projects = Object.fromEntries(projectCards.map(project => [project.name, project.url]));
const routeMeta = {
  "02": { label: "Route 02", className: "route-two" },
  "03": { label: "Route 03", className: "route-three" },
} as const;
const projectsByRoute = [...projectCards].sort((a, b) => a.route.localeCompare(b.route));

const stages = [
  {
    id: "overview",
    label: "Overview",
    eyebrow: "Three ways to scale intelligence",
    title: "One frontier. Three routes.",
    body: "Purple continues the current state. Green transforms that frontier point by point. Blue is the outer envelope induced by a new scaling axis.",
  },
  {
    id: "route-one",
    label: "Route 01",
    eyebrow: "Continue scaling up.",
    title: "Raise the ceiling.",
    body: "Spend more parameters, data, and compute to continue along the same logarithmic frontier, where each linear capability gain demands an exponentially larger cost.",
  },
  {
    id: "route-two",
    label: "Route 02",
    eyebrow: "Better trade-off.",
    title: "Reach the same ceiling sooner.",
    body: "Transform the current-state frontier point by point. Every intermediate operating point improves, while the green curve remains attached to the same final endpoint.",
  },
  {
    id: "route-three",
    label: "Route 03",
    eyebrow: "New scaling axis.",
    title: "Change the curve.",
    body: "Each blue branch is another instance of the logarithmic scaling form, initialized from a model on the black frontier. Their upper envelope keeps the best instance at every budget.",
  },
];

const chartDescriptions = [
  "Complete comparison: the black current state, a purple continuation, a green pointwise transformation of the black frontier, and the blue outer envelope generated from multiple black-frontier seeds.",
  "Route 1 focus: the purple path continues from the black endpoint along the same exponential-cost scaling law.",
  "Route 2 focus: a green copy deforms away from the black frontier point by point, then rejoins its exact cost-capability endpoint.",
  "Route 3 focus: every blue branch is a full scaling instance initialized from a point on the black frontier. It passes its envelope contact, reaches the same cost boundary as black, then recedes into context.",
];

// The traveler: one soft gleam glides the length of each route in turn, like
// light moving inside a fiber. It is the only ambient motion in the overview
// and the resting curves are never dimmed or redrawn, so the chart stays
// whole at all times. Glow colors are the route colors blended 38% to white.
// The traveler: one soft gleam glides the length of each route in turn, like
// light moving inside a fiber. Speed and gleam width are measured in screen
// pixels, so the traveler reads as one constant pace on every route and at
// every viewport size. Glow colors are the route colors blended 38% to white.
const TRAVELER_SPEED = 250;
const TRAVELER_MIN_WINDOW = 1.8;
const TRAVELER_SIGMA = 110;
const travelerLegs = [
  { points: ROUTE_ONE_EXTENSION, glow: "#ad85b6" },
  { points: ROUTE_TWO_CURVE, glow: "#9cc38d" },
  { points: ROUTE_THREE_CURVE, glow: "#6e99cd" },
] as const;
const TRAVELER_GAPS = [0.35, 0.35, 0.9] as const;

type RouteThreeHover = {
  branch: Point[];
  branchIndex: number;
};

type OverviewRouteId = "route-one" | "route-two" | "route-three";

function easeInOutCubic(progress: number) {
  const t = clamp(progress);
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getPlot(width: number, height: number) {
  return width < 980
    ? { left: 34, right: width - 24, top: 48, bottom: height - 30 }
    : {
        left: Math.max(72, width * 0.055),
        right: Math.min(width * 0.6, width - 520),
        top: 102,
        bottom: height - 72,
      };
}

function distanceToCurve(
  points: Point[],
  pointer: { x: number; y: number },
  plot: ReturnType<typeof getPlot>,
) {
  const plotWidth = plot.right - plot.left;
  const plotHeight = plot.bottom - plot.top;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const fromX = plot.left + from.x * plotWidth;
    const fromY = plot.top + from.y * plotHeight;
    const toX = plot.left + to.x * plotWidth;
    const toY = plot.top + to.y * plotHeight;
    const deltaX = toX - fromX;
    const deltaY = toY - fromY;
    const squaredLength = deltaX * deltaX + deltaY * deltaY;
    const segmentProgress = squaredLength
      ? clamp(((pointer.x - fromX) * deltaX + (pointer.y - fromY) * deltaY) / squaredLength)
      : 0;
    const nearestX = fromX + deltaX * segmentProgress;
    const nearestY = fromY + deltaY * segmentProgress;
    nearestDistance = Math.min(
      nearestDistance,
      Math.hypot(pointer.x - nearestX, pointer.y - nearestY),
    );
  }

  return nearestDistance;
}

function getOverviewRouteAtPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  pointerType = "mouse",
): OverviewRouteId | null {
  const rect = canvas.getBoundingClientRect();
  const plot = getPlot(rect.width, rect.height);
  const pointer = {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
  const routes: Array<{ id: OverviewRouteId; curves: Point[][] }> = [
    { id: "route-one", curves: [BASE_CURVE, ROUTE_ONE_EXTENSION] },
    { id: "route-two", curves: [ROUTE_TWO_CURVE] },
    { id: "route-three", curves: [ROUTE_THREE_CURVE] },
  ];
  let nearestRoute: OverviewRouteId | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  routes.forEach(({ id, curves }) => {
    const distance = Math.min(...curves.map((curve) => distanceToCurve(curve, pointer, plot)));
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestRoute = id;
    }
  });

  const hitRadius = pointerType === "touch" ? 32 : rect.width < 980 ? 26 : 20;
  return nearestDistance <= hitRadius ? nearestRoute : null;
}

function scrollToStoryStage(id: OverviewRouteId) {
  const stage = document.getElementById(id);
  if (!stage) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  stage.scrollIntoView({
    behavior: reducedMotion ? "auto" : "smooth",
    block: "start",
  });
  if (window.location.hash !== `#${id}`) {
    window.history.pushState(null, "", `#${id}`);
  }
}

function ProjectLink({ name }: { name: keyof typeof projects }) {
  return (
    <a href={projects[name]} className="project-pill">
      <strong>{name}</strong>
      <span aria-hidden="true">↗</span>
    </a>
  );
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stepRefs = useRef<Array<HTMLElement | null>>([]);
  const frameRef = useRef(0);
  const lineAnimationRef = useRef(0);
  const stageRef = useRef(-1);
  const revealRef = useRef(stages.map(() => 1));
  const routeThreeHoverRef = useRef<RouteThreeHover | null>(null);
  const ambientTimeRef = useRef<number | null>(null);
  const ambientFrameRef = useRef(0);
  const ambientVisibleSinceRef = useRef(0);
  const backToTopCleanupRef = useRef<(() => void) | null>(null);
  const [activeStage, setActiveStage] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const returnToTop = useCallback(() => {
    backToTopCleanupRef.current?.();

    const root = document.documentElement;
    const previousScrollSnapType = root.style.scrollSnapType;
    const previousScrollBehavior = root.style.scrollBehavior;
    let framesAtTop = 8;
    let frame = 0;
    let active = true;

    const cleanup = () => {
      if (!active) return;
      active = false;
      if (frame) cancelAnimationFrame(frame);
      root.style.scrollSnapType = previousScrollSnapType;
      root.style.scrollBehavior = previousScrollBehavior;
      backToTopCleanupRef.current = null;
    };

    backToTopCleanupRef.current = cleanup;
    root.style.scrollSnapType = "none";
    root.style.scrollBehavior = "auto";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (window.location.hash) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }

    // Hold the exact endpoint for a few frames so any in-flight anchor scroll
    // is fully cancelled before mandatory snapping is restored.
    const holdAtTop = () => {
      if (!active) return;
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      framesAtTop -= 1;
      if (framesAtTop > 0) {
        frame = requestAnimationFrame(holdAtTop);
      } else {
        cleanup();
      }
    };
    frame = requestAnimationFrame(holdAtTop);
  }, []);

  useEffect(() => () => {
    backToTopCleanupRef.current?.();
  }, []);

  const drawChart = useCallback((focus: number[], reveal: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(rect.width * ratio) || canvas.height !== Math.round(rect.height * ratio)) {
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const compact = rect.width < 980;
    const plot = getPlot(rect.width, rect.height);
    const width = plot.right - plot.left;
    const height = plot.bottom - plot.top;
    const map = (point: Point) => ({
      x: plot.left + point.x * width,
      y: plot.top + point.y * height,
    });

    const axisColor = "rgba(29, 29, 31, .5)";
    ctx.strokeStyle = axisColor;
    ctx.fillStyle = axisColor;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(plot.left, plot.bottom);
    ctx.lineTo(plot.right + 10, plot.bottom);
    ctx.moveTo(plot.left, plot.bottom);
    ctx.lineTo(plot.left, plot.top - 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(plot.right + 10, plot.bottom);
    ctx.lineTo(plot.right + 1, plot.bottom - 4);
    ctx.lineTo(plot.right + 1, plot.bottom + 4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(plot.left, plot.top - 10);
    ctx.lineTo(plot.left - 4, plot.top - 1);
    ctx.lineTo(plot.left + 4, plot.top - 1);
    ctx.closePath();
    ctx.fill();

    const path = (points: Point[], color: string, lineWidth: number, alpha = 1, progress = 1) => {
      if (points.length < 2) return;
      const visibleProgress = clamp(progress);
      const mappedPoints = points.map(map);
      const segmentLengths = mappedPoints.slice(1).map((point, index) => (
        Math.hypot(point.x - mappedPoints[index].x, point.y - mappedPoints[index].y)
      ));
      const totalLength = segmentLengths.reduce((total, length) => total + length, 0);
      const visibleLength = totalLength * visibleProgress;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([]);
      ctx.beginPath();
      const first = mappedPoints[0];
      ctx.moveTo(first.x, first.y);
      let traversedLength = 0;
      for (let index = 1; index < mappedPoints.length; index += 1) {
        const segmentLength = segmentLengths[index - 1];
        const point = mappedPoints[index];
        if (traversedLength + segmentLength <= visibleLength) {
          ctx.lineTo(point.x, point.y);
          traversedLength += segmentLength;
          continue;
        }

        const previous = mappedPoints[index - 1];
        const remainingLength = Math.max(0, visibleLength - traversedLength);
        const segmentProgress = segmentLength ? remainingLength / segmentLength : 0;
        ctx.lineTo(
          previous.x + (point.x - previous.x) * segmentProgress,
          previous.y + (point.y - previous.y) * segmentProgress,
        );
        break;
      }
      ctx.stroke();
      ctx.restore();
    };

    const overview = focus[0] ?? 0;
    const routeOneFocus = focus[1] ?? 0;
    const routeTwoFocus = focus[2] ?? 0;
    const routeThreeFocus = focus[3] ?? 0;
    const curveAlpha = (weight: number) => clamp(0.12 + 0.88 * Math.max(overview, weight));
    const routeOneAlpha = curveAlpha(routeOneFocus);
    const routeTwoAlpha = curveAlpha(routeTwoFocus);
    const routeThreeAlpha = curveAlpha(routeThreeFocus);
    const overviewProgress = reveal[0] ?? 1;
    const routeOneProgress = overview > 0.5 ? overviewProgress : routeOneFocus > 0.5 ? reveal[1] ?? 1 : 1;
    const routeTwoProgress = overview > 0.5 ? overviewProgress : routeTwoFocus > 0.5 ? reveal[2] ?? 1 : 1;
    const routeThreeProgress = overview > 0.5 ? overviewProgress : routeThreeFocus > 0.5 ? reveal[3] ?? 1 : 1;
    const baselineIsDrawing = overview > 0.5;
    const routeOneIsDrawing = overview > 0.5 || routeOneFocus > 0.5;
    const routeTwoIsDrawing = overview > 0.5 || routeTwoFocus > 0.5;
    const routeThreeIsDrawing = overview > 0.5 || routeThreeFocus > 0.5;
    const currentFrontierProgress = baselineIsDrawing ? clamp(routeOneProgress / 0.62) : 1;
    const routeOneExtensionProgress = overview > 0.5
      ? clamp((routeOneProgress - 0.62) / 0.38)
      : routeOneFocus > 0.5 ? routeOneProgress : 1;
    const routeThreeEnvelopePhase = routeThreeFocus > 0.5
      ? clamp((routeThreeProgress - 0.68) / 0.32)
      : routeThreeProgress;
    const routeThreeEnvelopeProgress = routeThreeFocus > 0.5
      ? clamp((routeThreeEnvelopePhase - 0.68) / 0.32)
      : routeThreeProgress;
    const selectedBranch = routeThreeFocus > 0.5 && routeThreeProgress > 0.12
      ? routeThreeHoverRef.current
      : null;
    const inspectionFade = selectedBranch ? 0.14 : 1;
    const baselineAlpha = 1;
    const baseWidth = compact ? 2.5 : 3.2;
    const focusedWidth = (weight: number) => baseWidth + 0.85 * Math.max(overview * 0.2, weight);
    const routeThreeWidth = (compact ? 2.05 : 2.55) + 0.25 * Math.max(overview, routeThreeFocus);
    const terminalReveal = (progress: number) => clamp((progress - 0.78) / 0.22);
    const labelReveal = (progress: number, start = 0.52) => clamp((progress - start) / (1 - start));
    const animatedAlpha = (alpha: number, progress: number, isDrawing: boolean, start?: number) => (
      isDrawing ? alpha * labelReveal(progress, start) : alpha
    );
    const animatedPath = (
      points: Point[],
      color: string,
      lineWidth: number,
      alpha: number,
      progress: number,
      isDrawing: boolean,
    ) => {
      if (!isDrawing) {
        path(points, color, lineWidth, alpha);
        return;
      }
      path(points, color, baseWidth, 0.1);
      path(points, color, lineWidth, alpha, progress);
    };
    const interpolateCurve = (from: Point[], to: Point[], progress: number) => (
      from.map((point, index) => ({
        x: point.x + (to[index].x - point.x) * progress,
        y: point.y + (to[index].y - point.y) * progress,
      }))
    );
    const routeTwoRenderedCurve = routeTwoIsDrawing
      ? interpolateCurve(BASE_CURVE, ROUTE_TWO_CURVE, routeTwoProgress)
      : ROUTE_TWO_CURVE;

    // Every path keeps its geometry. Entering a chapter reveals its route from
    // start to finish while a faint full-path trace preserves the comparison.
    animatedPath(
      BASE_CURVE,
      "#1d1d1f",
      focusedWidth(routeOneFocus),
      baselineAlpha * inspectionFade,
      currentFrontierProgress,
      baselineIsDrawing,
    );
    animatedPath(
      ROUTE_ONE_EXTENSION,
      "#7b3a8a",
      focusedWidth(routeOneFocus),
      routeOneAlpha * inspectionFade,
      routeOneExtensionProgress,
      routeOneIsDrawing,
    );
    if (routeTwoIsDrawing) {
      // Route 2 is a deformation of the current frontier, not a new stroke
      // growing from the origin. The faint green trace marks its destination.
      path(ROUTE_TWO_CURVE, "#5f9f47", baseWidth, 0.08 * inspectionFade);
      path(
        routeTwoRenderedCurve,
        "#5f9f47",
        focusedWidth(routeTwoFocus),
        routeTwoAlpha * inspectionFade * (0.25 + 0.75 * routeTwoProgress),
      );
    } else {
      path(ROUTE_TWO_CURVE, "#5f9f47", focusedWidth(routeTwoFocus), routeTwoAlpha * inspectionFade);
    }

    if (routeThreeFocus > 0.5) {
      // Each branch is a full scaling instance: it enters with the envelope's
      // weight, then settles into a thin contextual trace after completing.
      const settledBranchWidth = compact ? 0.8 : 1.05;
      const settledBranchAlpha = 0.14 * (1 - 0.62 * routeThreeEnvelopePhase)
        * (selectedBranch ? 0.18 : 1);
      ROUTE_THREE_BRANCHES.forEach((branch, index) => {
        if (branch.length < 2) return;
        // Every instance uses Route 1's cubic ease-in-out stroke motion. A
        // gentle quadratic cadence keeps every late branch distinguishable:
        // start gaps and durations shrink continuously, never collapse at once.
        const cadenceProgress = index / (ROUTE_THREE_BRANCHES.length - 1);
        const delay = 0.62 * (
          1.75 * cadenceProgress - 0.75 * cadenceProgress * cadenceProgress
        );
        const branchDuration = 0.06 - 0.03 * Math.pow(cadenceProgress, 0.85);
        const localProgress = routeThreeProgress - delay;
        const branchProgress = easeInOutCubic(localProgress / branchDuration);
        const settleProgress = clamp((localProgress - branchDuration) / 0.012);
        const branchWidth = routeThreeWidth
          + (settledBranchWidth - routeThreeWidth) * settleProgress;
        const branchAlpha = routeThreeAlpha
          + (settledBranchAlpha - routeThreeAlpha) * settleProgress;
        path(branch, "#155bae", branchWidth, branchAlpha, branchProgress);

        const anchor = map(branch[0]);
        ctx.save();
        const settledAnchorAlpha = 0.42 * (1 - 0.62 * routeThreeEnvelopePhase)
          * (selectedBranch ? 0.18 : 1);
        ctx.globalAlpha = branchProgress
          * (0.75 + (settledAnchorAlpha - 0.75) * settleProgress);
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#155bae";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, compact ? 2.5 : 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // After a short pause, local tangency neighborhoods appear in sequence.
      // Only after all of them are visible do they merge into one frontier.
      ROUTE_THREE_ENVELOPE_FRAGMENTS.forEach((fragment, index) => {
        const delay = index * 0.052;
        const fragmentProgress = clamp((routeThreeEnvelopePhase - delay) / 0.2);
        const fragmentAlpha = routeThreeAlpha * 0.72 * (1 - 0.7 * routeThreeEnvelopeProgress)
          * inspectionFade;
        path(
          fragment,
          "#155bae",
          routeThreeWidth,
          fragmentAlpha,
          fragmentProgress,
        );
      });

      ROUTE_THREE_CONTACT_POINTS.forEach((point, index) => {
        const delay = index * 0.052;
        const contactAlpha = clamp((routeThreeEnvelopePhase - delay) / 0.16);
        const contact = map(point);
        ctx.save();
        ctx.globalAlpha = contactAlpha * 0.62 * inspectionFade;
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#155bae";
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(contact.x, contact.y, compact ? 2.2 : 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      path(
        ROUTE_THREE_CURVE,
        "#155bae",
        routeThreeWidth,
        routeThreeAlpha * routeThreeEnvelopeProgress * inspectionFade,
      );

      if (selectedBranch) {
        path(selectedBranch.branch, "#155bae", routeThreeWidth, 0.98);
        const anchor = map(selectedBranch.branch[0]);
        const end = map(selectedBranch.branch.at(-1)!);
        const optimal = map(ROUTE_THREE_CONTACT_POINTS[selectedBranch.branchIndex]);
        const optimalIsEnd = Math.hypot(optimal.x - end.x, optimal.y - end.y) < 0.5;
        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#155bae";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, compact ? 3.2 : 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(optimal.x, optimal.y, compact ? 4.1 : 4.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#155bae";
        ctx.beginPath();
        ctx.arc(end.x, end.y, compact ? 3.4 : 4.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `650 ${compact ? 8 : 9}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.textBaseline = "middle";
        ctx.fillText("START", anchor.x + 9, anchor.y + 11);
        if (optimalIsEnd) {
          ctx.fillText("OPTIMAL / END", end.x + 9, end.y - 9);
        } else {
          ctx.fillText("OPTIMAL", optimal.x + 9, optimal.y - 9);
          ctx.fillText("END", end.x + 9, end.y - 9);
        }
        ctx.restore();
      }
    } else {
      animatedPath(
        ROUTE_THREE_CURVE,
        "#155bae",
        routeThreeWidth,
        routeThreeAlpha,
        routeThreeEnvelopeProgress,
        routeThreeIsDrawing,
      );
    }

    const baseEnd = map(BASE_CURVE.at(-1)!);
    const routeOneEnd = map(ROUTE_ONE_EXTENSION.at(-1)!);
    const routeThreeEnd = map(ROUTE_THREE_CURVE.at(-1)!);

    if (routeThreeFocus > 0.2 && routeThreeEnvelopeProgress > 0.65) {
      ctx.save();
      ctx.globalAlpha = routeThreeFocus * 0.65 * terminalReveal(routeThreeEnvelopeProgress) * inspectionFade;
      ctx.lineWidth = 1.3;
      ctx.setLineDash([4, 7]);
      ctx.strokeStyle = "#155bae";
      ctx.beginPath();
      ctx.moveTo(routeThreeEnd.x, routeThreeEnd.y);
      ctx.lineTo(routeThreeEnd.x, baseEnd.y);
      ctx.stroke();
      ctx.restore();
    }

    const dot = (point: { x: number; y: number }, color: string, alpha: number, radius = 5) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const routeOneTerminalAlpha = routeOneIsDrawing
      ? routeOneAlpha * terminalReveal(routeOneExtensionProgress) * inspectionFade
      : routeOneAlpha * inspectionFade;
    const routeThreeTerminalAlpha = routeThreeIsDrawing
      ? routeThreeAlpha * terminalReveal(routeThreeEnvelopeProgress) * inspectionFade
      : routeThreeAlpha * inspectionFade;
    const routeTwoTerminalAlpha = routeTwoIsDrawing
      ? Math.max(overview, routeTwoFocus) * 0.95 * terminalReveal(routeTwoProgress) * inspectionFade
      : 0;
    const baselineTerminalAlpha = baselineIsDrawing
      ? baselineAlpha * terminalReveal(currentFrontierProgress) * inspectionFade
      : baselineAlpha * inspectionFade;

    dot(routeOneEnd, "#7b3a8a", routeOneTerminalAlpha);
    dot(routeThreeEnd, "#155bae", routeThreeTerminalAlpha);

    // Route 2 terminates at the exact same coordinate as the black frontier.
    ctx.save();
    ctx.globalAlpha = routeTwoTerminalAlpha;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#5f9f47";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(baseEnd.x, baseEnd.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    dot(baseEnd, "#1d1d1f", baselineTerminalAlpha, 4);

    // The traveler: a single soft gleam glides along each route in turn.
    // Amplitude follows a sine envelope and position eases in and out, so the
    // gleam materializes, travels, and dissolves without any hard edge. Speed
    // and gleam width are pixel-space quantities, keeping the pace identical
    // on every route. The gleam is pure addition — resting curves are never
    // dimmed or redrawn.
    const ambientTime = ambientTimeRef.current;
    const ambientClock = ambientTime != null && stageRef.current === 0 && ambientVisibleSinceRef.current
      ? ambientTime - ambientVisibleSinceRef.current
      : null;
    if (ambientClock != null) {
      const legs = travelerLegs.map((leg) => {
        const pixels = leg.points.map(map);
        const positions = [0];
        let length = 0;
        for (let index = 0; index < pixels.length - 1; index += 1) {
          length += Math.hypot(pixels[index + 1].x - pixels[index].x, pixels[index + 1].y - pixels[index].y);
          positions.push(length);
        }
        return { leg, pixels, positions, length, window: Math.max(length / TRAVELER_SPEED, TRAVELER_MIN_WINDOW) };
      });
      const cycle = legs.reduce((total, { window }, index) => total + window + TRAVELER_GAPS[index], 0);
      const cycleTime = ambientClock % cycle;
      let legStart = 0;
      legs.forEach(({ leg, pixels, positions, length, window }, index) => {
        const local = cycleTime - legStart;
        legStart += window + TRAVELER_GAPS[index];
        if (local < 0 || local >= window) return;
        const phase = local / window;
        const amplitude = Math.sin(Math.PI * phase);
        if (amplitude < 0.02) return;
        const center = easeInOutCubic(phase) * length;
        for (let segmentIndex = 0; segmentIndex < positions.length - 1; segmentIndex += 1) {
          const midpoint = (positions[segmentIndex] + positions[segmentIndex + 1]) / 2;
          const envelope = Math.exp(-0.5 * ((midpoint - center) / TRAVELER_SIGMA) ** 2);
          if (envelope < 0.02) continue;
          ctx.save();
          ctx.globalAlpha = amplitude * envelope;
          ctx.strokeStyle = leg.glow;
          ctx.lineWidth = baseWidth + 2.8 * amplitude * envelope;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(pixels[segmentIndex].x, pixels[segmentIndex].y);
          ctx.lineTo(pixels[segmentIndex + 1].x, pixels[segmentIndex + 1].y);
          ctx.stroke();
          ctx.restore();
        }
      });
    }

    const fontFamily = getComputedStyle(document.body).fontFamily;
    ctx.font = `600 ${compact ? 10 : 11}px ${fontFamily}`;
    ctx.textBaseline = "middle";
    const label = (text: string, point: Point, offsetX: number, offsetY: number, color: string, alpha: number) => {
      const position = map(point);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(position.x, position.y);
      ctx.lineTo(position.x + offsetX * 0.72, position.y + offsetY * 0.72);
      ctx.stroke();
      const textWidth = ctx.measureText(text).width;
      ctx.fillStyle = "rgba(255, 255, 255, .92)";
      ctx.fillRect(position.x + offsetX - 4, position.y + offsetY - 8, textWidth + 8, 16);
      ctx.fillStyle = color;
      ctx.fillText(text, position.x + offsetX, position.y + offsetY);
      ctx.restore();
    };

    label(
      "CURRENT STATE",
      BASE_CURVE[91],
      16,
      22,
      "#1d1d1f",
      animatedAlpha(baselineAlpha * inspectionFade, currentFrontierProgress, baselineIsDrawing, 0.68),
    );
    label("ROUTE 01", ROUTE_ONE_EXTENSION.at(-1)!, -62, -18, "#7b3a8a", routeOneTerminalAlpha);
    label(
      "ROUTE 02",
      routeTwoRenderedCurve[70],
      -58,
      -17,
      "#467d32",
      animatedAlpha(routeTwoAlpha * inspectionFade, routeTwoProgress, routeTwoIsDrawing, 0.48),
    );
    label(
      "ROUTE 03",
      ROUTE_THREE_CURVE.at(-1)!,
      compact ? -55 : 14,
      compact ? -16 : -2,
      "#155bae",
      routeThreeTerminalAlpha,
    );

    if (routeTwoFocus > 0.45 && routeTwoProgress > 0.78) {
      ctx.save();
      ctx.globalAlpha = routeTwoFocus * terminalReveal(routeTwoProgress);
      ctx.fillStyle = "#467d32";
      ctx.textAlign = "right";
      ctx.fillText("SAME ENDPOINT", baseEnd.x - 14, baseEnd.y - 14);
      ctx.restore();
    }
  }, []);

  useEffect(() => {
    stageRef.current = -1;
    lineAnimationRef.current = 0;

    const animateStage = (nextStage: number, nextFocus: number[]) => {
      if (lineAnimationRef.current) cancelAnimationFrame(lineAnimationRef.current);

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const nextReveal = stages.map(() => 1);
      if (reducedMotion) {
        revealRef.current = nextReveal;
        drawChart(nextFocus, nextReveal);
        lineAnimationRef.current = 0;
        return;
      }

      nextReveal[nextStage] = 0;
      revealRef.current = [...nextReveal];
      drawChart(nextFocus, nextReveal);
      const startedAt = performance.now();
      const duration = nextStage === 3 ? 5000 : 1050;

      const tick = (now: number) => {
        const elapsed = clamp((now - startedAt) / duration);
        const eased = easeInOutCubic(elapsed);
        nextReveal[nextStage] = nextStage === 3 ? elapsed : eased;
        revealRef.current = [...nextReveal];
        drawChart(nextFocus, nextReveal);

        if (elapsed < 1) {
          lineAnimationRef.current = requestAnimationFrame(tick);
        } else {
          lineAnimationRef.current = 0;
        }
      };

      lineAnimationRef.current = requestAnimationFrame(tick);
    };

    const stopAmbient = () => {
      if (ambientFrameRef.current) cancelAnimationFrame(ambientFrameRef.current);
      ambientFrameRef.current = 0;
      ambientVisibleSinceRef.current = 0;
      if (ambientTimeRef.current != null) {
        ambientTimeRef.current = null;
        if (!lineAnimationRef.current && stageRef.current >= 0) {
          drawChart(stages.map((_, index) => index === stageRef.current ? 1 : 0), revealRef.current);
        }
      }
    };

    const startAmbient = () => {
      if (ambientFrameRef.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const startedAt = performance.now();
      ambientTimeRef.current = 0;

      const tick = (now: number) => {
        ambientTimeRef.current = (now - startedAt) / 1000;
        // While the overview reveal is still drawing, that loop owns the
        // canvas. The ambient cycle starts once the reveal completes.
        if (!lineAnimationRef.current && (revealRef.current[0] ?? 0) >= 1) {
          if (!ambientVisibleSinceRef.current) {
            ambientVisibleSinceRef.current = ambientTimeRef.current;
          }
          drawChart(stages.map((_, index) => index === 0 ? 1 : 0), revealRef.current);
        }
        ambientFrameRef.current = requestAnimationFrame(tick);
      };

      ambientFrameRef.current = requestAnimationFrame(tick);
    };

    const update = (forceDraw = false) => {
      frameRef.current = 0;
      setShowBackToTop(window.scrollY > 500);
      const centers = stepRefs.current.map((element) => {
        if (!element) return 0;
        const rect = element.getBoundingClientRect();
        return rect.top + window.scrollY + rect.height / 2;
      });
      if (!centers.every(Boolean)) return;

      // On compact layouts the chart occupies the sticky upper half. Read the
      // active chapter from the center of the unobscured text region below it.
      const readingLine = window.scrollY + window.innerHeight * (window.innerWidth < 980 ? 0.72 : 0.5);
      const nextStage = centers.reduce((closestIndex, center, index) => (
        Math.abs(center - readingLine) < Math.abs(centers[closestIndex] - readingLine) ? index : closestIndex
      ), 0);
      const nextFocus = stages.map((_, index) => index === nextStage ? 1 : 0);

      if (stageRef.current !== nextStage) {
        canvasRef.current?.style.removeProperty("cursor");
        if (nextStage !== 3) {
          routeThreeHoverRef.current = null;
        }
        stageRef.current = nextStage;
        setActiveStage((current) => current === nextStage ? current : nextStage);
        animateStage(nextStage, nextFocus);
        if (nextStage === 0) {
          startAmbient();
        } else {
          stopAmbient();
        }
      } else if (forceDraw && !lineAnimationRef.current) {
        drawChart(nextFocus, revealRef.current);
      }
    };

    const onScroll = () => {
      if (frameRef.current) return;
      frameRef.current = requestAnimationFrame(() => update());
    };
    const onResize = () => update(true);

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (lineAnimationRef.current) cancelAnimationFrame(lineAnimationRef.current);
      stopAmbient();
      frameRef.current = 0;
      lineAnimationRef.current = 0;
    };
  }, [drawChart]);

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!targets.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((element) => element.classList.add("is-revealed"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.2 });

    targets.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let pointerDown: { pointerId: number; x: number; y: number } | null = null;

    const redrawRouteThree = () => {
      if (stageRef.current !== 3 || lineAnimationRef.current) return;
      drawChart(stages.map((_, index) => index === 3 ? 1 : 0), revealRef.current);
    };

    const clearBranchSelection = () => {
      if (!routeThreeHoverRef.current) return;
      routeThreeHoverRef.current = null;
      redrawRouteThree();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (stageRef.current === 0) {
        clearBranchSelection();
        if (event.pointerType === "touch") {
          canvas.style.removeProperty("cursor");
        } else {
          const route = getOverviewRouteAtPoint(canvas, event.clientX, event.clientY, event.pointerType);
          canvas.style.cursor = route ? "pointer" : "default";
        }
        return;
      }

      canvas.style.removeProperty("cursor");
      if (
        event.pointerType === "touch"
        || stageRef.current !== 3
        || (revealRef.current[3] ?? 0) < 0.12
      ) {
        clearBranchSelection();
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const plot = getPlot(rect.width, rect.height);
      const pointer = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const plotWidth = plot.right - plot.left;
      const plotHeight = plot.bottom - plot.top;

      let nearestBranchIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      ROUTE_THREE_BRANCHES.forEach((branch, branchIndex) => {
        for (let segmentIndex = 0; segmentIndex < branch.length - 1; segmentIndex += 1) {
          const from = branch[segmentIndex];
          const to = branch[segmentIndex + 1];
          const fromX = plot.left + from.x * plotWidth;
          const fromY = plot.top + from.y * plotHeight;
          const toX = plot.left + to.x * plotWidth;
          const toY = plot.top + to.y * plotHeight;
          const deltaX = toX - fromX;
          const deltaY = toY - fromY;
          const squaredLength = deltaX * deltaX + deltaY * deltaY;
          const segmentProgress = squaredLength
            ? clamp(((pointer.x - fromX) * deltaX + (pointer.y - fromY) * deltaY) / squaredLength)
            : 0;
          const nearestX = fromX + deltaX * segmentProgress;
          const nearestY = fromY + deltaY * segmentProgress;
          const distance = Math.hypot(pointer.x - nearestX, pointer.y - nearestY);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestBranchIndex = branchIndex;
          }
        }
      });

      if (nearestDistance > (rect.width < 980 ? 26 : 22)) {
        clearBranchSelection();
        return;
      }

      const branch = ROUTE_THREE_BRANCHES[nearestBranchIndex];
      if (routeThreeHoverRef.current?.branchIndex === nearestBranchIndex) return;

      routeThreeHoverRef.current = {
        branch,
        branchIndex: nearestBranchIndex,
      };
      redrawRouteThree();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (stageRef.current !== 0) return;
      pointerDown = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!pointerDown || pointerDown.pointerId !== event.pointerId || stageRef.current !== 0) {
        pointerDown = null;
        return;
      }

      const travel = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
      pointerDown = null;
      const tapTolerance = event.pointerType === "touch" ? 24 : 10;
      if (travel > tapTolerance) return;

      const route = getOverviewRouteAtPoint(canvas, event.clientX, event.clientY, event.pointerType);
      if (route) scrollToStoryStage(route);
    };

    const clearPointerDown = () => {
      pointerDown = null;
    };

    const onPointerLeave = () => {
      clearPointerDown();
      canvas.style.removeProperty("cursor");
      clearBranchSelection();
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", clearPointerDown);
    canvas.addEventListener("pointerleave", onPointerLeave);
    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", clearPointerDown);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.style.removeProperty("cursor");
    };
  }, [drawChart]);

  return (
    <main>
      <a className="skip-link" href="#scale-story">Skip to scaling paths</a>



      <section className="scale-story" id="scale-story">
        <figure
          className={`chart-sticky ${activeStage === 3 ? "is-route-three" : ""}`}
          role="group"
          aria-labelledby="chart-title chart-description"
        >
          <h2 className="sr-only" id="chart-title">Three scaling routes</h2>
          <canvas ref={canvasRef} aria-hidden="true" />
          <span className="axis-label axis-label-y">capability</span>
          <span className="axis-label axis-label-x">cost</span>
          <figcaption className="sr-only" id="chart-description">{chartDescriptions[activeStage]}</figcaption>
        </figure>

        <div className="story-steps">
          {stages.map((stage, index) => (
            <article
              className={`story-step ${activeStage === index ? "is-active" : ""}`}
              id={stage.id}
              key={stage.id}
              ref={(element) => { stepRefs.current[index] = element; }}
              aria-current={activeStage === index ? "step" : undefined}
            >
              <div className={`story-copy story-copy-${index}`}>
                <div className="story-meta">
                  <div className="story-stage-label">{stage.label}</div>
                  <span className="chapter-count" aria-hidden="true">{String(index + 1).padStart(2, "0")} / 04</span>
                </div>
                <p className="story-eyebrow">{stage.eyebrow}</p>
                {index === 0 ? <h1>{stage.title}</h1> : <h2>{stage.title}</h2>}
                <p className="story-body">{stage.body}</p>

                {index === 0 && (
                  <div className="overview-legend" aria-label="Route colors">
                    <a href="#route-one"><i className="route-one-dot" />01 Continue</a>
                    <a href="#route-two"><i className="route-two-dot" />02 Improve</a>
                    <a href="#route-three"><i className="route-three-dot" />03 Change</a>
                  </div>
                )}
                {index === 1 && (
                  <div className="variable-row" aria-label="Traditional scaling variables">
                    <span>Parameters</span><i>+</i><span>Data</span><i>+</i><span>Compute</span>
                  </div>
                )}
                {index === 2 && (
                  <div className="project-pills" aria-label="Route 2 projects">
                    <ProjectLink name="R2R" />
                    <ProjectLink name="MoA" />
                    <ProjectLink name="FrameFusion" />
                  </div>
                )}
                {index === 3 && (
                  <>
                    <div className="formula-row" aria-label="Route 3 budget-allocation equation">
                      <span>C(p,s) = C₀(p−s) + C₁(s)</span>
                      <span className="formula-definition">C₀(x) = α log(1+x/τ) · C₁(s) = α log(1+s/τ)</span>
                      <small>shared α and τ · max over 0 ≤ s ≤ p</small>
                    </div>
                    <div className="project-pills" aria-label="Route 3 projects">
                      <ProjectLink name="TaH" />
                      <ProjectLink name="C2C" />
                    </div>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="projects-section" id="projects" aria-labelledby="projects-title">
        <div className="projects-inner">
          <p className="projects-eyebrow" data-reveal>Research</p>
          <h2 className="projects-title" id="projects-title" data-reveal>Project highlights</h2>
          <p className="projects-lead" data-reveal>
            Each project turns one of the scaling routes above into a working system, with a public page for the paper, code, and demos.
          </p>
          <div className="projects-grid">
            {projectsByRoute.map((project) => {
              const route = routeMeta[project.route];
              const category = projectCategories.find((item) => item.id === project.category);
              return (
                <a
                  className="project-card"
                  data-reveal
                  href={project.url}
                  key={project.name}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="project-card-top">
                    <span className="project-card-icon">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={project.logo} alt="" />
                    </span>
                    <span className={`project-card-route ${route.className}`}>
                      {route.label} · {category?.shortLabel}
                    </span>
                  </span>
                  <strong className="project-card-name">{project.name}</strong>
                  <span className="project-card-desc">{project.description}</span>
                  <span className="project-card-cta">
                    Project page <span aria-hidden="true">↗</span>
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <button
        type="button"
        className={`back-to-top ${showBackToTop ? "is-visible" : ""}`}
        aria-label="Back to top"
        aria-hidden={!showBackToTop}
        tabIndex={showBackToTop ? 0 : -1}
        onClick={returnToTop}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path d="m6.5 14.5 5.5-5 5.5 5" />
        </svg>
      </button>

      <footer>
        <div className="footer-primary">
          <strong>NICS-EFC Team</strong>
          <span>Research projects. Three scaling routes. One frontier.</span>
        </div>
      </footer>
    </main>
  );
}
