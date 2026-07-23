import test from "node:test";
import assert from "node:assert/strict";
import {
  DisplayPhases,
  DisplayOffDelays,
  ScreensaverDelays,
  ScreensaverModes,
  defaultDisplayProfile,
  evaluateDisplayPhase,
  nextBoundedValue,
  validateDisplayProfile
} from "../display/display-policy.mjs";

test("default display profile enters screensaver then turns only the screen off", () => {
  assert.deepEqual(validateDisplayProfile(defaultDisplayProfile), {valid: true, errors: []});
  assert.equal(evaluateDisplayPhase(defaultDisplayProfile, 119), DisplayPhases.ACTIVE);
  assert.equal(evaluateDisplayPhase(defaultDisplayProfile, 120), DisplayPhases.SCREENSAVER);
  assert.equal(evaluateDisplayPhase(defaultDisplayProfile, 1799), DisplayPhases.SCREENSAVER);
  assert.equal(evaluateDisplayPhase(defaultDisplayProfile, 1800), DisplayPhases.OFF);
});

test("screensaver and display off can be disabled independently", () => {
  assert.equal(evaluateDisplayPhase({...defaultDisplayProfile, screensaverEnabled: false}, 300), DisplayPhases.ACTIVE);
  assert.equal(evaluateDisplayPhase({...defaultDisplayProfile, screensaverEnabled: false}, 1800), DisplayPhases.OFF);
  assert.equal(evaluateDisplayPhase({...defaultDisplayProfile, displayOffEnabled: false}, 3600), DisplayPhases.SCREENSAVER);
  assert.equal(evaluateDisplayPhase({...defaultDisplayProfile, screensaverEnabled: false, displayOffEnabled: false}, 99999), DisplayPhases.ACTIVE);
});

test("all screen settings cycle through bounded values", () => {
  assert.equal(nextBoundedValue(ScreensaverModes, "pulse"), "bars");
  assert.equal(nextBoundedValue(ScreensaverModes, "orbit"), "cat");
  assert.equal(nextBoundedValue(ScreensaverModes, "cat"), "pulse");
  assert.equal(nextBoundedValue(ScreensaverDelays, 600), 30);
  assert.equal(nextBoundedValue(DisplayOffDelays, 3600), 900);
  assert.equal(validateDisplayProfile({...defaultDisplayProfile, screensaverDelaySeconds: 121}).valid, false);
  assert.equal(validateDisplayProfile({...defaultDisplayProfile, extra: true}).valid, false);
});
