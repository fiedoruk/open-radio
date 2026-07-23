# Bluetooth regression recovery plan and execution ledger — 2026-07-18

**Status:** `94C RESTORED / FENCED 94C CANDIDATE BUILT / PHYSICAL GATE OPEN`
**Starting source:** `9ec3fa6b8f0afdccdbc3f907c17c8be971371ff9`
**Working branch:** `codex/final-94c-fenced`
**Target:** M5Stack Core2, private `core2-owner-production` lane
**Primary objective:** identify and remove the general Bluetooth audio regression,
including steady-state cuts that occur without a station change.

This ledger is the canonical rollback and decision record for the 2026-07-18
hardware session. Public-release, universal speaker-compatibility and H4 claims
remain out of scope. Serial-port identifiers, device addresses, Wi-Fi data,
resolved private endpoints and full-flash backup hashes must remain in ignored
private evidence only.

## Live production update — 18:48 CEST

The owner clarified that the controlling regression boundary is the exact image
immediately before `a7ed7f15...`: `94c25a9e...` from source `44f19e4...`.
The later `91bf973c...` image made RMF likely clean but Radio ZET audibly
distorted, so it is quarantined on the owner's unmonitored audible verdict.

App0 has been restored to exact `94c25a9e...` and independently digest-verified.
It is only a playback checkpoint: its focused 600-second RMF result remains
valid, but its 60-minute profile-open panic prevents a stable verdict.

One bounded successor is now approved for an exact app0 qualification write:
source `17a4723...`, image `7b6f44b1...`, 2,441,040 bytes. It restores the
complete MP3 playback behavior of `44f19e4...` and adds only the Bluetooth
profile-open single-flight/generation fence, UTC RTC persistence and the large
Wi-Fi QR. AAC, resampling, bounded-SBC wrapping, scoped refill/coexistence,
low-water endpoint policy and later discovery/network rewrites are absent.
The source passed 208/208, the focused matrix 19/19, the executable profile gate
5/5 and two byte-identical clean builds. Physical RMF/ZET/switch qualification
is still open.

## Historical live production update — 18:19 CEST

The earlier `94c25a9e...` endurance failure below remains valid historical
evidence, but it is no longer the application running on the cube. The current
exact app0 image is `eda2c800729f73776d1b811f3d560d0513d259550a6eaa5c7d2693433a8dc84f`,
2,529,360 bytes, built from `ecf05b51fdec4e20d26f72c5133a5106ff7ac32b`.

The finite sequence after the original failure was:

1. fence every Bluetooth profile-open source under observed attempt
   generations;
2. move RMF discovery away from the audio owner loop and require sustained
   stream health before persistence;
3. fix the asynchronous Wi-Fi scan timeout;
4. select the private official RMF 48/64 kb/s AAC deck, apply an exact 2x
   resampler and persist RTC in UTC only after fresh SNTP;
5. prove that balanced coexistence still starved RMF, while historical static
   Wi-Fi preference starved downstream A2DP;
6. prove that scoped Wi-Fi refill alone improved but did not close the deficit;
7. limit the owner image's SBC encoder bitpool to 32, which made RMF stable but
   exposed ZET MP3 ingest below real time after switching;
8. extend the same bounded one-refill/12 ms dwell to direct MP3 and restore the
   large QR on the additional-network path; the QR source gate passed, but ZET
   MP3 still produced below real time;
9. close the MP3 tuning branch, restore AAC-only refill and select the official
   Radio ZET 64 kb/s AACp redirect in the private lane, with MP3 fallback.
10. prove that the later sustained-low-water policy was restarting a live
    decoder without a source death, then restore the clean `94c25...` playback
    semantics while retaining later Bluetooth recovery fencing and AAC fixes.

The failed images `a7ed7f15...`, `c74a1e14...`, `a7ca0279...`, `f2b89803...`
and `726e1067...`, `e4672973...`, `fbfc977f...` plus `eda2c800...` are all
quarantined. At that point the recovery-only `94c25a9e...` and candidate
`91bf973c...` were flash-allowed; the later audible ZET failure superseded that
approval.

