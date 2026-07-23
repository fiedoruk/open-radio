import {createHash} from "node:crypto";
import {mkdir, readFile, writeFile} from "node:fs/promises";

const root = new URL("../", import.meta.url);
const catalogUrl = new URL("ui-contract/catalog/station-catalog.v1.json", root);
const onboardingFiles = ["index.html", "styles.css", "state-machine.mjs", "app.mjs"];
const onboardingContentTypes = {
  "index.html": "Html",
  "styles.css": "Css",
  "state-machine.mjs": "JavaScript",
  "app.mjs": "JavaScript"
};
const stationHeaderUrl = new URL("firmware/generated/station_catalog.hpp", root);
const onboardingHeaderUrl = new URL("firmware/generated/onboarding_assets.hpp", root);
const manifestUrl = new URL("firmware/generated/assets-manifest.json", root);
const checkOnly = process.argv.includes("--check");

const sha256 = value => createHash("sha256").update(value).digest("hex");
const escapeCpp = value => value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');

const catalog = JSON.parse(await readFile(catalogUrl, "utf8"));
const directoryUrl = new URL("ui-contract/catalog/pl-directory.v1.json", root);
const directory = JSON.parse(await readFile(directoryUrl, "utf8"));

// Everything the installer can choose from, baked in. The picker runs on the
// device's own access point, where there is no internet by definition, so a
// live catalog is not an option at the moment the choice is made. Every entry
// here answered our own probe on directory.probedAt.
const directoryEndpointRows = [];
// Class C holds realtime but recovers slowest and stays out of the shipped
// picker until proven on a device; classes A and B carry either wide measured
// headroom or the exact delivery class Radio ESKA proved clean on 0.1.
const shippedStations = directory.stations.filter(station => station.tier !== "C");
const directoryRows = shippedStations.map(station => {
  const offset = directoryEndpointRows.length;
  for (const endpoint of station.endpoints) {
    directoryEndpointRows.push(`  {"${escapeCpp(endpoint.url)}", ${endpoint.bitrateKbps ?? 128}}`);
  }
  return `  {"${escapeCpp(station.name)}", "${escapeCpp(station.favicon ?? "")}", ${offset}, ${station.endpoints.length}}`;
}).join(",\n");

// One flat endpoint table plus an offset/count pair per station. A flat array
// keeps every string in .rodata with no pointer indirection per station, and
// the device only ever needs "this station's nth alternate".
const playbackRows = [];
const stationOffsets = [];
for (const station of catalog.stations) {
  stationOffsets.push({offset: playbackRows.length, count: station.playback.length});
  for (const endpoint of station.playback) {
    playbackRows.push(`  {"${escapeCpp(endpoint.url)}", ${endpoint.bitrateKbps}, PlaybackResolver::${endpoint.resolver === "RMFON_POOL" ? "RmfonPool" : "Direct"}}`);
  }
}

const stationRows = catalog.stations.map((station, index) =>
  `  {"${escapeCpp(station.id)}", "${escapeCpp(station.displayName)}", "${escapeCpp(station.favicon ?? "")}", CapabilityClass::${station.capabilityClass === "MP3_ICY" ? "Mp3Icy" : "HlsHeAac"}, ${station.firmwareSupport === "MODEL_READY" ? "true" : "false"}, ${stationOffsets[index].offset}, ${stationOffsets[index].count}}`
).join(",\n");

