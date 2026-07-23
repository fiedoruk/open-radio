# 113 — Release 0.2

[Wersja polska](113-release-0-2.pl.md)

**Purpose:** canonical closeout of the 0.2 public release (2026-07-22)
**Covers:** what shipped, the release-day defects and their evidence, the
artifact chain and what remains open
**Does not authorise:** further device writes or artifact changes

## What shipped

| | |
|---|---|
| Artifact | `https://fiedoruk.pl/os/open-radio-0-2.bin` (2 447 808 B) |
| SHA-256 | `87384342c32c2c7e1edd6ffaeb193d34d75ae01e1abb4db5dd9f7abd0ca6db62` |
| Source | tag **`open-radio-0-2`** → `358b13d` (lane `core2-public-candidate`) |
| License | GPL-3.0-or-later + written offer (`os/LICENSE-0-2.txt`) |
| Sources under offer | `dist/open-radio-0-2-corresponding-source.tar.gz` (+ `.sha256`) |
| Provenance | `output/firmware/public-0-2/MANIFEST.json` |
| Install | browser (esp-web-tools, Polish dialog) or esptool, full image at `0x0` |

0.2 over 0.1: the catalog of 218 measured stations as data with automatic
endpoint rotation, runtime station logos fetched by the device itself,
the browser station console with an on-device QR code, one image for owner
and customers alike, direct Wi-Fi reconnect, radio-first boot, the
nine-tile picker and the enlarged glance status card. Full architecture:
`docs/109`–`112`, `decisions/ADR-010`.

## The release day, honestly

The tag moved twice after the first cut, both times before any wider
announcement, both times for defects proven by serial evidence:

1. **`reason=alloc`** — every icon fetch requested 256 KB of contiguous
   PSRAM; next to a live stream, fragmentation denies that after about two
   fetches, forever. Fixed by one 96 KB buffer allocated at `begin()`,
   before the audio buffers carve PSRAM up.
2. **Redirects and tight TLS windows** — broadcaster favicon URLs answer
   301/302, which the fetch never followed, and 2-second TLS windows killed
   slower CDN fronts. Fixed by moving the fetch to its own low-priority
   task on the other core, with generous windows and redirect following.
3. **`reason=decode`** — LovyanGFX's float upscale rejected the one healthy
   icon SMALLER than the 96 px tile (Meloradio, 57×57). Fixed by native
   decode for sources ≤256 px plus the same integer cover resample the
   renderer uses.

Final hardware verdict, captured over serial on the release build during
the owner's own first-run walk: **nine logos out of nine in a single
pass**, stream start 1.2 s after runtime init, zero input underruns,
Bluetooth speaker connected in 3.1 s.

Also closed on release day: two minutes of boot silence traced to the
single Wi-Fi profile masking itself after one association timeout (now:
direct connect with no pre-connect scan, 6-second cut on rejected
associations, second chance before masking); the unprovisioned setup
portal idling out with no on-screen way back (now: it never idles out
before provisioning); the console session outliving a closed browser tab
(now: page heartbeat, station-pick close, bottom-button close).

## Open after release

- **B1 soak** (owner windows): long-run station switching on the release
  image, a real ceiling read from `input_bytes`, and two watch items from
  the day's logs — DRAM headroom during Bluetooth dialing (largest block
  fell to ~5 KB) and pairing-window retry cadence.
- **English installer page** carries updated artifact references but not
  the restructured Polish layout.
- The retired `rc*-retired.bin.bak` files parked in `os/` on the server.
- `core2-onboarding-only` lane does not build (pre-existing, outside the
  release path).

## Cross-references

- `docs/107` — release 0.1 (the model this release follows)
- `docs/109`–`112` — the four phases of 0.2
- `decisions/ADR-010` — runtime station logos and the legal position
