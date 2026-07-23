import {readFile} from "node:fs/promises";

import {runIngressTrace} from "../runtime/ingress-replay.mjs";
import {runtimeLimits} from "../runtime/generated/runtime-limits.mjs";

const root = new URL("../", import.meta.url);
const fixture = JSON.parse(await readFile(new URL("ui-contract/fixtures/callback-traces.json", root)));
for (const trace of fixture.traces) {
  const actual = runIngressTrace({trace, ingressLimits: fixture.limits, runtimeLimits});
  if (JSON.stringify(actual) !== JSON.stringify(trace.expected)) {
    throw new Error(`${trace.id}: ingress replay mismatch`);
  }
  console.log(`${trace.id}: ${actual.finalState}/${actual.finalOutput} accepted=${actual.acceptedFacts} rejected=${trace.facts.length - actual.acceptedFacts}`);
}
