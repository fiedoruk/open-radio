import {mkdir, readFile, writeFile} from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, root), "utf8");
const readJson = async path => JSON.parse(await readText(path));
const [layout, renderer, pixelSystem, catalog, identities, fixture, sprite] = await Promise.all([
  readJson("ui-contract/layout/core2-320x240.json"),
  readJson("ui-contract/renderer/rgb565.json"),
  readJson("ui-contract/gui/core2-pixel-system.v1.json"),
  readJson("ui-contract/catalog/stations.pl.json"),
  readJson("ui-contract/gui/station-identities.v1.json"),
  readJson("ui-contract/fixtures/renderer-now-playing.json"),
  readText("ui-contract/icons/tabler-core2.svg")
]);

function rgb565(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  const red = value >> 16;
  const green = (value >> 8) & 0xff;
  const blue = value & 0xff;
  return ((red >> 3) << 11) | ((green >> 2) << 5) | (blue >> 3);
}

const hex16 = value => `0x${value.toString(16).padStart(4, "0")}`;
const hex32 = value => `0x${value.toString(16).padStart(8, "0")}U`;
const quote = value => JSON.stringify(value);
const outputMode = fixture.output === "BT" ? "bluetooth" : "local";
const fixtureTheme = fixture.theme === "LIGHT" ? "light" : "dark";
const identityById = new Map(identities.stations.map(identity => [identity.id, identity]));

const stationRows = catalog.stations.map(station => {
  const identity = identityById.get(station.id);
  if (!identity) throw new Error(`missing station identity: ${station.id}`);
  const colors = [identity.accent, identity.accentAlt, identity.onAccent].map(color => hex16(rgb565(color))).join(", ");
  return `    {${quote(station.id)}, ${quote(station.name)}, ${quote(station.short)}, ${colors}},`;
}).join("\n");

const themeOrder = ["dark", "light"];
const themeRows = themeOrder.map(themeName => {
  const theme = pixelSystem.themes[themeName];
  const colors = ["canvas", "surface", "raised", "text", "muted", "border", "success", "warning", "danger", "shadow", "brand", "onBrand"]
    .map(key => hex16(rgb565(theme[key])))
    .join(", ");
  return `inline constexpr ThemeTokens k${themeName[0].toUpperCase()}${themeName.slice(1)}Theme{${colors}};`;
}).join("\n");

const contractHeader = `#pragma once

#include <array>

#include "open_radio/renderer.hpp"

namespace open_radio::ui::generated {

inline constexpr int kWidth = ${layout.width};
inline constexpr int kHeight = ${layout.height};
inline constexpr int kStatusBarHeight = ${pixelSystem.grid.statusBarHeight};
inline constexpr int kControlBarHeight = ${pixelSystem.grid.bottomBarHeight};
inline constexpr std::size_t kStationCount = ${catalog.stations.length};

${themeRows}
inline constexpr ThemeMode kDefaultTheme = ThemeMode::${pixelSystem.defaultTheme};

constexpr const ThemeTokens& themeFor(ThemeMode mode) {
  return mode == ThemeMode::light ? kLightTheme : kDarkTheme;
}

inline constexpr std::array<StationTheme, kStationCount> kStations{{
${stationRows}
}};

}
`;

