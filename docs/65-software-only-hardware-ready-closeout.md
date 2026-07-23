# 65 — Software-only hardware-ready closeout

> Historical pre-integration snapshot. Current status is in
> `docs/88-final-pre-hardware-audit.en.md` and its Polish counterpart.

## Scope

This closes the complete autonomous software-only program. It is not another
incremental loop. The reviewed candidate is now preserved for physical Core2
validation, and no host model may be used to manufacture hardware evidence.

No serial command, device read, erase, flash, network connection, release
publication or public compatibility claim was performed.

## Integrated candidate

- The platform-neutral RGB565 renderer is linked into the public Core2 target.
- A bounded deterministic Inter 600 atlas renders the declared PL/EN character
  set; malformed UTF-8 falls back without reading out of bounds.
- The 320x240 framebuffer is allocated in PSRAM and sent to the M5 display only
  for a valid now-playing snapshot.
- Empty or corrupt storage produces configuration-required or safe-mode state.
  The device entry point does not synthesize successful Wi-Fi, resolver, stream
  or Bluetooth facts.
- Retry and quarantine policy uses monotonic device time. RC1 has no NTP client,
  endpoint or startup dependency.

## Reproducible evidence

- Renderer framebuffer hash: `5d28e89ebafe0639`.
- Renderer native cases: 6.
- Node cases: 120.
- Firmware host cases: 90 across five binaries.
- Public Core2 static RAM: 81,060 bytes.
- Public Core2 application flash: 1,292,261 bytes.
- Public `firmware.bin`: 1,298,832 bytes.
- Two clean public builds SHA-256:
  `0b09b88bdd50dbd8b606bdbb0c14f97492b25b39397226f63058938ca726dbaf`.
- Five build-only Core2 variants compile from the same pinned graph.

## Hardware-arrival package

The H0 packet is machine-checked without device I/O. It requires a complete
16 MiB factory readback before any write, a private ignored backup directory,
SHA-256 evidence and verified rollback at offset zero. Erase commands are
forbidden from the prepared first-pass procedure.

The first speaker records are:

1. Xiaomi Sound Pocket `MDZ-37-DB` — primary candidate.
2. MOZOS Outdoor-Xtreme — secondary candidate; read the exact revision from its
   physical label before pairing.

Both remain `NOT_MEASURED` for Bluetooth Classic A2DP Sink and SBC. Product
language remains standards-based A2DP compatibility, never universal speaker
compatibility.

## Repository boundary

The private GitHub repository and SHA-pinned read-only CI are active. GitHub
branch rulesets cannot be enabled for this private repository on the current
account plan, so CI and review discipline remain the available controls. This
does not change source or hardware readiness and must not be represented as
protected-branch enforcement.

## Simplify Gate

Verdict: `PASS WITH RISKS`.

- No duplicate renderer path remains in the public firmware entry point.
- No synthetic success state remains at boot.
- No automatic update, cloud, telemetry or NTP dependency was introduced.
- Physical display/touch, local audio, A2DP/SBC, coexistence, heap/stack,
  callback latency, underruns, power interruption and endurance remain
  `NOT_MEASURED`.

## Exact next program

1. H0: identify the Core2 and read/hash the complete factory image.
2. H1: validate display, touch, built-in speaker, battery bridge and A/B storage.
3. H2: play one official MP3 stream locally and force Wi-Fi/stream recovery.
4. H3: qualify Xiaomi and MOZOS with fallback, reconnect and coexistence tests.
5. H4: run the 60-minute, 2-hour, 8-hour and then 24-hour soak ladder.

H0 serial access and the first flash require a separate owner confirmation.
Public release remains a later, separate gate.
