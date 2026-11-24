import test from "node:test";
import assert from "node:assert/strict";
import {
  createWaterPillState,
  resolvePillKey,
  retargetWaterPill,
  stepWaterPill,
} from "../src/components/ui/waterline-math";

test("resolvePillKey prioritizes explicit ids, mode-seg, modal-tabs, and aria-label", () => {
  assert.equal(resolvePillKey("my-seg", "custom", "Ignored", "seg", 0), "wl:custom");
  assert.equal(resolvePillKey("my-seg", null, "Ignored", "seg", 0), "id:my-seg");
  assert.equal(resolvePillKey(null, null, "Fon rejimi", "mode-seg", 0), "mode-seg");
  assert.equal(resolvePillKey(null, null, "Holat", "m-tabs seg", 1), "modal-tabs");
  assert.equal(resolvePillKey(null, null, "Tarmoq", "seg", 2), "aria:Tarmoq");
  assert.equal(resolvePillKey(null, null, null, "seg", 3), "seg:3");
});

test("retargetWaterPill snaps first initialization and starts spring transition on jump", () => {
  const s = createWaterPillState(10);
  retargetWaterPill(s, 50, 26, 20, 14, 240, 36, 100);
  assert.equal(s.ready, true);
  assert.equal(s.a.x, 50);
  assert.equal(s.b.x, 50);
  assert.equal(s.moving, false);

  retargetWaterPill(s, 180, 26, 22, 14, 240, 36, 120);
  assert.equal(s.moving, true);
  assert.equal(s.lagFrom, 190);
  assert.equal(s.t.x, 180);
});

test("stepWaterPill spawns satellite droplets during long jump and emits settle ripple", () => {
  const s = createWaterPillState(10);
  retargetWaterPill(s, 40, 26, 14, 14, 300, 36, 0);
  retargetWaterPill(s, 250, 26, 14, 14, 300, 36, 10);

  let spawned = false;
  let now = 10;
  for (let i = 0; i < 240; i++) {
    now += 16;
    stepWaterPill(s, 0.016, now, false, () => 0.5);
    if (s.sats.length > 0) spawned = true;
    if (!s.moving && s.rips.length > 0) break;
  }

  assert.equal(spawned, true, "expected neck droplets to split on long jump");
  assert.equal(s.moving, false, "expected drop to settle at target");
  assert.ok(Math.abs(s.a.x - 250) < 2, "expected lead body near target");
  assert.ok(s.rips.length >= 1, "expected arrival ripple when settled");
});

test("stepWaterPill snaps immediately when prefers-reduced-motion is active", () => {
  const s = createWaterPillState(10);
  retargetWaterPill(s, 40, 26, 14, 14, 300, 36, 0);
  retargetWaterPill(s, 210, 26, 18, 14, 300, 36, 10);

  stepWaterPill(s, 0.016, 26, true);
  assert.equal(s.a.x, 210);
  assert.equal(s.b.x, 210);
  assert.equal(s.sats.length, 0);
  assert.equal(s.moving, false);
});
