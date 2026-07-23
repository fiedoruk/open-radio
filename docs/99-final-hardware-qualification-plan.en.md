# 99 — Final hardware qualification and completion plan

> **SUPERSEDED:** reserve models, candidates and resume steps in this dated
> document are historical. The canonical finite execution process is now
> [docs/106](106-final-private-cube-closeout-loop.en.md); the current Bluetooth
> invariant is recorded in [docs/104](104-cc-stabilization-closeout.en.md).

Polish version: [99-final-hardware-qualification-plan.pl.md](99-final-hardware-qualification-plan.pl.md)

**Execution start:** 2026-07-16 08:30 CEST
**Target closeout:** approximately T0 + 39 h after the complete ladder passes
**Owner:** Tomasz Fiedoruk
**Execution mode:** supervised physical actions, autonomous build, capture,
analysis and documentation

## Current baseline

- H0 identity, private 16 MiB factory backup and rollback verification pass.
- Display, touch, local MP3 output and remembered Xiaomi Sound Pocket A2DP/SBC
  playback pass on the physical Core2.
- The 2026-07-16 lab image removes accidental double attenuation: the device
  slider applies one local linear PCM gain and does not send remote AVRCP
  absolute-volume commands. The owner physically confirmed the 17–57–17 range
  without silence or a speaker power-cycle jump to 100%.
- The repository gate passes 192 Node tests, all host firmware suites,
  deterministic rendering, source rehearsal and the hardware-lab build.
- H4 remains open. A 2026-07-16 experimental candidate accumulated 1,153,792
  empty active-A2DP frames and the owner heard recurring interruptions. That
  image is a FAIL and must not be used for the remaining matrix.
