export type Point = { x: number; y: number };

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function scaleForEndpoint(maxCapability: number, exponent: number, endCost: number) {
  return endCost / (Math.exp(exponent * maxCapability) - 1);
}

export function makeScalingCurve(
  maxCapability: number,
  exponent: number,
  scale: number,
  samples = 96,
): Point[] {
  return Array.from({ length: samples }, (_, index) => {
    const capability = maxCapability * (index / (samples - 1));
    const cost = scale * (Math.exp(exponent * capability) - 1);
    return { x: cost, y: 1 - capability };
  });
}

// Current scaling: linear capability gains require exponentially more cost.
export const STANDARD_EXPONENT = 2.8;
export const BASELINE_CAPABILITY = 0.70;
export const BASELINE_END_COST = 0.72;
export const BASELINE_SCALE = scaleForEndpoint(
  BASELINE_CAPABILITY,
  STANDARD_EXPONENT,
  BASELINE_END_COST,
);
export const BASE_CURVE = makeScalingCurve(
  BASELINE_CAPABILITY,
  STANDARD_EXPONENT,
  BASELINE_SCALE,
  120,
);

// Route 1 continues the exact current scaling law.
const ROUTE_ONE_FULL = makeScalingCurve(0.80, STANDARD_EXPONENT, BASELINE_SCALE, 120);
export const ROUTE_ONE_EXTENSION = [
  BASE_CURVE.at(-1)!,
  ...ROUTE_ONE_FULL.filter((point) => point.y < 1 - BASELINE_CAPABILITY - 0.002),
];

// Route 2 is a pointwise transformation of the current frontier. Both curves
// share capability samples and exact endpoints; only intermediate costs move.
export const ROUTE_TWO_EXPONENT = 5.6;
export const ROUTE_TWO_SCALE = scaleForEndpoint(
  BASELINE_CAPABILITY,
  ROUTE_TWO_EXPONENT,
  BASELINE_END_COST,
);
export const ROUTE_TWO_CURVE = makeScalingCurve(
  BASELINE_CAPABILITY,
  ROUTE_TWO_EXPONENT,
  ROUTE_TWO_SCALE,
  BASE_CURVE.length,
);

// Route 3 allocates a fixed total budget p across two independent logarithmic
// axes with the same coefficient and cost scale:
// C0(x) = alpha log(1 + x / tau), C1(s) = alpha log(1 + s / tau).
// The displayed blue path is the upper envelope across all allocations s.
export const ROUTE_THREE_BETA = 1 / STANDARD_EXPONENT;
export const ROUTE_THREE_NEW_AXIS_SCALE = BASELINE_SCALE;
export const ROUTE_THREE_END_COST = BASELINE_END_COST;

export function currentCapability(cost: number) {
  return Math.log(1 + cost / BASELINE_SCALE) / STANDARD_EXPONENT;
}

export function newAxisCapability(budget: number) {
  return ROUTE_THREE_BETA * Math.log(1 + budget / ROUTE_THREE_NEW_AXIS_SCALE);
}

export function routeThreeCapability(totalCost: number, newAxisBudget: number) {
  return currentCapability(totalCost - newAxisBudget)
    + newAxisCapability(newAxisBudget);
}

export function routeThreeAllocationAtCost(totalCost: number) {
  const boundedCost = clamp(totalCost, 0, ROUTE_THREE_END_COST);
  // Equal coefficients make the optimum depend only on the two horizontal
  // scales. With equal scales this reduces exactly to s = p / 2.
  const unconstrainedBudget = (
    BASELINE_SCALE + boundedCost - ROUTE_THREE_NEW_AXIS_SCALE
  ) / 2;
  const newAxisBudget = clamp(unconstrainedBudget, 0, boundedCost);
  const baseCost = boundedCost - newAxisBudget;
  const baseCapability = currentCapability(baseCost);

  return {
    totalCost: boundedCost,
    baseCost,
    newAxisBudget,
    baseCapability,
    capability: baseCapability + newAxisCapability(newAxisBudget),
  };
}

export function makeRouteThreeEnvelope(samples = 240): Point[] {
  return Array.from({ length: samples }, (_, index) => {
    const totalCost = ROUTE_THREE_END_COST * (index / (samples - 1));
    const { capability } = routeThreeAllocationAtCost(totalCost);
    return { x: totalCost, y: 1 - capability };
  });
}

export function costToCapability(cost: number) {
  return currentCapability(cost);
}

export function makeRouteThreeBranch(baseCapability: number, samples = 52): Point[] {
  const baseCost = BASELINE_SCALE * (Math.exp(STANDARD_EXPONENT * baseCapability) - 1);
  if (baseCost >= ROUTE_THREE_END_COST) return [];

  return Array.from({ length: samples }, (_, index) => {
    const newAxisBudget = (ROUTE_THREE_END_COST - baseCost) * (index / (samples - 1));
    const totalCost = baseCost + newAxisBudget;
    const capability = baseCapability + newAxisCapability(newAxisBudget);
    return { x: totalCost, y: 1 - capability };
  });
}

export const ROUTE_THREE_CURVE = makeRouteThreeEnvelope();
export const ROUTE_THREE_SPLIT_COST = clamp(
  ROUTE_THREE_NEW_AXIS_SCALE - BASELINE_SCALE,
  0,
  ROUTE_THREE_END_COST,
);

// Seeds are distributed across the black frontier, with extra density in the
// range whose branches are tangent to the visible upper envelope.
export const ROUTE_THREE_SEED_COSTS = [
  0.01,
  0.025,
  0.045,
  0.065,
  0.085,
  0.105,
  0.125,
  0.145,
  0.165,
  0.185,
  0.205,
  0.225,
  0.25,
  0.28,
  0.315,
  0.36,
];

export const ROUTE_THREE_BRANCHES = ROUTE_THREE_SEED_COSTS.map((cost) => (
  makeRouteThreeBranch(costToCapability(cost))
));

export const ROUTE_THREE_CONTACT_POINTS = ROUTE_THREE_SEED_COSTS.flatMap((baseCost) => {
  const newAxisBudget = ROUTE_THREE_BETA * STANDARD_EXPONENT * (BASELINE_SCALE + baseCost)
    - ROUTE_THREE_NEW_AXIS_SCALE;
  const totalCost = baseCost + newAxisBudget;
  if (newAxisBudget < 0 || totalCost > ROUTE_THREE_END_COST + 1e-9) return [];
  return [{
    x: totalCost,
    y: 1 - routeThreeCapability(totalCost, newAxisBudget),
  }];
});

function closestEnvelopeIndex(cost: number) {
  return ROUTE_THREE_CURVE.reduce((closest, point, index) => (
    Math.abs(point.x - cost) < Math.abs(ROUTE_THREE_CURVE[closest].x - cost) ? index : closest
  ), 0);
}

const splitIndex = closestEnvelopeIndex(ROUTE_THREE_SPLIT_COST);
export const ROUTE_THREE_ENVELOPE_FRAGMENTS = [
  ROUTE_THREE_CURVE.slice(0, Math.min(ROUTE_THREE_CURVE.length, splitIndex + 4)),
  ...ROUTE_THREE_CONTACT_POINTS.map((point) => {
    const contactIndex = closestEnvelopeIndex(point.x);
    return ROUTE_THREE_CURVE.slice(
      Math.max(0, contactIndex - 7),
      Math.min(ROUTE_THREE_CURVE.length, contactIndex + 8),
    );
  }),
];
