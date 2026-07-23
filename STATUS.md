# Open Radio Core2 — status

**Updated:** 2026-07-23

**Current state:** `PUBLIC RELEASE 0.2.1 LIVE / HARDWARE-VALIDATED ON BOTH
CORE2 REVISIONS`

## Releases

- **0.2.1** — tag `open-radio-0-2-1`, the current public artifact
  `open-radio-0-2-1.bin` on `fiedoruk.pl/os/`. Same-evening hotfix for two
  field reports against 0.2: a factory-fresh cube could boot-loop while the
  logo filesystem formatted under the loop watchdog (format now runs on the
  background logo task), and four console stations were rejected because
  catalog URLs carried `#NAME` fragments the broadcaster's server refuses
  (catalog cleaned; the firmware also strips fragments, healing saved
  slots). Hardware-validated on the reference device before publication.
  Since 2026-07-23 the corresponding-source bundle is published next to the
  binary (`open-radio-0-2-1-corresponding-source.tar.gz`, SHA-256
  `e76ce6cc…`); the canonical release manifest is
  `release/release-0-2-1.json` and the release notes are
  `docs/116-release-0-2-1.en.md`.
- **0.2** — tag `open-radio-0-2`, superseded same day by 0.2.1; artifact
  `open-radio-0-2.bin` served from `fiedoruk.pl/os/` with its SHA-256 file,
  esp-web-tools manifest and `LICENSE-0-2.txt`. Corresponding source for 0.2 is
  fulfilled from the maintainer archive under the GPL written offer (the
  0.2.1 bundle is published next to the binary); provenance lives in `output/firmware/public-0-2/MANIFEST.json`
  (local build output, not tracked).
- **0.1** — tag `open-radio-0-1`, still downloadable as the previous release.
  Its public image was never smoke-tested on hardware; the 0.2 line
  (currently 0.2.1) is the validated path.

## Hardware evidence

**First independent field confirmation (2026-07-22, evening):** release
0.2.1 installed from the browser and confirmed working by an external user
on a factory-fresh **Core2 v1.1** (AXP2101) — hardware this project does
not own. The same user's earlier serial logs diagnosed both 0.2 field
bugs. Together with the owner's v1.0 (AXP192) reference device, both
hardware revisions of the Core2 are now validated in the field.

## Hardware evidence for 0.2

Measured on the reference device running the exact release bits: all nine
station logos fetched in one pass, first audio ≈1.2 s after network, the
remembered Bluetooth speaker reconnected in ≈3.1 s, zero underruns at start.
The device-action protocol, image registry and rollback checkpoints remain in
`hardware/approved-app-images.json` and `output/flashed/` (local).

## Software qualification

- Full host gate: `npm run check` — contracts, generated files, documentation
  parity, renderer determinism, firmware-host behavior, audio-surface freeze
  and source rehearsal all PASS.
- Release builds are deterministic: two independent clean builds of the
  release surface are byte-identical.
- Owner and public lanes are MP3-only (libmad); AAC and HLS remain excluded
  (license and measurement decisions, `docs/111`).

## Open risks and watch items

- B1 endurance soak on the release image is still pending: DRAM largest free
  block dipped to ~5 KB during Bluetooth dialing, pairing retries run on a
  15 s cadence, and station switches on the Bluetooth route accumulate input
  underruns. None of these has produced an audible failure on 0.2.
- Stations broadcasting only over TLS (e.g. Radio Nowy Świat) are outside
  the current plain-HTTP audio path; TLS audio is a 0.3 candidate. A
  2026-07-23 probe showed Radio 357's revma mount serves MP3 over plain
  HTTP through token-issuing redirects, making it a catalog candidate for
  the next maintenance release after a device test.
- The public repository is live: <https://github.com/fiedoruk/open-radio>
  (sanitized import per `decisions/ADR-012`; the first CI run passed both
  jobs, including the firmware compile).

## Product and release boundary

- Target: M5Stack Core2, normally USB-C powered, with the internal battery as
  a short outage bridge.
- Bluetooth claim remains Classic A2DP Source/SBC standards-based
  interoperability, never universal speaker compatibility.
- Built-in speaker remains the mandatory fallback.
- No account, project cloud, telemetry, recording, automatic OTA or routine
  remote catalog update is required.
- Broadcaster logos are never bundled into public artifacts; the device
  fetches them itself at runtime (`decisions/ADR-010`).
- Every public-artifact change is a separate owner-approved gate with backup,
  rollback and smoke evidence.

## History

The dated engineering history stays in the numbered documents and ledgers:
release closeouts `docs/107` (0.1) and `docs/113` (0.2), the stabilization
arc `docs/104`–`docs/106`, the Bluetooth recovery ledger
`hardware/BT-REGRESSION-RECOVERY-2026-07-18.md` and the final multi-vector
audit `hardware/FINAL-MULTIVECTOR-AUDIT-2026-07-18.pl.md`. Earlier revisions
of this file preserve the day-by-day measurement snapshots.