- Session history reproduced the preceding stable image byte for byte with
  SHA-256 `0c673848f8dd7de758aeb9513bf5644ec063c9d4252f51f2e36c22161ae42600`.
  It remains a measured rollback point, not the current candidate. Hardware-lab
  image `0ab0595616…bfc336` proved the new local reserve but failed active A2DP
  with 775,424 added silence frames in 60 seconds. Its single-change successor
  raised only the active PCM catch-up ceiling and had SHA-256
  `4a3b82315bc8cbeaa839a92a2aa4ec9634196d30208677b1b38acb390c5b7b35`.
  It passed the complete software gate and a complete 60-minute passive A2DP
  run with zero added active silence, starvation, pull watchdogs or stack
  restarts. One natural stream stop/start was bridged without active silence,
  and the owner reported clean audio in minute 39. It then failed fallback
  cycle 2: after reconnect, the BT queue fell from 201,600 to 10,880 frames and
  active silence grew by 672,000 frames. The measured cause was the four-pass
  decoder-pump ceiling, not the already-corrected A2DP drain. The next
  candidate raised that bounded decoder-pump ceiling to eight passes. Its
  hardware-lab SHA-256 was
  `44ede76e686ffaf319435a958d11fae495b865560ee79e779d76f08c23d779c1`.
  It proved local fallback with zero starvation and one 6.04-second reconnect,
  but failed active playback after reconnect: the owner heard interruptions,
  the BT queue reached 7,296 frames and active silence reached 1,983,104
  frames. The decoded reserve remained near its low-water mark, proving that
  both fixed per-owner-loop ceilings still converted network-loop latency into
  an audio-throughput ceiling. The successor removes that artificial ceiling
  as one buffer-target correction: active drain runs until the BT queue is full
  or decoded PCM is exhausted, while decoder pumping can rebuild the complete
  147,456-frame reserve and still stops at high water. Its hardware-lab SHA-256
  is `e8d07bbd47a021cfb7beec71235440be9ee7f9dd983d48d46fdc1d7c17c514e9`.
  Its guarded flash and local smoke pass. Fresh fallback cycle 1 passes with
  4.22-second ready-to-media recovery, zero local starvation, zero added
  active silence and stable full reserves. Cycle 2 then fails audibly: active
  drain emptied the decoded fallback reserve to zero, active silence grew by
  1,677,568 frames and the owner heard cutting and apparent speed-up. The
  successor makes reserve ownership explicit: decoder high water is the full
  262,144-frame ring and active drain can copy only PCM above the retained
  147,456-frame fallback reserve. Its hardware-lab SHA-256 is
  `9ef7fd8af1f1070c85232ae4ce5486bd2409ac1304b3febc528da480256f8a2a`;
  it was flashed but rejected before Bluetooth admission. After about 90
  seconds of local playback, local starvation increased to one and stream
  starts/stops reached 13/12. The cause was its monolithic 228-pass decoder
  pump, which monopolized the owner loop. The replacement restores the
  previously stable eight-pass pump and stages the Bluetooth queue before
  media start while local output remains selected. Both the dependency
  heartbeat and the firmware probe are gated until the BT queue is full and
  147,456 decoded frames remain reserved. Its hardware-lab SHA-256 is
  `64e263aa18e91f1ef37b1d979e3482b116cccdb049faf39bbc902c81127f49a8`,
  size 2,374,496 B; 192/192 tests, the full repository gate, source rehearsal
  and the pinned hardware-lab build pass. Its 180-second local smoke passed,
  but the first Bluetooth boundary needed 51.858 seconds from speaker-ready to
  media after three consecutive 5.122-second page timeouts. The audio path
  stayed clean during those attempts. Independent audit 4 identified a
  deterministic reconnect collision: the pinned A2DP source disables page
  scan while the remembered speaker initially pages the cube. A no-code
  factory-reset experiment removed the speaker's remembered initiator state
  and produced three prompt audible connections out of three, supporting the
  diagnosis. The replacement keeps the cube connectable but non-discoverable,
  accepts incoming A2DP only from the remembered address, and adopts incoming
  CONNECTED events into the pinned library state machine before normal media
  gating. No buffer, decoder, retry-reserve or audio-routing threshold changed.
  Its gated hardware-lab SHA-256 is
  `6487a6fe1b3793e36775287bba50345aa7e6ad27998a513ffa9e65af78558b64`,
  size 2,375,216 B; 192/192 tests, the full repository gate, source rehearsal,
  focused contracts and the pinned build pass. It was flashed once and passed
  a fresh 180-second local smoke under 11 failed sink-off attempts with zero
  starvation, stream restart, active silence or watchdog. Reconnect cycle 1
  passed in 9.629 seconds from speaker-ready to media, but cycle 2 failed:
  link took 127.622 seconds after ready and media did not start before the
  300-second capture ended. Accepted links were labelled `local`; no reliable
  incoming-initiator path was proven. Attempt durations also became mixed
  (5–22 seconds), so audit 4's page-scan diagnosis is at most partial. This P0
  image is rejected for qualification; audio buffers and routing remain frozen
  because their counters stayed clean in both cycles.
- The current change set is local until final evidence, documentation, source
  lock, commit and CI reconciliation are complete.

## Final acceptance contract

The cube is final only when every mandatory row below has measured evidence.
An automatic recovery that eventually succeeds but misses its time bound is a
failure, not a partial pass.

| Area | Required result |
|---|---|
| Boot and rollback | normal boot, no reset loop, verified private rollback remains usable |
| Local audio | 60 minutes including one forced stream recovery, no audible gap outside recovery |
| Primary Bluetooth | Xiaomi A2DP/SBC playback, volume 5–100%, no PCM double attenuation |
| Bluetooth recovery | three of three cycles on one exact candidate; local fallback within 2 s of the disconnect callback; A2DP return within 30 s after the speaker is ready |
| Wi-Fi/stream recovery | five of five cycles; no reboot, unknown join or lost remembered speaker; playback returns within 60 s after Wi-Fi is available |
| Stations | all nine catalog entries start or report a truthful bounded operator-specific failure; metadata is never invented |
| Power and storage | battery bridge, powerbank handover, PMU facts, SD smoke and known-good config fallback pass |
| Secondary speaker | exact model/revision of the incoming Soundcore/Anker recorded; A2DP/SBC playback, fallback, reconnect and cube power delivery measured |
| Resources | zero watchdog resets; no monotonic memory decline; queue/watchdog counters within budget |
| Endurance | 60 min, 2 h, 8 h and 24 h rungs pass in order |
| Source closeout | EN/PL evidence, exact binary hash/size, clean diff, full check, commit and green CI |

