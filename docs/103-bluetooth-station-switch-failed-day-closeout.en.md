# 103 — Bluetooth and station-switch failed-day closeout

> **SUPERSEDED (2026-07-17):** reserve model, candidates and resume steps in this document are outdated. Current ground truth: [docs/104](104-cc-stabilization-closeout.en.md).

Polish version: [103-bluetooth-station-switch-failed-day-closeout.pl.md](103-bluetooth-station-switch-failed-day-closeout.pl.md)

## Verdict

The 2026-07-16 session ends as **FAIL / BASELINE NOT CONFIRMED**. There is no
basis for claiming stable Bluetooth, touch or station switching. H4 and the
public release remain blocked.

The repository returns to `main` at `5b61b66`. The Core2 was left on a rebuild
of hardware-lab source commit `ecd69dd`, SHA-256
`0d62d10ba09ec0fae7a76718640c2dc7f32a3c1734ca2d044fa6b83ceb026433`,
2,376,960 bytes. The flash verified every write and preserved NVS, but no final
owner verdict for touch or clean audio was obtained after that flash. The
rebuild is not byte-identical to the historically passing
`729444cc…b5d5` image; that difference must remain explicit.

The exact image left on the device is preserved privately at
`output/rollback/ecd69dd-hardware-lab-rebuild-0d62d10b.bin`.

## Rejected images and changes

| Version | SHA-256 / size | Result and rejection reason |
|---|---|---|
| S26 public candidate | `ac3bda38…583950`, 2,232,656 B | A station change blocked the owner loop for 4,303 ms, of which audio consumed 4,102 ms. After an emergency reflash the owner reported stuttering and completely unresponsive touch. S26 is not a safe operational rollback. |
| S27 | `cb05f9a5…994d`, 2,232,688 B | Limiting decode to 4,096 frames reduced the maximum loop to 572 ms, but after 55 s the route was still local, the BT stack had not started and local starvation was 1. The pre-BT reserve filled too slowly. |
| S28 | `c00b6917…9752`, 2,232,688 B | Automatic BT reached media only around 46.445 s after capture start. The station sweep ended with a 10,253 ms loop stall (10,251 ms in audio), 11 extra stream starts, 2 failures and 4 stops. The owner reported a freeze, dead touch and stuttering. |
| S29 | `028a9d32…3064c`, 2,233,392 B | The asynchronous RMF resolver compiled and passed focused tests, but did not complete the final gate/source lock and was never flashed. The changes were reverted. |
| Incorrect rollback | S26 `ac3bda38…583950` | The documented public candidate was chosen instead of the last physically clean audio lane. The symptoms immediately returned. |
| Image left on device | `ecd69dd` rebuild, `0d62d10b…26433`, 2,376,960 B | Flash completed and verified, but the physical result after flash remains unconfirmed. This is tomorrow's diagnostic baseline, not a PASS. |

## What is known and what remains unknown

Confirmed by evidence:

- rebuilding the complete multi-second PCM ring inside one
  `AudioGenerator::loop` can monopolize the owner loop for about 4.1 s and
  starve touch;
- a BT attempt to a powered-off speaker can occupy the shared radio for about
  5.1 s, followed by up to about 5.3 s of synchronous stream reopen work;
- tuning only a frame limit moves the failure between UI responsiveness,
  Bluetooth preparation time and audio continuity;
- S28 kept active A2DP silence delta at zero but still froze the owner loop, so
  the active-silence counter alone does not prove product responsiveness.

Strong hypothesis, not yet stage-level proof: S28's 10.253 s stall came from
synchronous RMF endpoint discovery/open. Timers separating resolver, connect,
first read and decoder start are missing, so another resolver must not be
implemented tomorrow as a supposedly confirmed fix.

Separately unresolved: slow automatic BT connection, transient local↔BT route
changes, the reported broken `Now playing → Save` action, touch during stream
failure, and behavior after several rapid station changes.

## Process failures

1. Successive mechanisms were changed before preserving one passing rollback
   artifact as an available binary file.
2. S26 was incorrectly called a safe rollback despite its known 4.303 s stall.
3. One build attempted to change decoder budgeting, queue handover and the
   resolver together, making attribution harder.
4. A momentary “playing” verdict was sometimes treated too broadly; it does not
   replace separate gates for touch, route, connection time, starvation and
   station switching.
5. The `ecd69dd` rebuild did not reproduce the historical SHA. Calling it a
   rebuild is accurate, but the historical PASS cannot be inherited.
6. The final flash was not followed by a listening and touch verdict, so device
   state at exit must remain `NOT MEASURED`.

## Closed start plan for tomorrow

1. **No code change and no flash at start.** Use the retained
   `0d62d10b…26433` image and the powered remembered speaker.
2. Without opening serial for the first minute, check touch response, local
   audio, automatic BT and time to media. Record four separate results;
   “playing” does not automatically pass touch.
3. Only then start one 300-second diagnostic capture referencing the preserved
   binary. Opening serial resets the device and is part of the test.
4. During capture perform exactly: untouched startup, touch during connect,
   three non-RMF station changes, one RMF station change and one
   `Now playing → Save` action. Each step receives a separate owner marker.
5. Diagnostic PASS requires all of: responsive touch, no reset/panic, maximum
   owner loop below 1,000 ms, local starvation 0, active silence delta 0,
   stable BT route, and automatic media within 30 s of speaker readiness.
6. If the test fails, the next change adds only stage timers for
   resolver/connect/read/decode. It does not change buffers, reconnect or
   routing.
7. Only after one stage is measured may one correction be made and the entire
   test restarted. The 3/3 matrix starts only after diagnostic PASS.

## Deferred product work

- Splash, polish for both home screens and a larger nine-station picker remain
  optional after reliability closes.
- Automatic persistence of several approved Wi-Fi networks, automatic
  remembered A2DP, hotspot onboarding and secure full-history reset remain
  product requirements, but are not tomorrow's first lane.
- The Soundcore/Anker powerbank speaker requires separate qualification of the
  exact model, advertised name, A2DP/SBC, reconnect and Core2 power output.

## Resume condition

Start from this document, image `0d62d10b…26433` and step 1 above. Do not use
the old S25 closeout as a current PASS. Do not flash S26–S29. Do not continue
H4 or release work until one exact image passes touch, stream and Bluetooth
diagnostics together.
