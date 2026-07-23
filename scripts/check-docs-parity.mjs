import {readFile} from "node:fs/promises";
import {basename} from "node:path";

const root = new URL("../", import.meta.url);
const pairs = [
  ["README.md", "README.pl.md"],
  ["USER-GUIDE.md", "USER-GUIDE.pl.md"],
  ["CONTRIBUTING.md", "CONTRIBUTING.pl.md"],
  ["SUPPORT.md", "SUPPORT.pl.md"],
  ["REPRODUCIBILITY.md", "REPRODUCIBILITY.pl.md"],
  ["community/README.md", "community/README.pl.md"],
  ["docs/66-pixel-perfect-gui-system.en.md", "docs/66-pixel-perfect-gui-system.pl.md"],
  ["docs/67-brand-global-gui-qc.en.md", "docs/67-brand-global-gui-qc.pl.md"],
  ["docs/75-hardware-arrival-handoff.en.md", "docs/75-hardware-arrival-handoff.pl.md"],
  ["docs/78-now-playing-experience.en.md", "docs/78-now-playing-experience.pl.md"],
  ["docs/80-autonomous-configuration-audit.en.md", "docs/80-autonomous-configuration-audit.pl.md"],
  ["docs/82-s19-autonomy-layer.en.md", "docs/82-s19-autonomy-layer.pl.md"],
  ["docs/83-v3-core2-opportunity-study.en.md", "docs/83-v3-core2-opportunity-study.pl.md"],
  ["docs/85-novice-ux-public-readiness-audit.en.md", "docs/85-novice-ux-public-readiness-audit.pl.md"],
  ["docs/86-emulator-pixel-parity-audit.en.md", "docs/86-emulator-pixel-parity-audit.pl.md"],
  ["docs/87-s20-canonical-device-ui-closeout.en.md", "docs/87-s20-canonical-device-ui-closeout.pl.md"],
  ["docs/90-s22-gui-interaction-polish.en.md", "docs/90-s22-gui-interaction-polish.pl.md"],
  ["docs/93-final-operational-readiness.en.md", "docs/93-final-operational-readiness.pl.md"],
  ["docs/94-audio-engine-quality.en.md", "docs/94-audio-engine-quality.pl.md"],
  ["docs/95-station-coverage-and-metadata-plan.en.md", "docs/95-station-coverage-and-metadata-plan.pl.md"],
  ["docs/99-final-hardware-qualification-plan.en.md", "docs/99-final-hardware-qualification-plan.pl.md"],
  ["docs/101-minimal-connectivity-and-brand-reset.en.md", "docs/101-minimal-connectivity-and-brand-reset.pl.md"],
  ["docs/102-automation-secure-reset-flash-day-report.en.md", "docs/102-automation-secure-reset-flash-day-report.pl.md"],
  ["docs/103-bluetooth-station-switch-failed-day-closeout.en.md", "docs/103-bluetooth-station-switch-failed-day-closeout.pl.md"],
  ["docs/104-cc-stabilization-closeout.en.md", "docs/104-cc-stabilization-closeout.pl.md"],
  ["docs/105-final-gift-build-and-qc9-closeout.en.md", "docs/105-final-gift-build-and-qc9-closeout.pl.md"],
  ["docs/106-final-private-cube-closeout-loop.en.md", "docs/106-final-private-cube-closeout-loop.pl.md"],
  ["docs/107-public-release-0-1.en.md", "docs/107-public-release-0-1.pl.md"],
  ["docs/108-remove-favorites.en.md", "docs/108-remove-favorites.pl.md"],
  ["docs/109-catalog-as-data.en.md", "docs/109-catalog-as-data.pl.md"],
  ["docs/110-choosing-the-nine.en.md", "docs/110-choosing-the-nine.pl.md"],
  ["docs/111-bt-audio-bottleneck-audit.en.md", "docs/111-bt-audio-bottleneck-audit.pl.md"],
  ["docs/112-logos-one-image-catalog-classes.en.md", "docs/112-logos-one-image-catalog-classes.pl.md"],
  ["docs/113-release-0-2.en.md", "docs/113-release-0-2.pl.md"],
  ["docs/114-public-mirror-runbook.en.md", "docs/114-public-mirror-runbook.pl.md"],
  ["docs/116-release-0-2-1.en.md", "docs/116-release-0-2-1.pl.md"],
  ["docs/117-0-2-2-maintenance-plan.en.md", "docs/117-0-2-2-maintenance-plan.pl.md"]
];

for (const [englishPath, polishPath] of pairs) {
  const [english, polish] = await Promise.all([
    readFile(new URL(englishPath, root), "utf8"),
    readFile(new URL(polishPath, root), "utf8")
  ]);
  if (!english.includes(`(${basename(polishPath)})`) || !polish.includes(`(${basename(englishPath)})`)) {
    throw new Error(`missing reciprocal language link: ${englishPath} <-> ${polishPath}`);
  }
  const englishSections = english.match(/^## /gm)?.length ?? 0;
  const polishSections = polish.match(/^## /gm)?.length ?? 0;
  if (englishSections !== polishSections) throw new Error(`section parity mismatch: ${englishPath}=${englishSections}, ${polishPath}=${polishSections}`);
}

const [guiEnglish, guiPolish, s22English, s22Polish] = await Promise.all([
  readFile(new URL("docs/66-pixel-perfect-gui-system.en.md", root), "utf8"),
  readFile(new URL("docs/66-pixel-perfect-gui-system.pl.md", root), "utf8"),
  readFile(new URL("docs/90-s22-gui-interaction-polish.en.md", root), "utf8"),
  readFile(new URL("docs/90-s22-gui-interaction-polish.pl.md", root), "utf8")
]);
if (!guiEnglish.includes("the device downloads station logos itself at runtime") || !guiPolish.includes("urządzenie samo pobiera logotypy stacji w runtime")) {
  throw new Error("active GUI docs must describe the ADR-010 runtime logo path in both languages");
}
if (!s22English.includes("Hardware correction 2026-07-15") || !s22Polish.includes("Korekta sprzętowa 2026-07-15")) {
  throw new Error("historical S22 artwork correction must exist in both languages");
}

console.log(`PASS docs-parity pairs=${pairs.length}`);