The committed resource manifest currently asks for at least 61,440 B free
internal heap, a 32,768 B largest block, 2,048 B audio-task stack headroom and
no more than three underruns per hour. Previous lab samples were below the two
DRAM thresholds. H4 cannot pass until the implementation meets them or a
separate measured engineering review replaces them with justified safe limits.

## Execution ledger — 2026-07-16 18:51 CEST

This table is the single qualification counter. The historical isolated pass
validates the rollback point but does not increment the fresh 5/5 matrix.

| Item | State | Counter / evidence | Required exit |
|---|---|---|---|
| Plan, capture and privacy | PASS | EN/PL plan; capture tests PASS | scope remains frozen |
| Exact audio candidate | REJECTED | `6487a6fe…558b64`, 2,375,216 B was flashed once; software gate and 180-second local smoke PASS, reconnect cycle 1 PASS, cycle 2 ready-to-link 127.622 s and no media in capture | independent read-only re-audit, then one minimal successor; do not reflash this image as a candidate |
| Interruption-free Bluetooth | BLOCKED ON RE-AUDIT | P0 diagnostic cycle 1 PASS at 9.629 s; cycle 2 FAIL; qualification counter resets to 0/5; both accepted links labelled `local` | prove the actual initiator/profile path, then five physical cycles with zero active-silence delta |
| BT → local → BT fallback | TIMING FAIL / AUDIO PASS | local fallback, buffers and counters stayed healthy, but P0 did not provide bounded return; attempts varied from 5 to 22 s | keep audio mechanisms frozen; return within 30 s in fresh 5/5 on one reviewed successor |
| Wi-Fi and stream recovery | NOT MEASURED | 0/5 | five returns within 60 s |
| Stations and metadata | NOT MEASURED | 0/9 physical | nine-result table |
| Local station identity | SOFTWARE PASS / PHYSICAL PENDING | nine project-original color/monogram identities; artwork networking removed in S26 | nine physically readable identities during the station sweep |
| PMU, battery, powerbank and SD | NOT MEASURED | 0/4 groups | no-reboot and SD-independent evidence |
| Resource budget | BLOCKED | `dram_min=3,732 B` and largest block `4,596 B` came from rejected candidate `9ef7fd8a`; the stabilized runtime later measured about `dram_min=17,204 B` | use current docs/104 and docs/105 as ground truth; confirm justified limits through 8 h |
| Secondary speaker | BLOCKED | hardware in transit; owner-provided order description: Soundcore/Anker “Boom Go 3i”, 15 W, 4800 mAh, 24 h, intended to power the cube | after arrival: label, exact advertised BT name, A2DP/SBC and power-output tests |
| Endurance | IN PROGRESS | passive BT 60 min PASS with one natural stream recovery; mandatory local/forced rung remains 0/60 min; 0/2 h, 0/8 h, 0/24 h | four mandatory sequential rungs |
| Repository and CI | IN PROGRESS | local checks PASS; commit/CI pending | clean diff, commit and green CI |

## CC audit 5 and diagnostic-cycle disposition

CC audit 5 was executed in the required order without changing buffer sizes,
the decoder pump, retry reserve, volume, routing or standby thresholds. The
first instrumentation image `532c5686…39729` exposed a measurement defect:
a clean page timeout recorded by the callback at about 5.13 s was consumed by
the supervisor about 0.8 s later and falsely classified as `dirty`. The
timestamp was moved to the callback without changing audio behavior.