function rasterizeIcon(name) {
  const symbol = sprite.match(new RegExp(`<symbol id="tabler-${name}"[^>]*>([\\s\\S]*?)<\\/symbol>`));
  if (!symbol) throw new Error(`missing icon symbol: ${name}`);
  const rows = Array(24).fill(0);
  const paths = [...symbol[1].matchAll(/<path d="([^"]+)"/g)].map(match => match[1]);
  const paint = (x, y) => {
    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        const pixelX = Math.round(x + offsetX);
        const pixelY = Math.round(y + offsetY);
        if (pixelX >= 0 && pixelX < 24 && pixelY >= 0 && pixelY < 24) rows[pixelY] |= 1 << pixelX;
      }
    }
  };
  const line = (startX, startY, endX, endY) => {
    const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY)) * 4;
    if (steps === 0) return paint(startX, startY);
    for (let step = 0; step <= steps; step += 1) {
      paint(startX + (endX - startX) * step / steps, startY + (endY - startY) * step / steps);
    }
  };
  for (const path of paths) {
    const tokens = path.match(/[MLHVmlhv]|-?(?:\d+(?:\.\d*)?|\.\d+)/g) ?? [];
    let cursor = 0;
    let command = null;
    let x = 0;
    let y = 0;
    while (cursor < tokens.length) {
      if (/^[MLHVmlhv]$/.test(tokens[cursor])) command = tokens[cursor++];
      if (!command) throw new Error(`icon ${name} path has no command`);
      const relative = command === command.toLowerCase();
      const upper = command.toUpperCase();
      if (upper === "M" || upper === "L") {
        const nextX = Number(tokens[cursor++]);
        const nextY = Number(tokens[cursor++]);
        const targetX = relative ? x + nextX : nextX;
        const targetY = relative ? y + nextY : nextY;
        if (upper === "L") line(x, y, targetX, targetY);
        x = targetX;
        y = targetY;
        if (upper === "M") command = relative ? "l" : "L";
      } else if (upper === "H") {
        const value = Number(tokens[cursor++]);
        const targetX = relative ? x + value : value;
        line(x, y, targetX, y);
        x = targetX;
      } else if (upper === "V") {
        const value = Number(tokens[cursor++]);
        const targetY = relative ? y + value : value;
        line(x, y, x, targetY);
        y = targetY;
      } else {
        throw new Error(`unsupported icon command ${command} in ${name}`);
      }
    }
  }
  return rows;
}

const iconNames = ["bluetooth", "chevron-left", "chevron-right", "x", "check", "menu-2"];
const iconRows = iconNames.map(name => {
  const cppName = name.split("-").map(part => part[0].toUpperCase() + part.slice(1)).join("");
  return `inline constexpr IconMask24 kIcon${cppName}{{{${rasterizeIcon(name).map(hex32).join(", ")}}}};`;
}).join("\n");

const iconHeader = `#pragma once

#include "open_radio/renderer.hpp"

namespace open_radio::ui::generated {

${iconRows}

}
`;

const fixtureHeader = `#pragma once

#include "open_radio/renderer.hpp"

namespace open_radio::ui::generated {

inline constexpr const char* kFixtureId = ${quote(fixture.id)};
inline constexpr CompactSnapshot kNowPlayingFixture{
    ${fixture.stationIndex},
    ${fixture.requestedStationIndex},
    ${fixture.wifiOnline},
    AudioOutput::${outputMode},
    ${fixture.volume},
    ${fixture.degraded},
    ThemeMode::${fixtureTheme},
};

}
`;

const outputs = [
  ["renderer/generated/ui_contract.hpp", contractHeader],
  ["renderer/generated/icon_masks.hpp", iconHeader],
  ["renderer/generated/fixture_now_playing.hpp", fixtureHeader]
];
const writeMode = process.argv.includes("--write");
let drift = false;
for (const [path, expected] of outputs) {
  const url = new URL(path, root);
  if (writeMode) {
    await mkdir(new URL("./", url), {recursive: true});
    await writeFile(url, expected);
    process.stdout.write(`WROTE ${path}\n`);
    continue;
  }
  const actual = await readFile(url, "utf8");
  if (actual !== expected) {
    process.stderr.write(`DRIFT ${path}; run npm run generate:renderer\n`);
    drift = true;
  }
}
if (drift) process.exit(1);
if (!writeMode) process.stdout.write(`PASS renderer-generated files=${outputs.length} format=${renderer.pixelFormat} themes=${themeOrder.length} icons=${iconNames.length}\n`);
