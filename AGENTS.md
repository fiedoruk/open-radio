# Open Radio Core2 — project instructions

Working language with the owner: Polish. Source code, identifiers, commit messages
and canonical public technical documentation: English. Public user-facing
documentation must have maintained English and Polish versions.

## Product contract

- Target hardware: M5Stack Core2 with ESP32-D0WDQ6-V3, 16 MB flash and 8 MB PSRAM.
- Product form: a finished, single-purpose internet-radio cube, not an extensible app platform.
- Product: reliable internet radio for Polish stations, played through a remembered Bluetooth Classic A2DP speaker.
- Built-in Core2 speaker is the mandatory fallback and diagnostic output.
- Normal operation must not require an account, cloud service, phone or private backend.
- Autonomous self-configuration is the default: infer location, timezone,
  language/region candidates and safe defaults whenever possible, then ask only
  for information that cannot be derived reliably or corrected later.
- Direct, optional requests to documented public data services are allowed for
  self-configuration and display enhancements when they are failure-isolated,
  cached, replaceable and never become a playback or boot dependency.
- Normal operation must not require routine firmware, app or project-catalog updates.
- There is no automatic OTA. An optional manual USB recovery image may exist only as a disaster-recovery escape hatch.
- Power target: continuous USB-C power from a power bank; the internal battery acts as a short outage bridge.
- Default UI language is Polish; English is included from the first public release.
- Founder and original author: Tomasz Fiedoruk, `https://fiedoruk.pl`.
- Purpose: non-commercial proof of concept and open-source DIY reference for people building their own devices.

## Day-zero quality rules

- Reliability is more important than animations, metadata and feature count.
- The device must recover automatically from Wi-Fi, stream and Bluetooth loss.
- Remember multiple approved Wi-Fi profiles and automatically select a reachable known network.
- Never autojoin an unknown or open network. Unknown credentials and captive portals require local onboarding.
- Keep a last-known-good station catalog and configuration.
- Never depend on a remote catalog to boot or play the last working station.
- Prefer live resolution through official broadcaster surfaces over transient hard-coded CDN hosts.
- A failed endpoint is scored, backed off, temporarily quarantined and retried without blocking the UI.
- A failed Bluetooth speaker falls back to the built-in speaker while reconnect attempts continue at a bounded rate.
- No outbound analytics or telemetry by default. Internal measurements and
  diagnostics may use device/network facts locally; exported evidence must be
  explicitly redacted unless the user chooses otherwise.
- Support per-station colors and artwork slots from day zero.
- Do not open-license or publicly bundle third-party station logos without documented permission.
- Do not proxy, rebroadcast or record station audio.

## Scope boundaries

- Current mode: `RELEASED / MAINTENANCE`; public releases 0.1, 0.2 and the current 0.2.1 are live
  and every public-artifact change is a separate owner-approved gate.
- Browser simulator, host-side contracts, tests, catalog schemas and reproducible scaffolding are in scope.
- Firmware flash, serial-port access and hardware claims require the explicit owner device gate.
- Do not store Wi-Fi credentials, private endpoints or secrets in Git.
- Do not edit or remove another agent's working tree without explicit owner scope.
- Do not add OTA, mandatory/project-operated cloud, outbound analytics or
  automatic remote firmware/catalog updates. Optional direct public lookups for
  location, weather and time are allowed under the product contract above.
- Any public release, package publishing or device flashing requires a separate release/hardware gate.

## Compatibility language

- Never claim literal compatibility with every present and future Bluetooth speaker.
- The testable contract is Bluetooth Classic A2DP Sink interoperability using SBC and no mandatory AVRCP dependency.
- Bluetooth LE Audio-only speakers are outside the M5Stack Core2 hardware contract.
- Public claims must say `standards-based A2DP compatibility`, backed by a community compatibility matrix.

## Preferred implementation path

1. Reproducible PlatformIO environment with pinned versions.
2. M5Unified hardware smoke: display, touch, speaker, battery and SD.
3. One official MP3 stream to the built-in speaker.
4. Wi-Fi recovery and stream watchdog.
5. Bluetooth A2DP Source with one remembered speaker.
6. Built-in speaker fallback and minimal station UI.
7. Station catalog only after endpoint and operator review.

## Validation gate

- Every build records toolchain, dependency versions, firmware size and target.
- Every audio change must pass built-in speaker and Bluetooth output tests.
- Minimum endurance gate: 60 minutes playback, Wi-Fi reconnect, stream reconnect and speaker reconnect.
- Release gate later grows to 8-hour soak, power interruption and corrupt-config recovery.
- Code changes require formatting/static checks, focused tests and `git diff --check`.
- Public EN/PL documents changed in one language require a parity check in the same PR.