Successor `6dab43fbfbf6eb941d74f242695fcf4d9ec884c316e99ae16d21114fa9b9ba71`,
2,376,560 B, passed 192/192 tests, the full repository gate, build and guarded
flash. Its repeated 180-second local smoke passed: 11/11 attempts reported
`clean_timeout` at 5.131–5.146 s, no listen hold started,
`local_starvations=0`, active silence and pull watchdogs stayed at zero, and
`dram_min` was 17,332 B.

The single diagnostic cycle failed before the 5/5 matrix. The
`speaker-ready` marker was recorded at 53.610 s. At 59.021 s the controller
reported an incoming ACL with HCI success and no outstanding dial
(`dial_age_ms=4294967295`, `stat=256`), but A2DP did not complete by itself.
A local attempt started at 67.354 s and reached A2DP CONNECTED at 67.885 s,
14.275 s after `ready`. Every accepted session then ended after exactly five
seconds with `timeout_phase=buffer`; neither `standby_ready` nor
`media_started` occurred. Eleven complete CONNECTED → buffer timeout →
disconnect repetitions produced the visible `local ↔ BT` UI oscillation,
audible dropping and an increase of `local_starvations` to 11.

The conclusion is split: bounded ACL/A2DP reconnect through a local dial works,
but the frozen pre-media standby phase cannot stage the full queue before its
five-second timeout. Listen hold was not entered because attempts before the
speaker became ready were clean and the first post-ready attempt established
the link. The matrix remains 0/5, the 60-minute soak was not started, and
candidate `6dab43fb…b9ba71` is rejected. The next step requires an explicit
owner decision whether to unfreeze only the pre-media standby phase for one
correction or keep the freeze and roll back the experiment; another reconnect
mechanism must not be improvised.

## Final Bluetooth repair verdict — 2026-07-16 20:03 CEST

This section supersedes the current-candidate rows in the earlier execution
ledger; the rejected-candidate history remains evidence and is not rewritten.
The exact hardware-lab candidate is SHA-256
`729444cc8343ed025837a63ab8673c6e364eec4ba324bf5266feea982ec6b5d5`,
2,376,960 B. Its source rehearsal is
`feff065b45b5892ee2446bb20199e9d26f8026f6c1f02fc550e561562c1f7452`.
The guarded flash verified every written segment after the complete 192/192
repository gate.

The final repair closes three measured faults rather than adding another
retry scheme:

1. A2DP pre-media admission accepts a seven-eighths BT-queue high-water mark
   while retaining the complete 147,456-frame decoded fallback reserve. This
   removes the impossible exact-full equality race observed while the A2DP
   task was already pulling PCM.
2. Passive listen holds were removed. A successful inbound remembered-peer
   ACL wakes the normal owner-loop A2DP source dial immediately. The observed
   Arduino/IDF ABI encodes ACL success as `0x100` and page timeout as `0x104`,
   so only a zero low status byte may trigger that dial. Retry delay is
   anchored to the actual A2DP `DISCONNECTED` callback, not to an earlier
   abort request whose unwind can outlast the delay.
3. During active Bluetooth only, decoder pumping now continues to the existing
   high-water target instead of stopping after eight MP3-frame passes. Local
   mode retains its stable eight-pass bound, active drain retains the full
   fallback reserve and 256-frame critical-section chunks, and an eight-pass
   no-progress guard prevents an owner-loop spin.

The complete sanitized evidence
`2026-07-16T17-59-11.979Z-final-bt-off-on-verdict.json` identifies the exact
binary above. The owner powered the speaker on at 25.620 s and marked it ready
at 66.370 s. A successful inbound ACL arrived at 67.104 s; the owner-loop dial
completed A2DP in 345 ms, `standby_ready` followed at 71.506 s and media began
at 74.098 s. Ready-to-media was therefore **7.728 s**, within the 30-second
contract. Active Bluetooth then remained selected through the completed
240-second capture. Final decoded and BT queues were 261,888 and 260,864
frames. Counter deltas were `local_starvations=0`, stream starts/stops `0/0`,
`bt_active_silence_frames=0`, `bt_idle_silence_frames=0` and
`bt_pull_watchdogs=0`; the owner reported clean audio.

