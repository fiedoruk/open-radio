# Bluetooth stabilization closeout — 2026-07-16

> **SUPERSEDED (2026-07-17):** reserve model, candidates and resume steps in this document are outdated. Current ground truth: [docs/104](104-cc-stabilization-closeout.en.md).

## Verdict

Bluetooth functionality is closed on the retained hardware-lab candidate. The
owner completed a supervised speaker OFF-to-ON cycle and reported clean audio.
The candidate is suitable for continued private qualification. It is not yet an
H4 or public-release pass.

Exact retained firmware:

- binary SHA-256: `729444cc8343ed025837a63ab8673c6e364eec4ba324bf5266feea982ec6b5d5`;
- binary size: 2,376,960 bytes;
- implementation commit: `ecd69dd18364a7233e7874d4040a1a30cd1b4a3e`;
- sanitized final evidence:
  `output/hardware-soaks/2026-07-16T17-59-11.979Z-final-bt-off-on-verdict.json`.

The evidence artifact is private and ignored by Git. The source, tests and this
decision record are committed.

## Measured final cycle

| Event or counter | Result |
|---|---:|
| Speaker power-on marker | 25.620 s |
| Owner `ready` marker | 66.370 s |
| Successful inbound ACL | 67.104 s |
| Owner-loop A2DP dial | 68.989 s |
| A2DP connected | 69.333 s |
| Standby ready | 71.506 s |
| Bluetooth media started | 74.098 s |
| Ready-to-media | 7.728 s |
| Active Bluetooth observation | about 166 s, through the end of the 240 s capture |
| Final decoded / Bluetooth queues | 261,888 / 260,864 frames |
| Local starvation delta | 0 |
| Active / idle Bluetooth silence delta | 0 / 0 frames |
| Stream start / stop delta | 0 / 0 |
| Bluetooth pull watchdog delta | 0 |
| Owner listening verdict | clean |

The final sample recorded 22,128 bytes of free internal DRAM, a 10,680-byte
historical minimum and a 13,812-byte largest block. These values are evidence,
not an H4 resource-budget pass. The old manifest limits still require an
explicit measured re-baseline after endurance testing.

## Confirmed failure chain

The long debugging sequence contained several different failures that looked
similar at the speaker:

1. A Bluetooth connect attempt to a powered-off speaker occupied the shared
   radio for about 5.1 seconds. Stream loss then triggered a synchronous reopen
   lasting up to about 5.3 seconds. Without enough staged PCM this could also
   interrupt local fallback.
2. An exact-full Bluetooth-ring admission check raced the A2DP consumer. The
   consumer could remove frames before the owner observed exact equality, so a
   valid connection repeatedly timed out before media start.
3. Passive ACL listen-hold did not complete the A2DP source profile by itself
   and added a long hold delay. A successful inbound ACL must wake the normal
   owner-loop source dial instead.
4. Retry time was initially anchored to the abort request. Disconnect unwind
   could outlast that timer and overlap the next HCI attempt. Retry now starts
   from the actual A2DP `DISCONNECTED` callback.
5. Fixed decoder and drain work per owner-loop iteration could not sustain
   44.1 kframe/s after reconnect. The Bluetooth queue then emptied even though
   the stream still appeared active, producing cuts and apparent speed-up.
6. An unbounded or monolithic catch-up pump damaged local playback. The final
   design therefore changes pumping only in active Bluetooth mode and retains
   the bounded local path.

## Frozen working design

- One Bluetooth stack lifetime and one reconnect owner per boot.
- Routing changes to Bluetooth only after the media-start callback.
- A successful inbound ACL from the remembered peer wakes the ordinary local
  A2DP source dial; passive listen-hold is removed.
- ACL status is accepted only when its low status byte is zero, covering the
  observed Arduino/IDF ABI representation without accepting page timeout.
- Retry cadence begins at the real A2DP disconnect callback.
- Pre-media admission uses seven eighths of the 262,144-frame Bluetooth ring,
  not exact-full equality.
- The complete 147,456-frame decoded reserve is retained for local fallback.
- Active Bluetooth decoder pumping targets the existing high-water level.
  Local mode retains eight passes, active drain retains 256-frame critical
  sections and an eight-no-progress guard prevents owner-loop spin.
- Volume remains one local linear PCM gain. The firmware does not send AVRCP
  absolute-volume changes to the speaker.
- Built-in playback remains the mandatory fallback and diagnostic route.

Do not add another reconnect mechanism or retune buffers without a new measured
failure on the exact retained binary.

## Rejected approaches and preserved lessons

- A previously stable morning result did not disprove the later failure: it
  used a different binary and a different scenario.
- Link-connected is not media-ready. Qualification must record ACL, A2DP link,
  standby admission and media start separately.
- Textual host assertions prevent known source regressions but do not prove RF
  or real-time audio behavior. Owner listening remains a required hardware gate.
- Evidence must always identify the exact binary hash and size. Results cannot
  be inherited by a rebuilt image.
- Hardware-lab builds are private qualification artifacts. Public release
  requires a fresh public-candidate build and its own fallback plus endurance
  evidence.

## Remaining closed qualification list

No firmware work is planned before these measurements:

1. Run reconnect cycle 2/3 on the exact retained binary.
2. Run reconnect cycle 3/3 on the same binary.
3. Run a mandatory 60-minute MP3-to-A2DP rung with one forced stream recovery.
4. Review the measured DRAM minimum, largest block, stack and trend; commit a
   justified resource-budget re-baseline instead of silently lowering limits.
5. Rebuild the unchanged source in the public-candidate lane, then repeat one
   fallback cycle and a 60-minute smoke before release consideration.

Every reconnect cycle fails on any audible cut, wrong route, reset, watchdog,
local starvation, active-silence growth or more than 30 seconds from `ready` to
Bluetooth media. Any firmware change resets the cycle count.

## Speaker and DIY-kit follow-up

The incoming purchase was described by the owner as Soundcore/Anker “Boom Go
3i”, 15 W, 4,800 mAh and 24-hour playback, intended to power the Core2 as well
as play audio. These are purchase notes, not verified specifications or test
results. The current discovery allowlist must not guess from the marketing
name. After arrival, record the exact label and Bluetooth-advertised name, add
the smallest normalized allowlist rule, and qualify A2DP/SBC, reconnect,
fallback, volume and powerbank output.

Only after that row passes may public EN/PL documentation recommend the
two-purchase DIY kit: one Core2 cube plus one specifically qualified Bluetooth
speaker with powerbank output. The project must continue to claim
standards-based A2DP/SBC interoperability, never universal speaker support.

## Resume point

Start from `ecd69dd` with no code changes and no reflash. Confirm the device is
still running binary `729444cc…b5d5`, then execute cycles 2/3 and 3/3 followed
by the 60-minute rung. A PASS closes the Bluetooth stabilization lane; a FAIL
opens exactly one evidence-driven correction and restarts the matrix.
