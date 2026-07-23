const expand5 = value => Math.round(value * 255 / 31);
const expand6 = value => Math.round(value * 255 / 63);

export function packRgb565(red, green, blue) {
  return ((red >> 3) << 11) | ((green >> 2) << 5) | (blue >> 3);
}

export function expandRgb565(pixel) {
  return [expand5((pixel >> 11) & 0x1f), expand6((pixel >> 5) & 0x3f), expand5(pixel & 0x1f)];
}

export function quantizeRgbaToRgb565(data) {
  const packed = new Uint16Array(data.length / 4);
  for (let offset = 0, pixelIndex = 0; offset < data.length; offset += 4, pixelIndex += 1) {
    const pixel = packRgb565(data[offset], data[offset + 1], data[offset + 2]);
    const [red, green, blue] = expandRgb565(pixel);
    data[offset] = red;
    data[offset + 1] = green;
    data[offset + 2] = blue;
    packed[pixelIndex] = pixel;
  }
  return packed;
}

export function hashRgb565(pixels) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (const pixel of pixels) {
    hash ^= BigInt((pixel >> 8) & 0xff);
    hash = BigInt.asUintN(64, hash * prime);
    hash ^= BigInt(pixel & 0xff);
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash.toString(16).padStart(16, "0");
}

export function parsePpm(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let cursor = 0;
  const token = () => {
    while (cursor < view.length && view[cursor] <= 32) cursor += 1;
    const start = cursor;
    while (cursor < view.length && view[cursor] > 32) cursor += 1;
    return new TextDecoder().decode(view.slice(start, cursor));
  };
  if (token() !== "P6") throw new Error("Unsupported PPM format");
  const width = Number(token());
  const height = Number(token());
  const maximum = Number(token());
  if (cursor >= view.length || view[cursor] > 32) throw new Error("Invalid PPM header");
  cursor += 1;
  if (width !== 320 || height !== 240 || maximum !== 255 || view.length - cursor !== width * height * 3) throw new Error("Invalid renderer frame");
  return {width, height, rgb: view.slice(cursor)};
}

export async function renderPpmAsRgb565(url, canvas) {
  const response = await fetch(url, {cache: "no-store"});
  if (!response.ok) throw new Error(`Firmware renderer request failed: ${response.status}`);
  const {width, height, rgb} = parsePpm(await response.arrayBuffer());
  const context = canvas.getContext("2d", {alpha: false, willReadFrequently: true});
  const frame = context.createImageData(width, height);
  for (let source = 0, target = 0; source < rgb.length; source += 3, target += 4) {
    frame.data[target] = rgb[source];
    frame.data[target + 1] = rgb[source + 1];
    frame.data[target + 2] = rgb[source + 2];
    frame.data[target + 3] = 255;
  }
  context.putImageData(frame, 0, 0);
  return {
    hash: hashRgb565(quantizeRgbaToRgb565(frame.data)),
    truncated: response.headers.get("X-Open-Radio-Truncated") ?? "unknown",
    renderer: response.headers.get("X-Open-Radio-Renderer") ?? "unknown"
  };
}