The exact `fbfc977f...` candidate passed its software/build/flash gates but
failed physical ZET: 32 starts/stops, disconnected source and 275,114 active
plus 1,661,382 idle silence frames. Refills produced about 186 ms of audio in
commonly 200–878 ms. No reset or panic occurred. The final AAC source has passed
23/23 focused tests and the complete 212/212 repository gate. Two clean builds
produced byte-identical exact image `eda2c800...`, but physical RMF and ZET both
cut. Its RMF evidence showed periodic restarts while decoder refills continued
and no source-death event occurred. Commit `f7467bb...` removes only that
proactive restart. Two clean builds produced byte-identical `91bf973c...`, now
the sole approved owner candidate; guarded flash is next.

## Owner authorization and boundaries

The owner explicitly connected the cube and authorized guarded monitoring,
controlled flashing, iterative measurements and corrective implementation.
Every device action still uses `ESP32_ALLOW_DEVICE_ACTION=1`; every flash also
uses `CONFIRM_FLASH=YES`. No erase-all operation is allowed.

The work stops immediately on any of these conditions:

- ambiguous USB device or flash identity;
- missing or invalid 16 MiB full-flash rollback image;
- boot loop, repeated watchdog reset, corrupt display or unusable touch;
- loss of remembered configuration after an app-only image change;
- credential, device-identity or private-endpoint leakage in evidence;
- a change that cannot be mapped to one commit and one rollback action.

## Immutable image set

| Role | Source | Exact firmware SHA-256 | Size | Purpose |
|---|---|---|---:|---|
| Current failing image | `b198e0a5854c7fb972a8e5122bc4a1cedecf8bcd` | `6b01752fd9d20a540469693cfd3ccacd0589468a4313fef6d17041023c0b804d` | 2,528,992 B | Reproduce current steady-state and switch failures |
| Historical exact LKG — quarantined | `ecd69dd18364a7233e7874d4040a1a30cd1b4a3e` | `729444cc8343ed025837a63ab8673c6e364eec4ba324bf5266feea982ec6b5d5` | 2,376,960 B | Never flash again: it changes the GUI/artwork product surface as well as audio behavior |
| Midpoint — quarantined, never flashed | `735b616b0bc25995d6e585e5c2fa16ae8acdd06b` | `88561ba7348958f2fbae59821150cce624e104a207f1af441399c972ad5dc562` | 2,321,584 B | Never flash: it is not a controlled audio-only comparison against the current product surface |

No rebuilt image inherits the verdict of an archived image, even when built from
the same source commit. Historical whole-application images are no longer valid
comparison candidates because they also change the visible product surface.

## Proven facts before live execution

1. A station change stops the pipeline, clears decoded PCM and explicitly clears
   the Bluetooth PCM queue while the A2DP media route can remain active.
2. The A2DP callback pads every queue underrun with zero PCM and always returns a
   complete frame request.
3. QC-9 accumulated 2,962,560 active and 4,188,160 idle zero-PCM frames after
   Bluetooth media start, plus 10 unexpected stream stops and 448 source events.
4. QC-9 did not test `Radio ZET -> another station -> Radio ZET`; Radio ZET's
   clean label covered only the initial prefilled Bluetooth start.
5. Cuts also occurred without a station switch: in the final unchanged station
   window, 834–894 s, zero PCM grew by about 17.5 seconds.
6. The current code documents 12–14 KB/s TCP delivery under adverse coexistence,
   below the 16 KB/s required by 128 kb/s MP3.

These facts prove that station switching is one trigger but cannot be the whole
general steady-state root cause.

## Closed diagnostic tree

Every audible failure must terminate in one of four leaves:

1. **PCM starvation without a source death.** Bluetooth zero-PCM counters grow,
   decoded/BT queues drain and stream-stop counters stay flat. This implicates
   steady transport/decode throughput, reserve ownership or drain scheduling.
2. **PCM starvation with source recovery.** Zero-PCM counters grow together with
   `stream_stops`, `stream_starts` or `source_events`. This implicates endpoint
   transport plus the 2 s/8 s recovery loop that clears and restarts the pipeline.
3. **Downstream A2DP transmission failure.** Audible cuts occur while zero-PCM
   counters stay flat and both queues remain supplied. This implicates A2DP TX,
   Wi-Fi/Bluetooth arbitration, CPU scheduling or the exact speaker link.
4. **External/source-only failure.** The same failure is audible on the built-in
   speaker, or follows only an endpoint/RF/speaker change. This implicates the
   broadcaster edge, local RF environment or external hardware.

