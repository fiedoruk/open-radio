#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
adf_path="$root/.tools/esp-adf"
expected_adf="d0493218b6986e5663a5465b6e2545a336ef901d"
image="espressif/idf@sha256:9352fff95ecee99e953b8fdd4949cda6baeeae76fe23c330dca1133ef92679f9"

if [[ ! -d "$adf_path/.git" ]]; then
  git clone --branch v2.8 --depth 1 --recurse-submodules --shallow-submodules \
    https://github.com/espressif/esp-adf.git "$adf_path"
fi

actual_adf="$(git -C "$adf_path" rev-parse HEAD)"
[[ "$actual_adf" == "$expected_adf" ]] || {
  printf 'ESP-ADF pin mismatch: %s\n' "$actual_adf" >&2
  exit 1
}

docker run --rm \
  -e ADF_PATH=/project/.tools/esp-adf \
  -v "$root":/project \
  -w /project/.tools/esp-adf/examples/player/pipeline_bt_source \
  "$image" bash -lc 'idf.py set-target esp32 && idf.py build'
