#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pio="$root/.tools/venv/bin/pio"
project="$root/firmware/public-candidate"
build="$project/.pio/build/core2-public-candidate"
log="$(mktemp -t open-radio-build.XXXXXX)"
trap 'rm -f "$log"' EXIT

[[ -x "$pio" ]] || {
  printf 'Missing PlatformIO compatibility path at %s; run scripts/bootstrap-firmware-toolchain.sh\n' "$pio" >&2
  exit 1
}

node "$root/scripts/check-firmware-lock.mjs"
node "$root/scripts/generate-firmware-assets.mjs" --check
node "$root/scripts/generate-runtime-contract.mjs" --check
node "$root/scripts/generate-ingress-contract.mjs" --check
node "$root/scripts/check-firmware-surface.mjs"

hashes=()
for pass in 1 2; do
  rm -rf "$root/.tools/platformio-cache"
  "$pio" run -d "$project" -e core2-public-candidate -t clean
  "$pio" run -d "$project" -e core2-public-candidate | tee "$log"
  hashes+=("$(shasum -a 256 "$build/firmware.bin" | awk '{print $1}')")
done

[[ "${hashes[0]}" == "${hashes[1]}" ]] || {
  printf 'Non-deterministic firmware.bin: %s != %s\n' "${hashes[0]}" "${hashes[1]}" >&2
  exit 1
}

node "$root/scripts/check-resolved-libdeps.mjs"

candidate_hash="$(node -e 'const fs = require("node:fs"); const candidate = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(candidate.evidenceFirmwareSha256);' "$root/release/rc1-candidate.json")"
[[ "${hashes[0]}" == "$candidate_hash" ]] || {
  printf 'RC1 evidence hash mismatch: built %s, candidate %s\n' "${hashes[0]}" "$candidate_hash" >&2
  exit 1
}

OPEN_RADIO_BUILD_LOG="$log" OPEN_RADIO_EVIDENCE_NAME="${OPEN_RADIO_EVIDENCE_NAME:-s10-build-evidence.json}" node "$root/scripts/collect-firmware-evidence.mjs"
printf 'PASS firmware-reproducibility sha256=%s\n' "${hashes[0]}"