No tuning change is allowed until a capture selects one leaf.

## Measurement sequence

### Phase A — guarded preflight and rollback

1. Redact and record the single detected Core2 port.
2. Run guarded `chip_id` and `flash_id`; require ESP32 and 16 MiB flash.
3. Verify the existing full-flash backup is exactly 16,777,216 bytes and passes
   its stored SHA-256 check. Do not overwrite it.
4. Verify the three archived application images against the immutable table.
5. Confirm there is no competing serial monitor or flash process.

### Phase B — current-image steady-state classification

Run separate captures so a station transition cannot contaminate the measured
steady window:

1. Radio ZET: boot/BT settle, select station index `1`, then at least 300 s with
   no further command.
2. RMF FM: boot/BT settle, select station index `0`, then at least 300 s with no
   further command.

For each capture record exact image hash, reset reason, route, decoded and BT
queue levels, active/idle zero PCM, stream starts/stops/failures, source events,
loop/audio maxima, memory minima and owner audible verdict.

### Phase C — current-image switch trigger

After a stable Bluetooth start, execute exactly:

1. Radio ZET (`1`) for 300 s;
2. Meloradio (`3`) for 300 s;
3. Radio ZET (`1`) again for 300 s.

The return-to-ZET window is independent from the initial prefilled ZET window.

### Phase D — historical-image comparison (abandoned)

Do not flash the exact LKG or any other historical whole-application image.
The exact LKG was briefly flashed once, which exposed the old GUI and missing
current logo pack; the comparison was stopped before a valid RMF/A2DP result.
The exact current image was then restored and verified. Further attribution
must use source history, executable host models and current-surface audio-only
candidates.

### Phase E — midpoint comparison (cancelled)

The midpoint was never flashed and is permanently excluded. No whole-image
binary bisection is authorized by this plan.

### Phase F — minimal corrective loop

1. Implement one correction that directly matches the selected leaf.
2. Add an executable host regression test; source-text assertions alone are not
   sufficient for station-transition or queue-ownership behavior.
3. Run focused checks, build `core2-hardware-lab`, record toolchain/dependency
   versions, firmware size and SHA-256.
4. Flash through the guarded path and run the exact failing scenario first.
5. On failure, archive evidence and return immediately to the preceding known
   image; do not stack a second behavioral change.
6. On pass, repeat once, then run the 60-minute MP3-to-A2DP gate with one forced
   stream recovery, Wi-Fi recovery and speaker reconnect before any closeout.

Before any future firmware write, present an owner-facing candidate manifest
containing the exact source commit, firmware SHA-256 and size, current GUI
identity, current logo-pack presence, station-catalog identity, config schema,
the single audio behavior changed and the exact rollback image. A new explicit
owner confirmation is required after that manifest; the earlier session-wide
authorization is not sufficient.

## Pass and fail rules

A focused scenario passes only when all are true:

- owner reports no audible cut after the settle boundary;
- `bt_active_silence_frames` and audible-route `bt_idle_silence_frames` do not
  increase after the settle boundary;
- no unexpected stream stop or watchdog occurs unless intentionally injected;
- decoded and BT queues recover rather than trend toward zero;
- no reset, local fallback loss, touch freeze or memory monotonic decline occurs.

`CAPTURE COMPLETE` means only that evidence collection completed. It is never an
audio PASS by itself.

## Rollback model

Three rollback layers are maintained:

1. **Source rollback:** every behavioral edit is one local commit. Revert that
   commit; never discard unrelated owner work.
2. **Application-image rollback:** flash an exact archived application image at
   the established app offset, verify bytes after write and preserve NVS.
3. **Full-device rollback:** if boot/config/partition integrity is lost, use the
   verified private 16 MiB backup through `core2-device-action.sh rollback`.

The private evidence ledger records the actual port, backup verification, flash
commands, image hashes and capture paths. Public Git records only redacted facts.

## Execution ledger