**Verdict:** the exact hardware-lab image passes this final functional
OFF-to-ON Bluetooth cycle and fixes the reproduced post-reconnect audio
underrun. It is the retained hardware candidate. It is **not yet a release or
H4 pass**: after earlier failed successors, the owner reduced the planned
matrix from 5/5 to 3/3, and only one complete cycle was run on this final SHA.
The fresh remaining qualification is 2/3 reconnect cycles plus the mandatory
60-minute rung with one forced stream recovery. No further firmware change may
reuse this PASS; a changed binary restarts those counters.

## Independent audit disposition — CC audit 4

The local, gitignored CC report remains the detailed review record. This table
is the canonical follow-up list, so no release-relevant finding depends on that
local file or on session memory.

| Finding | Disposition and timing | Closure evidence |
|---|---|---|
| Seven failed attempts lasted 5.121–5.123 s and the same 51.858-second recovery recurred across builds | Audio-buffer regression is excluded, but the proposed Classic Bluetooth page-scan explanation was incomplete. P0 enabled connectable/non-discoverable remembered-peer listening and incoming-state adoption yet produced one 9.629-second PASS followed by a 127.622-second ready-to-link FAIL with mixed 5–22-second attempts | P0 `6487a6fe…558b64` REJECTED. Re-audit the pinned profile call graph, scan-mode persistence and initiator instrumentation before one further behavioral change |
| Candidate `9ef7fd8a…6f8a2a` retained the decoded reserve but its 228-pass monolithic pump caused one local starvation and 13/12 stream starts/stops after about 90 seconds, before any BT test | Confirmed local-throughput regression. Restore the stable eight-pass pump; build BT headroom only in a pre-media standby stage; gate library and firmware media probes until the BT queue and decoded fallback reserve are ready | Successor `64e263aa…f49a8` must pass at least 180 seconds local playback before BT admission, then show `standby_ready` before media and retain 147,456 decoded frames without active-silence growth |
| Candidate `e8d07bbd…c514e9` removed fixed catch-up caps but active drain consumed the decoded fallback reserve to zero after reconnect; active silence grew by 1,677,568 frames and the owner heard cutting/apparent speed-up | Confirmed reserve-ownership bug. Set active decoder high water to the full 262,144-frame ring and permit active drain to copy only frames above the retained 147,456-frame reserve | `9ef7fd8a…6f8a2a` closed the reserve invariant but introduced a separate local regression; preserve the invariant in `64e263aa…f49a8` and restart the matrix at 0/5 |
| Candidate `44ede76e…d779c1` raised decoder pumping to eight passes but still underfed A2DP after reconnect; BT queue reached 7,296 and active silence reached 1,983,104 frames while decoded PCM stayed near its 147,456-frame low-water mark | Confirmed shared cause: fixed decoder and drain work per owner-loop iteration. Replace both ceilings as one buffer-target correction; existing high-water and 256-frame BT critical-section chunks remain | Successor `e8d07bbd…c514e9` must keep active silence +0 and refill both reserves after every reconnect; matrix restarts at 0/5 |
| Candidate `4a3b823…b7b35` held steady A2DP for 60 minutes but produced only about 30 kframe/s after the second reconnect; its BT queue fell 201,600→10,880 and active silence grew by 672,000 frames while the stream still reported running | Confirmed decoder-side throughput ceiling: four MP3 frame passes per owner-loop iteration. The eight-pass experiment did not close the per-loop throughput class; it is superseded by the buffer-target correction | Preserve the historical 60-minute PASS, but do not promote this binary or count its isolated reconnect PASS in the fresh matrix |
| Candidate `0ab0595…fc336` active A2DP drain was capped at 4,096 frames per owner-loop iteration, about 31 kframe/s under measured network-loop timing versus the required 44.1 kframe/s | Closed in `4a3b823…b7b35` by one change only: raise the catch-up ceiling to 8,192 frames while retaining 256-frame critical-section chunks | PASS: complete 60-minute capture `bt-steady-60m-candidate-4a3b823`, active silence +0 and queue 261,632→260,864; physical matrix restarts at 0/5 |
| Confirmed fallback failure chain: BT connect contention, stream loss and synchronous reopen | Accepted; its reserve, retry and bridge mechanisms remain unchanged in the successor candidate, which must run the failing scenario as five independent 300-second cycles | 5/5 with zero local starvation, active A2DP silence and pull watchdogs; audible PASS in every cycle |
| H1: up to 512 KiB copied under one critical section in the BT-to-local bridge | Not triggered by the `44ede76e…` audible FAIL because it had a matching active-silence increase and empty BT queue. Keep measuring; only audible interruption with clean counters triggers chunking | Five clean audible cycles; if triggered, a fresh 5/5 on the single-change build |
| H2: retry waits for an exactly full decoded ring | Measured 51.86 s FAIL after three rejected attempts and 6.04 s PASS on the next cycle, without excessive retry deferral. Keep the threshold frozen and measure every fresh cycle before changing another mechanism | Every recovery within 30 s; any threshold change restarts the matrix at 0/5 |
| Evidence lacked build identity | Closed in the host capture without changing the audited firmware: every new JSON records build lane, binary SHA-256 and byte size | Evidence artifact fields equal the guarded-flash artifact |
| Incoming Soundcore was absent from the discovery allowlist | Closed in S26: explicit scans use the audio/rendering Class-of-Device filter and no model-name profile. Remembering still requires successful A2DP media | Physical A2DP/SBC, volume, reconnect and power-output result for the exact delivered unit before Phase E passes |
| Current DRAM manifest thresholds exceed measured steady-state values | Do not silently lower them. Perform a measured engineering re-baseline after the 60-minute rung and confirm no monotonic decline through the 8-hour rung | Justified committed limits, stack/largest-block evidence and explicit H4 decision |
| Hardware-lab image differs from the public-candidate lane | Lab image is valid only for private qualification. Rebuild the unchanged source as `core2-public-candidate` before release | Public-lane hash plus one fallback cycle and a 60-minute smoke on that binary |
| Synchronous stream open and Wi-Fi scan can stall the owner loop | Record maximum loop/audio stall and treat any playback gap or watchdog as FAIL; document a bounded known behavior if audio remains continuous | No watchdog/reset or audible gap, with measured maximum stalls in endurance evidence |
| Wi-Fi power-save policy is implicit | Review and pin the intended coexistence policy before release; do not change it during the frozen BT matrix | Explicit source policy plus build/test gate |
| Dependency SCA was not measured by the independent review | Run approved dependency analysis before final commit/release, without publishing a remote monitor snapshot | No unresolved HIGH/CRITICAL release blocker, or an explicit owner disposition |
| Two-purchase DIY kit claim | Publish only after one exact A2DP/SBC speaker with powerbank output has powered the cube through the required power and endurance tests | EN/PL recommendation names the qualified matrix row and avoids universal compatibility claims |

