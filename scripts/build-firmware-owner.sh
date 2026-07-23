#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pio="$root/.tools/venv/bin/pio"
project="$root/firmware/public-candidate"
lane="core2-owner-production"
build="$project/.pio/build/$lane"
scratch="$(mktemp -d "${TMPDIR:-/tmp}/open-radio-owner.XXXXXX")"
trap 'rm -rf -- "$scratch"' EXIT

[[ -x "$pio" ]] || {
  printf 'Missing PlatformIO compatibility path at %s\n' "$pio" >&2
  exit 1
}
[[ -z "$(git -C "$root" status --porcelain --untracked-files=normal)" ]] || {
  printf '%s\n' 'BLOCKED: owner-production build requires a clean source tree.' >&2
  exit 1
}

node "$root/scripts/check-firmware-lock.mjs"
node "$root/scripts/generate-firmware-assets.mjs" --check
node "$root/scripts/generate-runtime-contract.mjs" --check
node "$root/scripts/generate-ingress-contract.mjs" --check
node "$root/scripts/generate-logo-pack.mjs" --check
node --test "$root/tests/firmware-fault-matrix.test.mjs"

hashes=()
for pass in 1 2; do
  # PlatformIO's object cache can restore firmware.elf/bin without replaying
  # the linker side effect that emits firmware.map. Independent clean builds
  # are also the stronger reproducibility check required by the closeout gate.
  rm -rf -- "$root/.tools/platformio-cache"
  "$pio" run -d "$project" -e "$lane" -t clean >/dev/null
  "$pio" run -d "$project" -e "$lane" | tee "$scratch/build-$pass.log"
  [[ -f "$build/firmware.map" ]] || {
    printf 'BLOCKED: build pass %s did not emit firmware.map.\n' "$pass" >&2
    exit 1
  }
  cp "$build/firmware.bin" "$scratch/firmware-$pass.bin"
  hashes+=("$(shasum -a 256 "$scratch/firmware-$pass.bin" | awk '{print $1}')")
done

cmp -s "$scratch/firmware-1.bin" "$scratch/firmware-2.bin" || {
  printf 'BLOCKED: non-deterministic owner image %s != %s\n' \
    "${hashes[0]}" "${hashes[1]}" >&2
  exit 1
}
if rg -qi 'AudioGeneratorAAC|libhelix|HlsAacSource|pollLabConsole|lab_console|__wrap_bta_av_co_get_remote_bitpool_pref' \
    "$build/firmware.map"; then
  printf '%s\n' 'BLOCKED: baseline owner image contains AAC/HLS, lab-console or the later SBC wrapper.' >&2
  exit 1
fi
if ! rg -qi 'AudioGeneratorMP3|libmad' "$build/firmware.map"; then
  printf '%s\n' 'BLOCKED: baseline owner image is missing the MP3 decoder.' >&2
  exit 1
fi

source_sha="$(git -C "$root" rev-parse HEAD)"
image_sha="${hashes[0]}"
image_bytes="$(wc -c < "$scratch/firmware-1.bin" | tr -d ' ')"
logo_sha="$(shasum -a 256 \
  "$root/assets-local/station-logos/station_logo_pack.hpp" | awk '{print $1}')"
rollback_sha="$(node -e '
  const fs = require("node:fs");
  const registry = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const rollback = registry.approved.find(
    item => item.role === "CURRENT_EXACT_RECOVERY_IMAGE");
  if (!rollback) process.exit(1);
  process.stdout.write(rollback.sha256);
' "$root/hardware/approved-app-images.json")"

artifact_dir="$root/output/firmware/owner-production/$source_sha"
mkdir -p "$artifact_dir" "$root/output/flashed"
cp "$scratch/firmware-1.bin" "$artifact_dir/firmware.bin"
cp "$build/firmware.elf" "$artifact_dir/firmware.elf"
cp "$build/firmware.map" "$artifact_dir/firmware.map"
cp "$scratch/build-2.log" "$artifact_dir/build.log"
cp "$scratch/firmware-1.bin" \
  "$root/output/flashed/owner-production-$image_sha.bin"

printf 'PASS owner-production source=%s sha256=%s bytes=%s logo_sha256=%s rollback_sha256=%s\n' \
  "$source_sha" "$image_sha" "$image_bytes" "$logo_sha" "$rollback_sha"