| Time (CEST) | Step | Result | Rollback/checkpoint |
|---|---|---|---|
| 2026-07-18 10:28 | Session initialized | Owner authorized guarded hardware loops; starting worktree clean at `9ec3fa6`; one USB serial device detected; no competing monitor/flash process | Branch `codex/bt-regression-2026-07-18`; no device write performed |
| 2026-07-18 10:31 | Immutable evidence verified | Full-flash backup is exactly 16,777,216 B and passes its stored checksum; current, LKG and midpoint application images match the hashes and sizes in this plan | Existing private full-flash backup remains untouched |
| 2026-07-18 10:31 | Guarded H0 preflight | ESP32-D0WDQ6-V3 revision 3.1, 40 MHz crystal and 16 MB flash detected through the redacting wrapper | Read-only probe completed; device hard-reset by esptool, no flash write |
| 2026-07-18 10:34 | Evidence collector upgraded | Schema v2 retains every sanitized memory/audio/loop sample, retains up to 4,096 events with an explicit drop count and accepts bounded audible/steady markers; 5/5 focused tests and the complete 198/198 Node suite passed | Host-only change; no firmware or device write; RC1 lock refreshed to 426 files |
| 2026-07-18 10:42 | Current Radio ZET steady-state | Selecting ZET injected 64,896 zero frames (~1.47 s); the following 300 s added zero silence, stops or source events and both queues stayed full | Current image retained; switch hole confirmed separately from steady-state behavior |
| 2026-07-18 10:49 | Current RMF FM steady-state | Owner heard continuous cuts. After the initial reopen, a 121 s interval with no new source event added 1,552,512 active zero frames (~35.20 s); decoded stayed at 44,801 while BT stayed at 2,816–6,272 | General starvation leaf selected; capture stopped early after sufficient proof; no device write |
| 2026-07-18 10:53 | Exact-image flash guard prepared | Guard accepts only archived non-symlink images with caller-provided SHA-256, a 6.4 MiB app0 limit, verified full backup, explicit flash confirmation, app-only write at `0x10000` and readback verification | Negative confirmation/hash/path tests passed; no device write |
| 2026-07-18 10:57 | Invalid historical LKG comparison | Exact `729444cc...` / source `ecd69dd` was flashed to app0 and exposed the old GUI without the current logo pack; the comparison was stopped without a valid RMF/A2DP verdict | Process error acknowledged; midpoint was not flashed; historical whole-image comparisons permanently quarantined |
| 2026-07-18 11:00 | Exact current image restored | Exact `6b01752f...` / source `b198e0a` was written to app0; an independent `verify_flash` reported a digest match | app0 restored byte-for-byte; NVS, bootloader, partition table, OTA metadata, app1, SPIFFS and coredump were not flashed |
| 2026-07-18 11:04 | Restored boot identity verified | Read-only 90 s capture completed with `boot build_sha=b198e0a...`, artifact `6b01752f...`, Bluetooth route active and zero dropped events | No monitor, esptool or flash process remains; serial port released |
| 2026-07-18 11:14 | PCM starvation correction built | Commit 44f19e4 removes the decoded-only floor after A2DP becomes active while retaining the 44,100-frame standby reserve; executable host test reproduces decoded=44,801 / BT=2,816 and proves the ordered transfer | 7/7 firmware contracts, 18/18 focused fault-matrix checks and full 198/198 repository gate passed; GUI/renderer/catalog unchanged from b198e0a |
| 2026-07-18 11:19 | Exact corrected candidate flashed | Exact 94c25a9e..., 2,528,976 B, source 44f19e4..., logo-pack hardware-lab lane | app0-only write at 0x10000; independent verify_flash digest matched; `6b01752f...` was the immediate byte checkpoint at this moment, but is now quarantined; `94c25a9e...` is retained only as the exact current-surface recovery image after its later endurance FAIL |
| 2026-07-18 11:22 | Corrected RMF live checkpoint | A real source drop occurred before 115 s (stream_stops=1, source_events=17), but active/idle zero PCM remained 0/0; at both 175 s and 235 s decoded was 262,144 and BT was 260,864 | Candidate remains under uninterrupted owner-audible and counter soak; no additional firmware change |
| 2026-07-18 11:28 | Corrected RMF 600 s capture | Exact 94c25a9e..., build 44f19e4... completed 600 s with 10 audio samples and zero dropped evidence events; one real source stop and 17 source events caused zero active or idle silence frames | Owner reported RMF audio OK without breaks during the final observed window; focused RMF verdict PASS; the then-pending 60-minute gate later failed as recorded below |
| 2026-07-18 12:36 | Passive RMF 60-minute capture | Exact `94c25a9e...` completed 3,600 s with 63 memory samples, 60 audio samples, 797 events and zero dropped events; pull-watchdog at 2,573,621 ms was followed by `ESP_RST_PANIC` at 2,594,295 ms, then post-reboot stream starvation added 2,411,520 active silence frames | Endurance FAIL; global first/last counters rejected across the reboot and evaluated as two boot epochs; no firmware write occurred |
| 2026-07-18 12:44 | Panic coredump decoded read-only | The 64 KiB flash coredump was read without a write and decoded against the exact `94c25a9e...` ELF; BTC task was in `BTA_AvOpen -> connect_int -> btc_queue_connect_next`, while the crashed top context had an invalid PC | Failure narrowed to A2DP profile-open recovery; exact assert/instruction remains unproven; raw memory remains private and outside Git |
| 2026-07-18 13:05 | Recovery ownership and network work closed | Profile-open fencing, off-owner-loop RMF discovery, sustained stream health and the guarded owner-production lane passed the full host gate | Recovery image retained; no physical verdict inherited by the new lane |
| 2026-07-18 13:35 | Async Wi-Fi scan candidate | Driver timeout headroom restored playback startup, but RMF MP3 still starved under A2DP | `a7ed7f15...` and `c74a1e14...` quarantined for distinct failures |
| 2026-07-18 15:40 | Private RMF AAC candidate | Official 48/64 kb/s AAC reduced input demand, but generic resampling/RTC behavior produced silence and a +2 h display regression | `a7ca0279...` quarantined; no H4 claim |
| 2026-07-18 15:56 | Exact 2x resampler and UTC RTC candidate | Software/time defects corrected; physical RMF still restarted and starved under balanced coexistence | `f2b89803...` quarantined; time fix retained in source but awaits exact-image visual confirmation |
| 2026-07-18 16:15 | Scoped Wi-Fi refill candidate | Improved live ingestion but intermittent A2DP starvation remained | `726e1067...` quarantined; both ends of the coarse coexistence compromise considered closed |
| 2026-07-18 16:25 | Bounded-SBC candidate flashed | Exact `e4672973...`, source `3b5d27b...`, app0-only write and post-write verification; pinned SBC selection limited to bitpool 32 only in owner-production | Recovery image and full backup remain unchanged |
| 2026-07-18 16:38 | Focused steady RMF evidence | Completed 180 s, 3/3 audio samples, zero counter delta for stops/restarts/active silence/watchdogs, both queues near full, no reset/panic | Counter PASS; audible and switch verdicts still pending; 60-minute H4 started |
| 2026-07-18 17:17 | Bounded-SBC switch evidence | RMF stayed stable for about 30 minutes; ZET MP3 refills then produced less audio than elapsed refill time, queues drained and cuts followed; volume events occurred after zero; reselection recovered | `e4672973...` quarantined; exact missing MP3 coexistence slice identified |
| 2026-07-18 17:30 | Combined final image flashed | Exact `fbfc977f...`, source `a47f6a6...`; scoped refill covers direct MP3/AAC and both Wi-Fi setup paths render the large QR | app0-only write and independent digest verification PASS; physical QC running |
| 2026-07-18 17:42 | Combined image physical failure | ZET reached 32 starts/stops, source disconnect, 275,114 active and 1,661,382 idle silence frames; 8,192-frame refills produced ~186 ms PCM but commonly took 200–878 ms | `fbfc977f...` quarantined; generalized MP3 refill branch closed |
| 2026-07-18 17:50 | Final bounded source prepared | Private ZET selects the official 64 kb/s AACp redirect first, keeps independent MP3 fallback and restores refill scope to AAC only; QR fix retained | focused fault matrix 23/23 and full 212/212 gate PASS; exact build pending |
| 2026-07-18 17:54 | Exact final AAC image approved | Source `ecf05b5...`, exact `eda2c800...`, 2,529,360 B; two clean builds byte-identical; AAC and SBC wrapper present, HLS/lab absent | `fbfc977f...` registry-quarantined; fresh preflight and app0-only flash next |
| 2026-07-18 18:04 | Exact AAC image physical failure | Five-minute RMF evidence reached five starts and four stops while decoder refills remained `running`; owner heard RMF and ZET cuts | `eda2c800...` rejected; no QR or recovery claim inherited |
| 2026-07-18 18:10 | Regression identified | `705cf68...` had added proactive `sustained-low-water` failure after the clean 600-second `94c25...` checkpoint; it killed a connected stream without source death | One minimal source change authorized; no buffer, endpoint, PCM or coexistence tuning |
| 2026-07-18 18:19 | Minimal successor approved | Source `f7467bb...`, exact `91bf973c...`, 2,529,296 B; 212/212 gate and two byte-identical clean builds PASS | `eda2c800...` quarantined; later ZET audible distortion rejected this candidate |
| 2026-07-18 after 18:19 | `91bf973c...` physical rejection | Owner reported RMF likely clean, then audible Radio ZET distortion | Exact image quarantined; no counter claim because monitoring was intentionally closed |
| 2026-07-18 after rejection | User-selected boundary restored | Exact recovery image `94c25a9e...`, source `44f19e4...`, restored app0-only and independently digest-verified | Current playback checkpoint; known 60-minute panic remains |
| 2026-07-18 18:48 | Fenced-94c successor approved | Source `17a4723...`, exact `7b6f44b1...`, 2,441,040 B; 208/208, 19/19, BT gate 5/5 and two byte-identical builds PASS | Fresh preflight and app0-only physical RMF → ZET → RMF gate next |
| 2026-07-18 19:32 | Exact 94c assumption closed | Back-to-back RMF captures made fenced `7b6f44b1...` fail and exact recovery `94c25a9e...` fail worse; slow socket reads were condition-dependent and serial with decode | Both images rejected as playback baselines; one bounded async-input ownership correction authorized |
| 2026-07-18 19:35 | Async-input image flashed | Source `f243453...`, exact `44e97929...`, 2,442,368 B; fresh layout/active-app preflight, app0-only write and independent digest verification PASS | Recovery `94c25a9e...` and full private backup preserved |
| 2026-07-18 19:39 | Focused RMF | Settled 300 s added zero stream stops, output silence, watchdogs, fallbacks, resets or panics; 889 compressed-ring empty reads were absorbed by stable staged PCM | Counter PASS; no endpoint/codec/coexistence edit |
| 2026-07-18 19:47 | Focused Radio ZET | Settled 300 s added zero compressed underruns, output silence, stops or watchdogs; input ring remained about 106–109 KiB | Counter PASS after the bounded switch/prefill interval |
| 2026-07-18 20:01 | Return to RMF | Settled 300 s added zero output silence, stops, watchdogs or fallbacks despite 909 compressed empty reads; owner subsequently reported the lower-volume RMF as `ok` | RMF → ZET → RMF focused path PASS for exact `44e97929...` |
| 2026-07-18 20:12 | Raised-volume RMF | Settled 300 s kept compressed, decoded and BT queues full with every failure delta zero; owner reported `idealnie` | Volume correlation closed as non-cause on this candidate |
| 2026-07-18 20:17 | Passive RMF endurance started | Exact `44e97929...` entered a 3,600 s no-intervention capture after the focused matrix | Architecture evidence only if a later UI-only image changes the exact hash |
| 2026-07-18 20:31 | Owner-requested battery surface built | Source `791ebd4...`, exact `3e7a0cbd...`, 2,448,816 B; PMIC data is settings-only at 10 s cadence; 210/210, renderer 18/18, fault matrix 21/21 and two byte-identical owner builds PASS | New exact image requires its own focused physical QC |
| 2026-07-18 20:46 | Audio/UI images separated | Exact `44e97929...` retained only as `RESTORE_AUDIO_LKG`; exact `3e7a0cbd...` retained only as `FLASH_OWNER_PRODUCTION`; registry validator tests PASS | Commit `20065a8...`; wrong image/purpose pairing fails closed before device access |

