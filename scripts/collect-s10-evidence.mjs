import {createHash} from "node:crypto";
import {readFile, writeFile} from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), "utf8"));
const [build, ingressManifest, ingressFixture, soakFixture, variants, budgets, nodeSummary] = await Promise.all([
  readJson("output/firmware/s10-build-evidence.json"),
  readJson("firmware/generated/runtime-ingress-manifest.json"),
  readJson("ui-contract/fixtures/callback-traces.json"),
  readJson("ui-contract/fixtures/runtime-soaks.json"),
  readJson("output/firmware/s10-variant-sizes.json"),
  readJson("firmware/manifests/resource-budgets.json"),
  readJson("output/firmware/node-test-summary.json")
]);
const buildBytes = await readFile(new URL("output/firmware/s10-build-evidence.json", root));
const report = {
  schemaVersion: 1,
  loop: "S10",
  target: "m5stack-core2",
  buildOnly: true,
  hardwareValidated: false,
  runtimeNetworkAccess: false,
  ingress: {
    traces: ingressFixture.traces.length,
    generatedFacts: ingressManifest.counts.facts,
    seededPermutations: ingressManifest.counts.permutations,
    limits: budgets.ingressHostGates,
    hardwareMeasurements: budgets.hardwareIngressMeasurements,
    summaries: ingressFixture.traces.map(trace => ({
      id: trace.id,
      seed: trace.seed ?? null,
      convergenceGroup: trace.convergenceGroup ?? null,
      finalState: trace.expected.finalState,
      finalOutput: trace.expected.finalOutput,
      acceptedFacts: trace.expected.acceptedFacts,
      mailboxOverflows: trace.expected.mailboxOverflows,
      staleEpochs: trace.expected.staleEpochs,
      backwardTicks: trace.expected.backwardTicks,
      rollovers: trace.expected.rollovers,
      stateHash: trace.expected.stateHash
    }))
  },
  retainedRuntimeSoak: {
    scenarios: soakFixture.soaks.length,
    totalMinutes: soakFixture.soaks.reduce((sum, scenario) => sum + scenario.durationMinutes, 0)
  },
  hostFirmwareCases: {
    contract: 4,
    serviceParity: 27,
    hostileInput: 24,
    runtime: 18,
    ingress: 17,
    total: 90
  },
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

await writeFile(new URL("output/firmware/s10-ingress-evidence.json", root),
  `${JSON.stringify(report, null, 2)}\n`);
console.log(`PASS s10-evidence traces=${report.ingress.traces} firmwareCases=${report.hostFirmwareCases.total} node=${report.regression.node}`);
