#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pio="$root/.tools/venv/bin/pio"
project="$root/firmware/public-candidate"
variants=(
  core2-public-candidate
  core2-onboarding-only
  core2-local-speaker-fallback
  core2-bt-disabled-diagnostics
  core2-corrupt-config-safe-mode
)

[[ -x "$pio" ]] || {
  printf 'Missing PlatformIO compatibility path at %s\n' "$pio" >&2
  exit 1
}

node "$root/scripts/check-firmware-lock.mjs"
node "$root/scripts/generate-firmware-assets.mjs" --check
node "$root/scripts/generate-firmware-service-vectors.mjs" --check
node "$root/scripts/generate-runtime-contract.mjs" --check
node "$root/scripts/generate-ingress-contract.mjs" --check
node "$root/scripts/check-firmware-surface.mjs"

for environment in "${variants[@]}"; do
  "$pio" run -d "$project" -e "$environment"
done

node "$root/scripts/collect-firmware-variants.mjs"