## Current verdict — async audio passed; battery-header exact image awaits focused flash

`ASYNC INPUT FOCUSED PASS / BT RECOVERY FENCED / UI-ONLY FINAL HASH BUILT`:
current app0 is exact `44e97929...` and is completing its passive RMF hour. Its
RMF → ZET → RMF plus volume matrix is counter-clean, with explicit owner `ok`
and `idealnie` verdicts. Exact `3e7a0cbd...` adds only the requested battery
status header and must still earn boot, settings and focused audio evidence.
QR remains software-qualified and physically deferred by owner priority.

The classifications below are retained for the superseded images that led to
the current candidate:

`CONFIRMED` for the live general failure class: RMF FM starves the active
Bluetooth queue while valid decoded PCM remains pinned immediately below the
44,100 + 1,024 drain threshold. Stream recovery triggered the initial deficit,
but zero PCM continued for 121 seconds with no later source death. The failure
can be corrected and tested directly without another historical image.

`RESTORE CHECKPOINT` before the correction: app0 was restored to exact image
`6b01752f...` and the running build reported `b198e0a...`. The temporary LKG boot preserved the
NVS partition structurally but its normal healthy-stream path invoked a write to
RMF's `lkg2_0` last-known-good endpoint key. The stored value may be identical
to the previous value or an older resolved endpoint; the sanitized evidence
cannot distinguish those cases. No UI action, provisioning, pairing or favorite
operation occurred, so configuration, Wi-Fi profiles, favorites and remembered
Bluetooth identity were not rewritten by that boot.

