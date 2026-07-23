# 107 — Public release 0.1

[Wersja polska](107-public-release-0-1.pl.md)

**Purpose:** canonical record of the first public binary release
**Covers:** the `open-radio-0-1.bin` artifact and its corresponding source
**Does not authorise:** device writes, a further release, an H4 pass claim, or
any statement that the public binary has been tested on hardware

This document records the factual state after the 2026-07-18 publication and the
2026-07-21 provenance verification. It supersedes earlier entries stating that a
public release remains blocked pending separate qualification — publication has
already happened.

## What was published

| Item | Value |
|---|---|
| Artifact | `open-radio-0-1.bin` |
| URL | `https://fiedoruk.pl/os/open-radio-0-1.bin` |
| Size | 2,316,112 B |
| SHA-256 | `a075693cbc401ebadfc222befc53b899d17e9df564d6277c28d51f434f77b671` |
| Form | merged full-flash from `0x0` (dio/40m/16MB) |
| Lane | `core2-public-candidate` — MP3-only, no broadcaster logos |
| Source | tag `open-radio-0-1` → `87aad39` |
| Published | 2026-07-18 ~23:30 CEST |

The public lane differs from the owner image only by removing the broadcaster
logo pack (202,688 B delta) and replacing it with letter placeholders. It does
not change the audio path, endpoints, Wi-Fi/BT coexistence or A2DP/SBC policy.

Executed under the owner's direction during a mid-day handover between the
project's engineering agents. Instructions and licence decisions: internal engineering report (not tracked).

## Image components

| Offset | File | Size | SHA-256 |
|---|---|---|---|
| `0x1000` | `bootloader.bin` | 17,536 B | `a23f2db3a09e9df581a397ade210cce2224b593f8ae563a28f75b5b9795f30b3` |
| `0x8000` | `partitions.bin` | 3,072 B | `bd0f7954aca2ef7d925ee21aaa1f3dc8822d1d6ce5cbbd26a135e5886bfff6ce` |
| `0xe000` | `boot_app0.bin` | 8,192 B | `f94c5d786a7a8fab06ac5d10e33bf37711a6697636dc037559ea19cc410a17f0` |
| `0x10000` | `firmware.bin` | 2,250,576 B | `26f9ea276d4b099947aa4209a8b6e5ae84c2ae0eee8c5ba1ab7d433547040786` |

## Provenance proof (2026-07-21)

The build artifacts survived in the `.pio` directory, which is volatile — any
subsequent `pio run` would overwrite them. They were archived into
`output/firmware/public-0-1/` together with `MANIFEST.json`.

The image was reconstructed locally from those components using the offset map
above (`0xFF` padding) and compared against the file **downloaded from the
server**. Result: **byte-identical**, same `a075693c…` digest. This binds the
published file to a specific source tree.

The verification does **not** include a deterministic rebuild from source; the
`87aad39 → firmware.bin` link rests on a clean working tree, the build
timestamp and the executor's record, not on a repeated compilation.

## Licence and obligation

The binary is released under **GPL-3.0-or-later**. The dependency graph forces
this — libmad and ESP8266Audio — so a proprietary licence for the whole was not
available. The adopted solution is a **written offer** to supply the
corresponding source on request (GPL §6b, form on `fiedoruk.pl`, three years),
plus protection of the "Open Radio" name. Text:
`https://fiedoruk.pl/os/LICENSE-0-1.txt` (PL+EN).

The obligation runs **from the moment of publication**. Material to satisfy it:

- `dist/open-radio-0-1-corresponding-source.tar.gz` — 460 files, including
  `scripts/build-firmware-public.sh`, `platformio.ini`, pinned manifests,
  `LICENSES.md` and `THIRD-PARTY-NOTICES.md`,
- its checksum in the adjacent `.sha256` file,
- a backup of the full history on the private `origin`, including the tag.

## What was not verified

1. **Hardware smoke** — the public binary has never physically run. The owner's
   cube runs image `659e56c…`, not this one.
2. **Deterministic rebuild** from source `87aad39`.
3. `release/rc1-candidate.json` still declares `published: false`,
   `hardwareValidated: false` and a historical `evidenceFirmwareSha256`.
4. H4, two- and eight-hour endurance and PMU/power-bank/SD remain deferred and
   **must not be presented as passed**.

## Reach

Download counter (`os/count.php`) on 2026-07-21: **88** downloads of the
artifact. The site also offers browser-based flashing through esp-web-tools, so
the entry barrier is low and recipients are not individually known.

Practical consequence: any further change to the public artifact is a T3-high
operation against an existing installed base, not a private change.
