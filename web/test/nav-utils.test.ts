import test from "node:test";
import assert from "node:assert/strict";
import { getActiveNavIndex, resolveNavTone } from "../src/components/ui/nav-utils";

test("getActiveNavIndex maps top-level routes accurately", () => {
  assert.equal(getActiveNavIndex("#tuzilma"), 0);
  assert.equal(getActiveNavIndex("#dashboard"), 1);
  assert.equal(getActiveNavIndex("#tasklar"), 2);
  assert.equal(getActiveNavIndex("#davomat"), 3);
  assert.equal(getActiveNavIndex("#nizom"), 4);
  assert.equal(getActiveNavIndex("#sozlamalar"), 5);
  assert.equal(getActiveNavIndex("#qollanma"), 6);
  assert.equal(getActiveNavIndex("#login"), 7);
});

test("getActiveNavIndex maps department subroutes and fallback to Tuzilma (0)", () => {
  assert.equal(getActiveNavIndex("#bolim-b2b-sales"), 0);
  assert.equal(getActiveNavIndex("#bolim-b2c-operators"), 0);
  assert.equal(getActiveNavIndex(""), 0);
  assert.equal(getActiveNavIndex("#unknown-route"), 0);
});

test("resolveNavTone respects explicit day/night modes before OS preference", () => {
  assert.equal(resolveNavTone("night", "light", false), "dark");
  assert.equal(resolveNavTone("day", "dark", true), "light");
  assert.equal(resolveNavTone(null, "dark", false), "dark");
  assert.equal(resolveNavTone(null, "light", true), "light");
  assert.equal(resolveNavTone(null, null, true), "dark");
  assert.equal(resolveNavTone(null, null, false), "light");
});