`FOCUSED RMF PCM PASS` for the correction: app0 now contains exact
`94c25a9e...` from source `44f19e4...`. The current GUI, renderer, catalog and
logo-pack lane are unchanged from b198e0a; only the active-A2DP PCM ownership
policy differs. Across the completed 600-second capture, the real source
recovery produced no injected zero PCM, both queues rebuilt to near full and
the owner reported clean RMF audio during the final observed window.

`60-MINUTE ENDURANCE FAIL` for the same exact image: one A2DP pull-watchdog led
to local fallback and then an `ESP_RST_PANIC` during the next profile-open
attempt. Automatic recovery reached Wi-Fi in 4.731 s, first stream read in
19.696 s and A2DP media in 100.585 s. A later distinct `decoded=0` interval
added about 54.68 s of active silence before endpoint rotations restored full
queues. The focused PCM result remains valid only for its measured failure
mode; the image is not a stable baseline or final private build.

## 19:32 correction — exact 94c was not a deterministic playback LKG

The owner clarified that the active station was RMF, not Radio ZET. The fenced
94c-semantics image `7b6f44b1...` and then the exact archived `94c25a9e...`
were measured back-to-back on RMF with no endpoint, speaker or Wi-Fi change.

- `7b6f44b1...`: five stream starts, three stops and 286,080 active-silence
  frames during 180 seconds;