## Execution schedule

`T0` is the future completed, verified flash of the next independently reviewed
successor. The previous `6487a6fe…558b64` T0 ended at reconnect cycle 2 FAIL.
The schedule does not move acceptance criteria or pretend an expired window
passed. A failed gate pauses later rungs and turns the time into a correction
and retest window.

| Window | Work | Physical owner action | Exit evidence |
|---|---|---|---|
| before T0 | read-only re-audit, one minimal correction, exact snapshot, full gate, build and backup | keep the primary speaker OFF only when the successor is fully gated | new exact hash, full gate PASS and audit findings disposed |
| T0–T0+15 min | guarded flash and local-boot observation | observe screen and audio | verified segments, no reset loop |
| T0+15–40 min | three primary-speaker cycles | OFF 10 s, ON and `ready` when prompted | 3/3 uninterrupted and within limit |
| T0+50–90 min | five approved-Wi-Fi interruptions | disable/restore AP when prompted | 5/5 network/stream recovery |
| T0+90–115 min | nine-station sweep | select stations | 9/9 table and truthful failures |
| T0+130–170 min | PMU, battery, powerbank, SD and A/B config | physical actions when prompted | power and storage evidence |
| T0+170–210 min | incoming Soundcore/Anker qualification | provide label data, power, pair and supply the cube | second matrix row and powerbank evidence |
| T0+3.5–4.5 h | 60-minute rung with one stream recovery | one network interruption | minute samples and PASS/FAIL |
| T0+4.75–6.75 h | 2-hour BT rung with one Wi-Fi recovery | one network interruption | two-hour summary |
| T0+7–15 h | 8-hour powerbank rung with one speaker cycle | powerbank and one cycle | eight-hour summary |
| T0+15–39 h | 24-hour unchanged-candidate endurance | normal configuration | complete 24-hour summary |
| T0+39–40.5 h | source and evidence reconciliation | final confirmation | clean repo, green CI, verdict |

