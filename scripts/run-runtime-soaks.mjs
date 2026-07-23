import {readFile} from "node:fs/promises";

import {runVirtualSoak} from "../runtime/soak.mjs";

const fixture = JSON.parse(await readFile(new URL("../ui-contract/fixtures/runtime-soaks.json", import.meta.url)));
for (const scenario of fixture.soaks) {
  const actual = runVirtualSoak({scenario, limits: fixture.limits, events: scenario.events});
  if (JSON.stringify(actual) !== JSON.stringify(scenario.expected)) {
    throw new Error(`${scenario.id}: runtime soak drift`);
  }
  console.log(`${scenario.id}: ${scenario.durationMinutes}m state=${actual.finalState} recoveries=${actual.recoveries} hash=${actual.stateHash}`);
}
console.log(`PASS runtime-soaks count=${fixture.soaks.length}`);
