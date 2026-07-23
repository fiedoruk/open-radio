# 104 — CC stabilization closeout and current ground truth (2026-07-17)

Polish version: [104-cc-stabilization-closeout.pl.md](104-cc-stabilization-closeout.pl.md)

**This document supersedes the resume instructions and audio-reserve models in
docs/99, docs/100 and docs/103.** Any earlier document that mentions a
147,456-frame fallback reserve, a "seven-eighths ring" standby target, a full
262,144-frame retry gate, or candidates `729444cc`/`0d62d10b`/`0c673848` as
"current" describes a superseded state. When documentation and code disagree,
the code comments in `public_audio_pipeline.hpp` and `main.cpp` win.

## Owner-accepted state

- Device candidate lineage: `88561ba7` (owner-accepted working baseline) and
  successors on the same reserve model, lane `core2-hardware-lab`; every
  flashed image is archived in `output/flashed/<sha256>.bin`.
- Historical LKG `729444cc…` (recovered from an APFS snapshot after loss;
  see the internal binary-recovery record) is an emergency artifact from the OLD
  reserve era, not a first-choice rollback.
- Verdict basis: `output/hardware-soaks/2026-07-17T*` captures — zero local
  starvations, zero pull watchdog trips outside the real dead-speaker event,
  speaker power-cycle recovery to media in 20.8 s, owner listening checks.

## The physics every future change must respect

After its CDN burst a live stream delivers exactly 1x realtime, so during
playback `decoded + BT queue` can never exceed the burst equilibrium
(~98,304 frames measured; station dependent). Deep buffers seen before
2026-07-17 were financed by a monolithic decode slurp that froze the owner
loop (dead touch). Consequences, fixed in code:

| Mechanism | Value | Where |
|---|---|---|
| Decoder budget per owner loop | 8,192 frames | `DecoderQueueOutput::ConsumeSample` |
| Local fallback reserve floor | 44,100 frames (1 s) | `kBluetoothFallbackReserveFrames` |
| Standby (pre-media) target | 88,200 frames (2 s) | `kBluetoothStandbyReadyFrames` |
| Retry decoded-reserve gate | 44,100 frames (1 s) | `kBluetoothRetryDecodedReserveFrames` |
| Recovery cadence | randomized 8–20 s (intentional jitter) | `kBluetoothRecoveryMin/MaxDelayMs` |
| Dirty-dial watchdog | 6,500 ms, local fallback, await stack | `kBluetoothDirtyAttemptAbortMs` |
| Dial-phase page-scan darkness | connectable(false) during every dial | `set_scan_mode_connectable_default` override |

Root causes closed on 2026-07-17: monolithic decode-refill stalls (touch
death), stale-page-timeout killing inbound-won sessions ~5.13 s after dial
start, and reserve gates set above the burst equilibrium (dial deferred for
minutes). Details: internal engineering reports (not tracked) and the code
comments, which are self-contained.

## Also current

- "Teraz gra → Zapisz" works on every station: the now-playing title is
  seeded with the station display name on selection and a real ICY
  StreamTitle overwrites it.
- Station picker uses brand-colour tiles with a square logo slot; the
  hardware-lab lane may embed a baked multi-size station logo pack
  (`OPEN_RADIO_HAS_LOGO_PACK`); the public lane keeps initial placeholders
  and `bundled_artwork=0`.
- Boot prints `boot build_sha=` (repeated with each periodic report) and
  `boot reset_reason=`, both on the capture allowlist.
- Speaker discovery accepts by Class-of-Device (RENDERING|AUDIO) during an
  explicit user scan; there is no model-name allowlist.
- The station artwork download feature was removed in S26 at the owner's
  request; its replacement is the baked logo pack above.

## Process rules in force

One change → full gate → flash (auto-archives) → 300 s capture with
max-loop < 1.5 s outside station switches, zero starvations, zero watchdog
trips, owner listening check. No new features until H4 closes. The archive
hook and the LKG directory are untouchable.
