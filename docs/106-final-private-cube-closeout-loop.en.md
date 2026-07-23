# 106 — Final private cube closeout loop

[Polska wersja](106-final-private-cube-closeout-loop.pl.md)

**Purpose:** canonical, finite acceptance process for the owner's finished cube
**Applies to:** one M5Stack Core2, one intended A2DP/SBC speaker and the intended
USB-C/power-bank setup
**Does not authorize:** a device write, public release, package publication or a
universal Bluetooth compatibility claim

The dated
[2026-07-18 multivector audit](../hardware/FINAL-MULTIVECTOR-AUDIT-2026-07-18.pl.md)
is the incident record and evidence ledger. This document is the current
execution contract. It supersedes the execution queue in docs/99 and in dated
closeout reports whenever they differ.

## Four independent verdicts

| Verdict | Meaning | Current adoption state |
|---|---|---|
| `BT_FOCUSED_PASS` | Exact battery-header image `3e7a0cbd...` passed settled RMF, Radio ZET and return RMF; the return switch had one bounded ~1.41 s gap. | PASS, focused only |
| `PRIVATE_CUBE_FINAL` | The exact owner image passed the complete matrix below on this cube, intended speaker and intended power setup. | BLOCKED |
| `H4_PASS` | The exact final image passed recovery, resource and endurance gates with complete evidence. | BLOCKED |
| `PUBLIC_RELEASE_READY` | The separate public, logo-free MP3 lane passed its legal, source, reproducibility and compatibility gates. | BLOCKED and not a private-cube blocker |

A focused Bluetooth pass does not imply a full-cube pass. Private acceptance
does not imply public-release readiness.

## Frozen architecture and anti-regression rules

The random tuning tree is closed. The current owner lane preserves six fixed
properties:

1. **Bluetooth:** every A2DP profile open is single-flight and belongs to one
   observed attempt generation; stale callbacks cannot finish a newer attempt.
   This bounds the panic found inside
   `BTA_AvOpen -> connect_int -> btc_queue_connect_next`; it is not another
   retry-delay experiment.
2. **PCM:** before media starts, the decoder retains the fallback reserve. Once
   A2DP is active, the Bluetooth queue is the retained reserve, so the decoder
   cannot trap valid frames behind the `44,100 + 1,024` threshold.
3. **Wi-Fi and MP3:** one low-priority core-0 worker performs ICY reads and feeds
   a bounded 128 KiB PSRAM ring. The owner loop decodes and controls but no
   longer waits 500 ms on a socket. Short empty RMF input reads are diagnostics;
   failure means growing PCM/A2DP silence, stops or an owner-audible cut.
4. **Shared radio:** standard balanced coexistence stays frozen. Static
   `PREFER_WIFI` starved the A2DP transmitter, while scoped policy changes only
   moved the deficit. Do not return to modem-sleep, bitpool, AAC, resampling or
   scoped coexistence without new, unambiguous evidence.
5. **Stations and recovery:** a switch may contain one bounded open/prefill
   interval, but the settled window must have zero failure growth. A connected
   source must not be restarted merely for transient low water;
   `sustained-low-water` was a separate regression.
6. **Battery UI:** the PMIC is read only while Settings is visible, once every
   10 seconds. Percent and voltage come from the controller; time is a `~`
   estimate after three current samples. This path changes no audio, Bluetooth
   or Wi-Fi policy, but it changes image bytes and therefore needs its own
   focused QC.

Exact `94c25a9e...` remains recovery-only and a known failure. Image
`44e97929...` passed RMF -> ZET -> RMF, volume and a passive RMF hour. It is
preserved separately as `RESTORE_AUDIO_LKG`. UI-only `3e7a0cbd...` is the
distinct current `FLASH_OWNER_PRODUCTION` image and passed its own focused
RMF -> ZET -> RMF gate. The validator does not allow either image to be used in
the other's role; the older hour remains evidence only for its own hash.

Every future failure first selects one measured leaf: compressed input, PCM
decoder, BT queue, A2DP profile, Wi-Fi or UI/PMIC. One correction to that leaf
and one rerun are allowed. A second failure blocks the lane; it does not reopen
buffer, endpoint or coexistence roulette. Change DRAM, PCM or stack only after
evidence identifies a concrete allocation, overflow or monotonic loss.

## Final owner image

After all required candidates pass, create one dedicated owner-production lane:

- MP3-only playback with the current nine-station catalog;
- the reviewed local 9/9 logo pack;
- no HLS/AAC decoder and no lab serial-control surface;
- built-in speaker fallback and remembered Classic A2DP/SBC speaker;
- no runtime logo download, telemetry, OTA or private service dependency.

Its manifest records source commit, application SHA-256 and size, lane, renderer
and catalog identities, configuration schema, logo-pack digest, the single
behavior delta and the exact rollback. Build it twice and compare the resulting
application bytes before any device-write decision.

