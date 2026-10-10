import test from "node:test";
import assert from "node:assert/strict";
import { tourSteps, nextPosition, tourDelay } from "./tourPlan.js";
test("tour visits seven feature steps in order and terminates for Q&A", () => {
  let position = { step: 0, action: 0 };
  const visited = [];
  while (position) {
    visited.push(tourSteps[position.step].actions[position.action][0]);
    position = nextPosition(position.step, position.action);
  }
  assert.equal(tourSteps.length, 7);
  assert.equal(visited.length, 13);
  assert.equal(new Set(visited).size, visited.length);
  assert.deepEqual(visited.slice(5, 7), ["tour-flood", "tour-normal"]);
  assert.equal(visited.at(-1), "tour-executive");
});
test("pause cancels pending tour work immediately, including already aborted signals", async () => {
  const controller = new AbortController();
  const pending = tourDelay(60000, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  await assert.rejects(tourDelay(60000, controller.signal), {
    name: "AbortError",
  });
});