## Phase A — reconnect and observability correction

1. Preserve one Bluetooth stack lifetime and one external retry owner.
2. Keep page scan enabled for the remembered peer while remaining
   non-discoverable. Reject a peer-initiated A2DP link unless its address is
   the persisted approved address, and adapt an accepted incoming CONNECTED
   event into the pinned source state machine before its normal dispatcher.
3. Replace the user-hostile 30/60-second recovery cadence with a fixed bounded
   readiness cadence: wait eight seconds after every failed attempt, without
   aging to 12 or 20 seconds. Including the measured connect-attempt duration,
   this keeps the next attempt
   within the 30-second ready-to-recovery contract. Before every attempt,
   require both local playback slots and a full decoded PSRAM reserve; poll
   readiness every 250 ms without consuming a retry attempt.
4. Keep both the BT queue and decoder reserve while A2DP is active. Before
   media start, retain the stable eight-pass decoder pump, leave local output
   selected and stage only PCM above the 147,456-frame fallback reserve into
   the BT queue. Gate both media-start paths until the BT queue is full. On
   disconnect, preserve queue order as the BT-to-local bridge and immediately
   fill two M5Unified blocks providing about 5.94 seconds of playback. If the
   standby buffer misses five seconds or admitted media misses ten seconds,
   disconnect and retry after 2 seconds instead of holding a silent link.
5. Reset the cadence only after `AUDIO_STARTED`, not merely link connection.
6. Record monotonic disconnect, attempt, initiator, connected and media-start
   timestamps;
   never record names, addresses, SSIDs or endpoints.
7. Add contract tests for incoming-peer validation, state adoption, cadence,
   cap, audio-reserve gating, single retry ownership and reset point.
8. Keep immediate local fallback and prevent dual output.
9. Run the maximum simplify gate, full repository check, hardware-lab build,
   deterministic source rehearsal and guarded flash.

## Phase B — interactive recovery matrix

For each of three primary-speaker cycles, capture baseline counters, power the
speaker off for ten seconds, confirm local audio, power it on and wait for media
start. A cycle passes only if there is exactly one fallback transition, no
reset, no local-speaker starvation, no pull-watchdog loop, no dual output and
the recovery target is met.

For each of five Wi-Fi cycles, keep the speaker powered, remove the approved
network long enough to observe network loss and local state, then restore it.
The device must not join an unknown/open network, lose its remembered speaker
or require touch intervention. Stream and A2DP must recover within the declared
bounds.

## Phase C — content and optional-feature sweep

Run the catalog in its canonical order. Record start result, time to first
audio, reported codec/rate/channels, metadata presence and whether fallback was
needed. Missing `StreamTitle` is valid; fabricated metadata is not. Operator
endpoint details stay local and are never copied into committed evidence.

Station artwork is outside the current product runtime. The sweep verifies the
local project-original color, monogram and geometric identity without image
downloads, decoding or cache state.