const stationHeader = `#pragma once

#include <cstddef>
#include <cstdint>

#include "open_radio/firmware_contract.hpp"

namespace open_radio {
namespace generated {

// How the device turns a catalog row into an open socket. Direct endpoints are
// opened as written. RmfonPool endpoints are the pinned plain-HTTP fallback for
// a station whose live edges come from the operator's discovery API, which
// needs TLS and therefore only works while the Bluetooth stack is still down.
enum class PlaybackResolver : std::uint8_t { Direct = 0, RmfonPool = 1 };

struct PlaybackEndpoint {
  const char* url;
  std::uint16_t bitrateKbps;
  PlaybackResolver resolver;
};

static constexpr PlaybackEndpoint kPlaybackEndpoints[] = {
${playbackRows.join(",\n")}
};

static constexpr std::size_t kPlaybackEndpointCount = sizeof(kPlaybackEndpoints) / sizeof(kPlaybackEndpoints[0]);

struct StationRecord {
  const char* id;
  const char* displayName;
  const char* favicon;
  CapabilityClass capability;
  bool modelReady;
  std::size_t playbackOffset;
  std::size_t playbackCount;
};

static constexpr StationRecord kStations[] = {
${stationRows}
};

static constexpr std::size_t kStationCount = sizeof(kStations) / sizeof(kStations[0]);

struct DirectoryEndpoint {
  const char* url;
  std::uint16_t bitrateKbps;
};

// The date every endpoint below answered our probe. The portal shows it, so
// an installer can see how fresh the list they are choosing from actually is.
static constexpr const char* kDirectoryProbedAt = "${directory.probedAt}";

static constexpr DirectoryEndpoint kDirectoryEndpoints[] = {
${directoryEndpointRows.join(",\n")}
};

// A station picked from the directory gets the same treatment as one we
// curated by hand: several verified edges and a wheel to rotate through them.
// Quality of service must not depend on how a station reached a slot.
struct DirectoryStation {
  const char* name;
  // Official or community icon URL, verified today to answer with a PNG or
  // JPEG the device can decode; empty when the tile keeps its monogram.
  const char* favicon;
  std::size_t endpointOffset;
  std::size_t endpointCount;
};

static constexpr DirectoryStation kDirectory[] = {
${directoryRows}
};

static constexpr std::size_t kDirectoryCount = sizeof(kDirectory) / sizeof(kDirectory[0]);

}
}
`;

const onboardingSources = {};
for (const file of onboardingFiles) {
  onboardingSources[file] = await readFile(new URL(`network-onboarding/${file}`, root), "utf8");
}

const delimiter = "OPEN_RADIO_ASSET";
const onboardingRows = onboardingFiles.map(file => {
  const identifier = file.replaceAll(/[^a-zA-Z0-9]/g, "_");
  return `static const char k_${identifier}[] = R\"${delimiter}(${onboardingSources[file]})${delimiter}\";`;
}).join("\n\n");

const onboardingTableRows = onboardingFiles.map(file => {
  const identifier = file.replaceAll(/[^a-zA-Z0-9]/g, "_");
  return `  {"/network-onboarding/${escapeCpp(file)}", ContentType::${onboardingContentTypes[file]}, k_${identifier}, sizeof(k_${identifier}) - 1}`;
}).join(",\n");

const onboardingHeader = `#pragma once

#include <cstddef>

#include "open_radio/service_contracts.hpp"

namespace open_radio {
namespace generated {

${onboardingRows}

struct OnboardingAsset {
  const char* path;
  ContentType contentType;
  const char* content;
  std::size_t size;
};

static constexpr OnboardingAsset kOnboardingAssets[] = {
${onboardingTableRows}
};

static constexpr std::size_t kOnboardingAssetCount =
    sizeof(kOnboardingAssets) / sizeof(kOnboardingAssets[0]);

}
}
`;

const manifest = {
  schemaVersion: 1,
  generator: "scripts/generate-firmware-assets.mjs",
  stationCount: catalog.stations.length,
  mp3Ready: catalog.stations.filter(station => station.capabilityClass === "MP3_ICY").length,
  hlsDecoderPending: catalog.stations.filter(station => station.capabilityClass === "HLS_HE_AAC").length,
  inputs: {
    "ui-contract/catalog/station-catalog.v1.json": sha256(await readFile(catalogUrl)),
    "ui-contract/catalog/pl-directory.v1.json": sha256(await readFile(directoryUrl)),
    ...Object.fromEntries(onboardingFiles.map(file => [`network-onboarding/${file}`, sha256(onboardingSources[file])]))
  },
  outputs: {
    "firmware/generated/station_catalog.hpp": sha256(stationHeader),
    "firmware/generated/onboarding_assets.hpp": sha256(onboardingHeader)
  }
};

async function assertCurrent(url, expected) {
  const actual = await readFile(url, "utf8").catch(() => null);
  if (actual !== expected) throw new Error(`generated file is stale: ${url.pathname}`);
}

if (checkOnly) {
  await assertCurrent(stationHeaderUrl, stationHeader);
  await assertCurrent(onboardingHeaderUrl, onboardingHeader);
  await assertCurrent(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`PASS firmware-assets stations=${manifest.stationCount} onboarding=${onboardingFiles.length}`);
} else {
  await mkdir(new URL("firmware/generated/", root), {recursive: true});
  await writeFile(stationHeaderUrl, stationHeader);
  await writeFile(onboardingHeaderUrl, onboardingHeader);
  await writeFile(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`WROTE firmware-assets stations=${manifest.stationCount} onboarding=${onboardingFiles.length}`);
}
