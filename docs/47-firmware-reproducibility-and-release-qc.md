# 47 — Firmware reproducibility and release QC

## Shared Codex toolchain

The canonical ESP32 runtime is shared by all Codex projects under
`<workspace>/toolchains/esp32`. User launchers live in `~/.local/bin`,
while build caches and artifacts remain project-local. Nothing is installed via
a system package manager. Exact versions and container/submodule pins are
recorded in `firmware/manifests/toolchains.lock.json` and the workspace-level
`toolchains/esp32/stack.lock.json`.

`bash scripts/bootstrap-firmware-toolchain.sh` recreates Python `3.13.12`,
PlatformIO `6.1.19`, CMake `3.30.9` and Ninja `1.11.1.4` from
the shared lock and connects project `.tools/` compatibility paths. Outside the
Codex workspace it retains the project-local fallback based on
`firmware/manifests/requirements-firmware.lock.txt`.

## Public build gate

`bash scripts/build-firmware-public.sh` performs:

1. exact lock and no-floating-ref validation,
2. generated catalog/onboarding determinism validation,
3. credential, endpoint, MAC/BSSID and artwork surface scans,
4. two clean firmware builds,
5. `firmware.bin` SHA-256 equality,
6. linker-map rejection of AAC/Helix/ADF codec symbols,
7. artifact hashes and sizes in `output/firmware/s7-build-evidence.json`.

It never invokes upload, serial monitor, release publication or account APIs.

## Resource gates

Software-only limits live in `firmware/manifests/resource-budgets.json`.
Hardware-only limits for internal heap, largest block, task stack, underruns and
watchdog resets remain pending and cannot be converted into PASS from a build.

## Release rehearsal

`npm run rehearse:firmware:release` creates ignored
`dist/open-radio-core2-rc0/`. It contains source, generated assets, licenses,
locks, SBOM and notices. It intentionally excludes firmware binaries, build
caches, ESP-ADF, credentials and private station artwork. Nothing is published.

## Eligibility

- Project source: candidate under GPL-3.0-or-later with exact notices.
- Public binary: rehearsal only until hardware and corresponding-source gates.
- ESP-ADF artifact: private reference only.
- AAC/HE-AAC: excluded.