Every future write has a separate gate: clean committed image registry, exact
hash allowlisted and not quarantined, active application slot confirmed,
manifest shown to the owner, explicit approval for that binary, app-only write,
independent `verify_flash`, boot SHA check and a visual 9/9 surface check. The
current task or session never grants blanket flash permission.

## Physical acceptance matrix

Run the following once on the exact final owner image. Do not create a new image
between rows.

| Vector | Required result |
|---|---|
| Audio routes | Built-in speaker and intended Bluetooth speaker both pass; forced Bluetooth loss reaches local audio within 2 s and returns to Bluetooth within 30 s, 3/3 |
| Stream recovery | Forced stream loss/reopen succeeds 5/5 without reboot, stuck UI or permanent silence |
| Wi-Fi recovery | Loss/recovery succeeds 5/5 within 60 s; no unknown or open network is joined |
| Stations | All nine pass, including `Radio ZET -> another station -> Radio ZET` and the three RMF stations |
| Controls | Touch, volume, favourites and navigation remain responsive during stream, Wi-Fi and Bluetooth recovery |
| Configuration | Offline boot, later time sync and corrupt-config recovery pass; one destructive reset/re-onboarding trial requires separate owner approval and a restore plan |
| Hardware | Display, touch, speaker, battery bridge, charging, USB-C return, intended power bank and SD-present/SD-absent smoke pass |
| Enclosure | Final enclosure has clear audio/vents, usable controls and cable access; no excessive heat, thermal reset or power interruption occurs |
| Resources | No reset, panic, watchdog or OOM; no monotonic DRAM/PSRAM/largest-block decline; stack telemetry uses correct byte units and callback/owner-loop latency stays within its measured budget |
| Evidence | Exact SHA, complete periodic samples, `eventsDropped=0`, zero unplanned reset and owner-audible markers are present |

Counters are evaluated per boot epoch. Any mid-capture reboot invalidates a
first-to-last delta and fails the rung even if playback later recovers.

## Endurance ladder

The exact final image passes these rungs in order:

1. **60 minutes:** continuous playback with one forced stream recovery.
2. **2 hours:** continuous playback with one forced Wi-Fi recovery and one
   Bluetooth loss/fallback/return cycle.
3. **8 hours:** intended speaker and intended power-bank setup, including a
   controlled USB-C interruption bridged by the battery.

A passive 60 minutes without forced recovery is useful stability evidence but
does not complete the first H4 rung. A passive hour on a UI-only predecessor
does not transfer to the final hash; it only narrows focused QC for the new
image and supports an honest conditional day verdict.

Each run has owner-audible checks near the start, middle and end. Automatic
recovery is recorded but does not turn a reboot into PASS. Any firmware-byte
change restarts every affected rung from minute zero; documentation-only changes
do not.

A 24-hour soak and a second exact speaker model expand public/community
confidence. They are not blockers for this one private cube.

## Closeout package

Close production only when one commit contains or references:

- the final image manifest, exact hashes, verified private rollback and sanitized
  per-rung captures;
- the completed station, speaker, recovery, PMU/power, SD, enclosure and resource
  rows;
- updated `STATUS.md`, `CURRENT-MISSION.md`, the dated audit, speaker matrix,
  resource evidence and this document;
- `npm run check`, explicit PlatformIO owner-lane build, documentation parity,
  source rehearsal, privacy check and `git diff --check` results;
- a clean worktree and confirmation that capture/build processes and serial-port
  ownership are closed.

The closeout ends with four explicit verdicts: `BT_FOCUSED_PASS`,
`PRIVATE_CUBE_FINAL`, `H4_PASS` and `PUBLIC_RELEASE_READY`. Push, PR, public
binary and release remain separate owner decisions.

## Conditional day close and `exit`

The repository may close cleanly before full H4 completion when:

- the final exact image passes boot/digest, RMF -> ZET -> RMF, volume and
  owner-audible focused QC without a crash or growing silence;
- every unperformed recovery, power and endurance test remains explicitly
  `NOT_RUN`/`DEFERRED`, with `PRIVATE_CUBE_FINAL=false` and `H4_PASS=false`;
- documentation identifies which evidence belongs to the UI-only predecessor
  and does not transfer its hour to the new hash;
- the full repository gate, source rehearsal, `git diff --check`, simplify gate
  and clean worktree pass, and the capture process releases the serial port.

This state is `CONDITIONAL_QC_PASS`, not production H4. It permits a safe
`exit` with a working cube and closed repository while retaining one finite,
countable list of physical tests for a later session.

## Stop conditions and anti-loop rules

Stop immediately on a reboot, panic, brownout, watchdog, OOM, dropped evidence,
wrong GUI/logo/catalog, unknown network, permanent silence or owner-audible cut.
Record the exact image and first failing row; do not continue to collect a
nominal PASS.

Do not repeat historical whole-image bisection, buffer roulette, modem-sleep
disablement, monolithic decoder refill, feature/UI changes or multiple behavior
fixes in one image. Do not launch full endurance for an image that has not
passed its focused test and the short physical matrix. A blocked row stays
honestly blocked until its exact cause is fixed; it does not create an unbounded
search loop.
