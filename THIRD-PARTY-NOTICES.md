# Third-party notices

## Host software

The browser simulator and Node.js tests use project code and platform APIs. No
npm package is installed or bundled.

## GUI icon subset

The browser GUI Lab, the first-run onboarding portal and the simulator share
a local 21-icon subset of Tabler Icons `3.44.0`,
pinned to commit `6d128ed935d4546607b1e4d5d08c8b27bdbe7758`. Tabler Icons is
licensed under the MIT License. The exact notice is retained in
`ui-contract/icons/TABLER-LICENSE.txt`.

## Firmware

The exact pinned firmware graph, source filters, versions and licenses are in:

- `firmware/manifests/dependencies.lock.json`,
- `firmware/release/THIRD_PARTY_NOTICES.md`,
- `firmware/release/sbom.spdx.json`,
- `firmware/release/codec-bom.json`.

The public-candidate graph uses Arduino-ESP32, M5Unified/M5GFX, ESP32-A2DP and
the HTTP/ICY/MP3/libmad subset of ESP8266Audio. AAC and ESP-ADF binary codec
components are excluded from public artifacts.

No third-party station logo, jingle, recording or broadcaster artwork is part
of the public project license. The released 0.2.1 binary is hardware-validated
and ships with its corresponding-source bundle and these notices.
