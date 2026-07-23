# Release 0.2.1 — release notes and known limitations

[Wersja polska](116-release-0-2-1.pl.md)

Open Radio 0.2.1 is the current public release: a same-evening hotfix of 0.2
(2026-07-22) that fixed the two first field reports within hours.

## What changed in 0.2.1

1. **Factory-fresh devices no longer boot-loop.** On a first boot the SPIFFS
   filesystem was formatted synchronously inside `setup()` under the 30-second
   task watchdog; slower flash chips never finished. The format now runs on
   the background logo task, off the watchdog and off the audio path, and a
   failed format degrades to monogram icons instead of blocking playback.
2. **Console-added stations no longer fail with HTTP 400.** Some directory
   mounts carried a `#fragment` suffix; the probe silently dropped it while
   the device sent it in the request line. Fragments are now stripped at
   every layer (catalog data, generator, stream source, test pins), which
   also heals slots saved by earlier versions.

## Artifact and provenance

| | |
|---|---|
| Download | `https://fiedoruk.pl/os/open-radio-0-2-1.bin` (2 448 160 bytes, flash offset `0x0`) |
| Full image SHA-256 | `295ca3fdf9f9daf7a11ee979bc3371b2c79aaf48de5afe455668b72b23dc0546` |
| App component SHA-256 | `98f0477a655cd42db42f6c806c059af9b8c33e6b0cd2eb6cd9b40d5fc1f44555` |
| Code cut | tag `open-radio-0-2-1` → commit `e4ec0c8d3e8a12407a983f6866e6be9750cfd6a8` |
| Canonical manifest | `release/release-0-2-1.json` |
| Corresponding source | published next to the binary; see `REPRODUCIBILITY.md` |

The tag is the immutable **code cut**. Release metadata recorded after the
tag (registry entries, field-confirmation notes, this document) intentionally
lives in later commits; the canonical manifest above binds the two together.
Byte-exact reproduction and its three required build parameters are described
in `REPRODUCIBILITY.md`.

## Hardware evidence

- Release-day smoke on the owner's Core2 v1.0: PASS (owner-attested).
- Independent field confirmation: an external user installed 0.2.1 from the
  browser on a factory-fresh Core2 v1.1 and reported it working
  (owner-recorded third-party report). Both hardware revisions therefore
  have field evidence.

## Known limitations

1. Bluetooth support is standards-based Classic A2DP/SBC — not universal.
   LE-Audio-only speakers are outside the Core2 hardware contract.
2. Battery duration, owner-measured on the device (2026-07-23): about
   2.5 hours of typical playback, close to three in favourable conditions
   (draw ~140 mA, ~190 mA at peaks; screen dimming changes little).
   Endurance and long-soak qualification of 0.2.1 remain open.
3. Station streams and broadcaster endpoints can change independently of any
   firmware release.
4. Station logo download is optional and PNG-only in this release; a few
   directory entries expose JPEG icons and fall back to monograms.
5. Known implementation risks are scheduled for the 0.2.2 maintenance
   release without touching 0.2.1: unsynchronized cross-core logo
   publication (formally undefined behavior; practical impact bounded to a
   skipped frame by write-once publication and renderer guards),
   redirect-origin validation on the favicon fetch, an unconditional RMF
   discovery prefetch, and embedded build-path/fixture strings in the
   binary image.
6. The station-picker browse list in the setup portal renders its first 80
   rows; the search box covers the full directory (the row counter shows the
   real total). A maintenance release lifts the browse cap and moves the
   search box next to its results.
7. No OTA: updates are an explicit local USB action, and installing a new
   release re-runs first-time setup.
8. No accounts, no telemetry, no project-operated backend; the complete
   outbound traffic classes are listed in `NETWORK-ENDPOINTS.md`.