## Phase D — power, PMU, SD and persistence

1. Observe PMU and internal-battery facts on USB-C.
2. Remove upstream USB-C briefly and prove the internal battery bridges without
   rebooting; restore power and confirm playback continuity.
3. Repeat with the intended powerbank supply and one controlled interruption.
4. Insert a known-good non-secret SD card, verify detection and remove it after
   the smoke test; SD must not become a boot or playback dependency.
5. Exercise A/B configuration recovery using an approved test mutation of the
   newest slot only. The older committed slot must load. Never erase full flash
   or overwrite the factory backup.

## Phase E — speaker qualification

The primary row is Xiaomi Sound Pocket `MDZ-37-DB`. The intended secondary is
an incoming Soundcore/Anker described in the order as “Boom Go 3i”. The
official product page reports 15 W, 24-hour playback and a 4,800 mAh power-bank
output, while its codec FAQ lists SBC and AAC. These are supplier declarations,
not a physical result. No name profile is required: the explicit scan uses the
standard audio/rendering Class of Device and A2DP negotiation. After arrival,
read the exact model/revision from the label. Each row records only
model/revision, A2DP/SBC result, volume behavior, fallback, recovery time and
qualification verdict. Bluetooth addresses are prohibited.

Compatibility language remains standards-based A2DP/SBC interoperability. A
pass on two speakers does not become a claim about every current or future
speaker, and LE Audio-only products remain outside the Core2 contract.

## Phase F — endurance ladder

The 60-minute rung includes local playback and one forced stream recovery. The
2-hour rung uses Bluetooth plus one Wi-Fi recovery. The 8-hour rung uses the
intended powerbank and one speaker cycle. The 24-hour rung uses the exact final
candidate without code, configuration-schema or dependency changes after
start.

Every minute, retain only sanitized values: elapsed time, route, stream starts
and stops, Bluetooth attempts/retries/fallbacks/media starts, active/idle
silence, pull callbacks/watchdogs, internal heap/free minimum/largest block,
PSRAM values, loop stack headroom and maximum reported loop/audio/UI duration.
Evaluate deltas, not only the last line.

## Evidence and privacy workflow

- Raw serial is local and ignored as `*.log`; it is never committed.
- A capture tool filters only allowlisted `memory`, `audio_qc`, connection-state,
  retry, media-start, format and reset-reason records and redacts identifiers.
- Each test session produces a sanitized JSON summary plus a reviewed Markdown
  verdict under `hardware/`.
- Binary SHA-256 and byte size are public evidence; factory backup hashes,
  device addresses, Wi-Fi identity, credentials and endpoints remain private.
- `hardware/speaker-qualification-matrix.json` changes from `NOT_MEASURED` only
  after the corresponding physical row passes.

## Stop conditions and rollback

Stop the current rung on any panic, watchdog reset, boot loop, credential or
identifier leak, unknown-network join, unbounded retry loop, missing local
fallback, dual output, monotonic memory decline, corrupted UI or counter growth
outside budget. Preserve the failure trace, diagnose, patch, rerun the full gate
and restart that rung from minute zero.

The `64e263aa…f49a8` physical startup/reconnect run is a hard review boundary.
Any audible cut, apparent speed-up, BT→local→BT route flap or recovery outside
the limit stops further patches and flashes. Preserve the exact binary, diff
and sanitized evidence and submit them for an independent second-agent review
before any further implementation.

Rollback remains the verified private 16 MiB factory image through the guarded
script and explicit rollback confirmation. No erase-all, eFuse, OTA, public
upload or release action is part of this plan.

## Final closeout

After every rung passes, update `STATUS.md`, `CURRENT-MISSION.md`, the EN/PL
hardware evidence, speaker matrix, resource measurements and candidate hash.
Regenerate the deterministic RC1 source lock, run `npm run check` and
`git diff --check`, review the complete simplify gate, commit intentionally and
require green CI. Only then may the project report `H4 PASS`; a public binary or
broad compatibility claim remains a separate release decision.
