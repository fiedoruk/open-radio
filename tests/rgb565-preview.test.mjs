import test from "node:test";
import assert from "node:assert/strict";
import {expandRgb565, hashRgb565, packRgb565, parsePpm, quantizeRgbaToRgb565} from "../gui-lab/rgb565-preview.mjs";

test("RGB565 packing matches the firmware contract", () => {
  assert.equal(packRgb565(255, 0, 0), 0xf800);
  assert.equal(packRgb565(0, 255, 0), 0x07e0);
  assert.equal(packRgb565(0, 0, 255), 0x001f);
  assert.deepEqual(expandRgb565(0xffff), [255, 255, 255]);
});

test("firmware PPM parser accepts only exact Core2 RGB frames", () => {
  const header = new TextEncoder().encode("P6\n320 240\n255\n");
  const frame = new Uint8Array(header.length + 320 * 240 * 3);
  frame.set(header);
  const parsed = parsePpm(frame);
  assert.equal(parsed.width, 320);
  assert.equal(parsed.height, 240);
  assert.equal(parsed.rgb.length, 320 * 240 * 3);
  assert.throws(() => parsePpm(new TextEncoder().encode("P6\n2 2\n255\nabcdefghijkl")), /Invalid renderer frame/);
});

test("preview quantization rewrites pixels and returns deterministic packed data", () => {
  const rgba = new Uint8ClampedArray([250, 128, 5, 255, 12, 34, 56, 255]);
  const packed = quantizeRgbaToRgb565(rgba);
  assert.deepEqual([...packed], [packRgb565(250, 128, 5), packRgb565(12, 34, 56)]);
  for (let index = 0; index < packed.length; index += 1) {
    assert.deepEqual([...rgba.slice(index * 4, index * 4 + 3)], expandRgb565(packed[index]));
  }
  assert.equal(hashRgb565(packed), hashRgb565(new Uint16Array(packed)));
});
