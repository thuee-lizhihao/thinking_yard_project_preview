import assert from "node:assert/strict";
import test from "node:test";

import {
  BASELINE_END_COST,
  BASELINE_SCALE,
  BASE_CURVE,
  ROUTE_THREE_BRANCHES,
  ROUTE_THREE_BETA,
  ROUTE_THREE_CONTACT_POINTS,
  ROUTE_THREE_CURVE,
  ROUTE_THREE_ENVELOPE_FRAGMENTS,
  ROUTE_THREE_NEW_AXIS_SCALE,
  ROUTE_THREE_SEED_COSTS,
  ROUTE_TWO_EXPONENT,
  ROUTE_TWO_CURVE,
  STANDARD_EXPONENT,
  newAxisCapability,
  routeThreeCapability,
  routeThreeAllocationAtCost,
} from "../hub/curve-math.ts";

const EPSILON = 1e-9;
const capability = (point) => 1 - point.y;

function capabilityAtCost(curve, cost) {
  if (cost <= curve[0].x) return capability(curve[0]);
  for (let index = 1; index < curve.length; index += 1) {
    if (curve[index].x < cost) continue;
    const from = curve[index - 1];
    const to = curve[index];
    const progress = (cost - from.x) / (to.x - from.x);
    return 1 - (from.y + (to.y - from.y) * progress);
  }
  return capability(curve.at(-1));
}

test("Route 2 is a pointwise transformation of the black frontier", () => {
  assert.equal(ROUTE_TWO_EXPONENT, 5.6);
  assert.equal(ROUTE_TWO_CURVE.length, BASE_CURVE.length);
  for (let index = 0; index < BASE_CURVE.length; index += 1) {
    assert.ok(Math.abs(ROUTE_TWO_CURVE[index].y - BASE_CURVE[index].y) < EPSILON);
    assert.ok(ROUTE_TWO_CURVE[index].x <= BASE_CURVE[index].x + EPSILON);
  }

  assert.deepEqual(ROUTE_TWO_CURVE[0], BASE_CURVE[0]);
  assert.ok(Math.abs(ROUTE_TWO_CURVE.at(-1).x - BASE_CURVE.at(-1).x) < EPSILON);
  assert.ok(Math.abs(ROUTE_TWO_CURVE.at(-1).y - BASE_CURVE.at(-1).y) < EPSILON);
  assert.ok(ROUTE_TWO_CURVE[Math.floor(ROUTE_TWO_CURVE.length / 2)].x
    < BASE_CURVE[Math.floor(BASE_CURVE.length / 2)].x);
});

test("Route 3 is the outer envelope of branches seeded on the black frontier", () => {
  assert.ok(Math.abs(ROUTE_THREE_BETA - 1 / STANDARD_EXPONENT) < EPSILON);
  assert.ok(Math.abs(ROUTE_THREE_NEW_AXIS_SCALE - BASELINE_SCALE) < EPSILON);
  assert.equal(ROUTE_THREE_BRANCHES.length, 16);
  assert.equal(ROUTE_THREE_CONTACT_POINTS.length, ROUTE_THREE_BRANCHES.length);
  assert.equal(ROUTE_THREE_SEED_COSTS.at(-1), BASELINE_END_COST / 2);
  assert.ok(ROUTE_THREE_ENVELOPE_FRAGMENTS.length >= 9);
  assert.ok(Math.abs(ROUTE_THREE_CURVE[0].x) < EPSILON);
  assert.ok(Math.abs(capability(ROUTE_THREE_CURVE[0])) < EPSILON);
  assert.ok(capability(ROUTE_THREE_CURVE.at(-1)) > capability(BASE_CURVE.at(-1)));

  for (const index of [0, 30, 60, 90, ROUTE_THREE_CURVE.length - 1]) {
    const point = ROUTE_THREE_CURVE[index];
    const allocation = routeThreeAllocationAtCost(point.x);
    assert.ok(Math.abs(allocation.baseCost + allocation.newAxisBudget - point.x) < EPSILON);
    assert.ok(Math.abs(
      allocation.capability
      - (allocation.baseCapability + ROUTE_THREE_BETA * Math.log(
        1 + allocation.newAxisBudget / ROUTE_THREE_NEW_AXIS_SCALE
      ))
    ) < EPSILON);
    let sampledMaximum = -Infinity;
    for (let sample = 0; sample <= 8000; sample += 1) {
      const newAxisBudget = point.x * (sample / 8000);
      sampledMaximum = Math.max(
        sampledMaximum,
        routeThreeCapability(point.x, newAxisBudget),
      );
    }
    assert.ok(Math.abs(capability(point) - sampledMaximum) < 1e-6);
  }

  for (let branchIndex = 0; branchIndex < ROUTE_THREE_BRANCHES.length; branchIndex += 1) {
    const branch = ROUTE_THREE_BRANCHES[branchIndex];
    const anchor = branch[0];
    const end = branch.at(-1);
    const contact = ROUTE_THREE_CONTACT_POINTS[branchIndex];
    const anchorCapability = capability(anchor);
    const blackCost = BASELINE_SCALE * (Math.exp(STANDARD_EXPONENT * anchorCapability) - 1);
    assert.ok(Math.abs(anchor.x - blackCost) < EPSILON);
    assert.ok(Math.abs(end.x - BASELINE_END_COST) < EPSILON);
    assert.ok(Math.abs(contact.x - 2 * anchor.x) < EPSILON);
    assert.ok(Math.abs(capability(contact) - capabilityAtCost(ROUTE_THREE_CURVE, contact.x)) < 2e-5);

    for (const point of branch) {
      const newAxisBudget = point.x - anchor.x;
      const expectedCapability = anchorCapability + newAxisCapability(newAxisBudget);
      assert.ok(Math.abs(capability(point) - expectedCapability) < EPSILON);
      assert.ok(capability(point) <= capabilityAtCost(ROUTE_THREE_CURVE, point.x) + 2e-5);
    }
  }

  for (const point of ROUTE_THREE_CONTACT_POINTS) {
    assert.ok(Math.abs(
      capability(point) - capabilityAtCost(ROUTE_THREE_CURVE, point.x)
    ) < 2e-5);
  }

  for (const point of ROUTE_THREE_CURVE) {
    assert.ok(capability(point) + 2e-5 >= capabilityAtCost(BASE_CURVE, point.x));
  }
});

test("the Route 3 envelope crosses the Route 2 frontier once", () => {
  const differences = ROUTE_THREE_CURVE.map((point) => (
    capability(point) - capabilityAtCost(ROUTE_TWO_CURVE, point.x)
  ));
  assert.ok(Math.abs(differences[0]) < EPSILON);
  assert.ok(differences[1] < 0);
  assert.ok(differences.at(-1) > 0);

  let crossings = 0;
  let previousSign = Math.sign(differences[0]);
  for (const difference of differences.slice(1)) {
    const sign = Math.sign(difference);
    if (sign && previousSign && sign !== previousSign) crossings += 1;
    if (sign) previousSign = sign;
  }
  assert.equal(crossings, 1);
});