- exact `94c25a9e...`: three starts, two stops, 1,243,008 active-silence frames
  and 159,998 idle-silence frames during 180 seconds;
- both runs retained the A2DP link and had no panic, reset or pull watchdog;
- exact 94c slow refills were n=314, p50=346 ms, p90=596 ms, p99=771 ms,
  max=838 ms while 8,192 PCM frames represent about 186 ms;
- the earlier clean exact-94c run had stronger measured Wi-Fi (-52 to -59 dBm
  versus -67 dBm) and only six refills above the 150 ms logging threshold in
  ten minutes.

Therefore the current failure is not attributable to one later commit. The
serial design ran ICY socket reads and MP3 decode on the same owner loop while
A2DP consumed continuously. Link conditions only exposed that missing timing
contract.

One bounded successor was built from source `f243453...`: network reads run in
one priority-1 task pinned to core 0 and feed a 128 KiB PSRAM SPSC byte ring.
The decoder, MP3 endpoints, PCM geometry, A2DP/SBC behavior and coexistence
policy are unchanged. Its exact owner image is `44e97929...`, 2,442,368 bytes.
The superseded `7b6f44b1...` is quarantined. This is the final authorized audio
source variant before the binary RMF -> ZET -> RMF physical gate.

## 20:33 physical result and operating rules

Exact `44e97929...` closed the target steady-state path without another tuning
loop. Four independent settled windows each lasted 300 seconds:

- RMF: zero downstream silence/stops/watchdogs; the small compressed headroom
  generated empty-read diagnostics but staged PCM remained continuous;
- Radio ZET: zero input underruns and zero downstream failures with roughly
  106–109 KiB compressed headroom;
- return RMF: zero downstream failures; owner `ok`;
- raised-volume RMF: zero input or downstream failures; owner `idealnie`.

The switch itself is evaluated separately from settled playback. ZET accumulated
a bounded pre-settle idle interval and source-open activity; these counters did
not grow afterward. This is not described as instant switching, but it is also
not the recurring cut that failed earlier images.

The operating boundary is now frozen:

