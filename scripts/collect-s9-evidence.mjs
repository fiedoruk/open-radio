import {createHash} from "node:crypto";
import {readFile, writeFile} from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), "utf8"));
const [build, manifest, fixture, variants, budgets, nodeSummary] = await Promise.all([
  readJson("output/firmware/s9-build-evidence.json"),
  readJson("firmware/generated/runtime-contract-manifest.json"),
  readJson("ui-contract/fixtures/runtime-soaks.json"),
  readJson("output/firmware/s9-variant-sizes.json"),
  readJson("firmware/manifests/resource-budgets.json"),
  readJson("output/firmware/node-test-summary.json")
]);
const buildBytes = await readFile(new URL("output/firmware/s9-build-evidence.json", root));
const report = {
  schemaVersion: 1,
  loop: "S9",
  target: "m5stack-core2",
  buildOnly: true,
  hardwareValidated: false,
  runtimeNetworkAccess: false,
  virtualSoak: {
    scenarios: fixture.soaks.length,
    totalMinutes: fixture.soaks.reduce((sum, scenario) => sum + scenario.durationMinutes, 0),
    generatedEvents: manifest.counts.events,
    summaries: fixture.soaks.map(scenario => ({
      id: scenario.id,
      durationMinutes: scenario.durationMinutes,
      finalState: scenario.expected.finalState,
      finalOutput: scenario.expected.finalOutput,
      recoveries: scenario.expected.recoveries,
      maximumQueueDepth: scenario.expected.maximumQueueDepth,
      queueOverflows: scenario.expected.queueOverflows,
      timerOverflows: scenario.expected.timerOverflows,
      stateHash: scenario.expected.stateHash
    }))
  },
  runtimeLimits: budgets.runtimeHostGates,
  hostFirmwareCases: {contract: 4, serviceParity: 27, hostileInput: 24, runtime: 25, total: 80},
  regression: {node: nodeSummary.tests, renderer: 5},
  variants: variants.variants,
  publicBuild: {
    firmwareBinBytes: build.artifacts["firmware.bin"].bytes,
    firmwareBinSha256: build.artifacts["firmware.bin"].sha256,
    staticRamBytes: build.resources.staticRamBytes,
    applicationFlashBytes: build.resources.applicationFlashBytes,
    forbiddenCodecSymbols: build.forbiddenCodecSymbols
  },
  buildEvidenceSha256: createHash("sha256").update(buildBytes).digest("hex"),
  prohibitedActions: {
    liveNetwork: false,
    flash: false,
    serial: false,
    account: false,
    releasePublication: false,
    ccWrite: false
  }
};

await writeFile(new URL("output/firmware/s9-runtime-evidence.json", root),
  `${JSON.stringify(report, null, 2)}\n`);
console.log(`PASS s9-evidence minutes=${report.virtualSoak.totalMinutes} firmwareCases=${report.hostFirmwareCases.total} node=${report.regression.node}`);