1. keep balanced ESP32 coexistence; neither static Wi-Fi preference nor scoped
   RF-policy switching is an accepted fix;
2. keep ICY socket reads off the decode/owner loop and retain the bounded
   compressed ring;
3. keep A2DP profile-open single-flight/generation fencing;
4. keep active-A2DP PCM reserve at the BT queue rather than trapping it in the
   decoder;
5. never restart a connected stream solely for transient low water;
6. classify compressed input, PCM, BT queue, A2DP profile, Wi-Fi and UI/PMIC as
   separate leaves before any future edit;
7. one measured leaf permits one correction and one rerun; a second failure
   blocks the lane rather than reopening buffer/endpoint/coexistence roulette.

Battery status is intentionally orthogonal. The pinned M5Unified PMIC interface
already provides level, voltage, signed battery current and VBUS voltage. The
new settings header reads them only every 10 seconds while visible. Remaining
time uses a nominal 390 mAh capacity and three-sample current smoothing, is
marked approximate, and is hidden while external power is present. Battery
bridge, power-bank endurance and percentage calibration remain physical gates.

## 21:41 conditional final closeout

- Audio LKG `44e97929...`: 3,600-second RMF PASS; one stream reopen, zero new
  downstream silence/watchdog/fallback/reset, preserved as `RESTORE_AUDIO_LKG`.
- Current app0 `3e7a0cbd...`: fresh active-app0 preflight, app-only write,
  independent digest verify and boot source `791ebd4...` PASS.
- Exact-final settled windows: RMF 300 s, Radio ZET 180 s and return RMF 120 s;
  all added zero stops, output silence, watchdogs, fallbacks, resets or panics.
  The return transition itself added one bounded 62,208 active and 7,808 idle
  silence frames (~1.41 s active); counters then stopped growing.
- Settings responsiveness is `OBSERVE`: owner reported transient lag. Measured
  UI tick was 1 ms and UI flush 107 ms; the audio owner loop reached 1,411 ms
  during ZET. Touch improved after accidental USB unplug/replug. That event
  recovered without a reset but is not relabeled as a formal battery bridge
  pass.
- Day verdict: `CONDITIONAL_QC_PASS`; full forced recovery, exact-final hour,
  formal power gates and H4 remain false/deferred.

## 22:58 local-noise rollback and final operating boundary

The first exact local-noise image, `659e56c...` from source `97f3e9b...`, kept
the qualified radio, Wi-Fi and Bluetooth geometry unchanged. White noise was
audible over A2DP and its owner-stopped soak retained a 240-second settled
window with zero audio-error counter growth. Its known limitation is
multi-second play/stop/color response because local synthesis deliberately
uses the existing radio-sized PCM queue.

The one-change latency successor `77b16bc...` replaced that local path with
short 8,192-frame blocks. Touch effect became prompt, but the physical exit
from Noise exposed a product regression: remembered-speaker auto-connect did
not recover, the radio remained on the local route, local starvation grew and
Bluetooth retry stayed deferred while only one radio block was buffered. That
image is quarantined as
`BT_AUTO_CONNECT_REGRESSION_AFTER_NOISE_QUEUE_LATENCY_CHANGE`.

At the owner's explicit decision, latency was traded back for reliability. A
fresh active-app0 preflight, app0-only write and independent digest verify
restored exact `659e56c...`. Without touching the cube, the next 90-second boot
capture reached `bt_media_starts=1` in one connection attempt and recorded
zero local starvation, retry, fallback, pull watchdog, stream stop or reset.
The accepted rule is now closed: keep the delayed Noise controls; do not tune
their queue inside the qualified radio/BT lane.

- distributable app0 image:
  `output/flashed/owner-production-659e56c236caad050e08220814839f7d395e410223c2cd05f373fc44fded28ba.bin`;
- noise evidence:
  `output/hardware-soaks/2026-07-18T20-26-28.851Z-noise-bt-600s.json`;
- accepted control-latency evidence:
  `output/hardware-soaks/2026-07-18T20-32-02.640Z-noise-colors-controls.json`;
- failed low-latency evidence:
  `output/hardware-soaks/2026-07-18T20-43-43.368Z-noise-low-latency-controls.json`;
- rollback auto-BT evidence:
  `output/hardware-soaks/2026-07-18T20-52-58.365Z-noise-rollback-auto-bt.json`.
