# 105 — Final gift build and QC-9 closeout

[Polska wersja](105-final-gift-build-and-qc9-closeout.pl.md)

**Date:** 2026-07-17
**Device source commit:** `b198e0a` — `Rotate Eska between smcdn hosts instead of pinning one`
**Lane:** `core2-hardware-lab`
**Private-use verdict:** `OWNER ACCEPTED / GIFT READY / IN PRODUCTION USE`
**Release verdict:** `NOT A PUBLIC RELEASE OR H4 PASS`

This is the final dated record for the device after the 2026-07-17
stabilization and nine-station smoke-QC. Commit `c339b2a` was an intermediate
instrumented point in the same line. The final device image was built from
`b198e0a`, which was `HEAD main` before this documentation-only closeout. The
cube is unplugged from the development host and operates with its Bluetooth
speaker as a gift.

## Accepted product behavior

- MP3 128 kb/s is the default source deck. The hardware-lab lane retains an
  HE-AAC/aacp deck as automatic fallback after repeated MP3-candidate failures;
  the public lane remains MP3-only until its separate legal/resource gate.
- Every stream-death path clears the active endpoint. A declared dead source
  can reopen after 2 seconds, candidate rotation continues, and Eska rotates
  between its available smcdn hosts instead of pinning one.
- The remembered Bluetooth Classic A2DP/SBC speaker reconnects automatically.
  Explicit scan accepts audio/rendering Class-of-Device; during the pairing
  window an inbound compatible speaker can be adopted and remembered. No
  model-name allowlist is used.
- Bluetooth coexistence is in the balanced mode. The built-in Core2 speaker is
  the mandatory fallback while bounded reconnect attempts continue.
- “Now playing → Save” works on every station: selection seeds the title with
  the station name and real ICY StreamTitle replaces it when available.
- Runtime station-logo networking is removed. The hardware-lab lane may embed
  the optional build-time 9/9 logo pack; public builds keep project-owned
  placeholders.
- The owner accepted MP3 playback over Bluetooth as clean in the final listening
  check. The cube and speaker form the intended self-contained gift setup.

## Stabilized runtime invariants

The active reserve model is the one frozen in
[docs/104](104-cc-stabilization-closeout.en.md), not the older models in
docs/99, docs/100 or docs/103.

| Mechanism | Current value |
|---|---:|
| Decoder work per owner-loop pass | 8,192 frames |
| Local fallback reserve floor | 44,100 frames / 1 s |
| Standby target before Bluetooth media | 88,200 frames / 2 s |
| Decoded reserve required for retry | 44,100 frames / 1 s |
| Bluetooth recovery cadence | randomized 8–20 s |
| Dirty-dial watchdog | 6,500 ms |
| Owner-loop task watchdog | 30 s |

Monolithic decoder refill, reserve gates above the live-stream burst
equilibrium and page scan during an active dial are not part of this model.
Those earlier mechanisms caused dead touch, minutes-long dial deferral or stale
timeout teardown of a connection won by inbound Bluetooth.

## Measured transport limits

- In poor Wi-Fi/Bluetooth coexistence waves, the measured LWIP TCP path delivered
  about 12–14 KB/s. A 128 kb/s MP3 needs 16 KB/s; a 48 kb/s AAC source needs
  about 6 KB/s. Buffer tuning cannot replace missing transport bandwidth.
- `WiFi.setSleep(false)` while Bluetooth is active caused a controller abort.
  It is rejected as a mitigation.
- HE-AAC+SBR decoding could still disturb A2DP transmission even with full
  queues and zero injected-silence growth. This is why MP3 returned to the
  default deck and aacp remains fallback-only.
- A rare LWIP DNS/connect timeout ladder can hold one loop pass for about
  16–17 seconds. QC-9 observed a 17.1-second maximum once in 15 minutes. It is
  documented and intentionally unchanged; DNS caching is a separate decision.

## QC-9 station matrix

Capture `cc-qc9-all-stations` ran for 900 seconds over Bluetooth on build
`b198e0a`. Each station window was nominally 90 seconds and included roughly
10–20 seconds of expected switch/rebuffer transition. Injected silence is
reported at 44,100 frames per second.

| Station | Injected silence in window | Stream deaths/reopens | Verdict |
|---|---:|---:|---|
| RMF FM | 0; local route while Bluetooth was still dialing | 0 | OK, no BT listening verdict |
| Radio ZET | 0 | 0 | **CLEAN** |
| Antyradio | about 5.8 s, transition plus two deaths | 2 | OK with one rough period |
| Meloradio | about 1.9 s, transition only | 0 | **CLEAN** |
| Złote Przeboje | about 1.8 s, then 0 | 1 | **CLEAN** |
| Radio Chilli | about 5.8 s, transition plus slow start | 3 | OK with one rough period |
| RMF MAXX | 0, then about 9.3 s from two steady-state edge deaths | 2 | OK; thin evening edge |
| Eska | about 9.4 s on thin ic1 start/recovery | 1 | OK; host rotation worked |
| RMF MAXX Club | about 33 s in a 150 s observation, 22% | 3 | **WEAKEST**; thin MP3 edges |

No station remained stuck. Every stream death ended in automatic recovery
through the 2-second source-dead reopen, endpoint rotation and queue refill.
This is a smoke-QC result under variable RF/CDN conditions, not a full soak.

## Honest interpretation

- The accepted private gift build is operational: touch, automatic Bluetooth,
  MP3 playback, station switching, favorite saving and self-recovery were
  observed in the stabilized line.
- Radio ZET, Meloradio and Złote Przeboje were clean in their QC-9 windows.
- RMF MAXX Club is the weakest measured source. The current fallback deck can
  reach aacp only after traversing ten MP3 candidates; a smaller threshold is a
  future measured firmware change, not part of this closeout.
- RMF FM has no Bluetooth verdict in QC-9 because its window completed on the
  local route while Bluetooth was still dialing.
- QC-9 does not certify every station edge, RF environment, future speaker or
  power source. It proves bounded recovery across the current nine-station
  matrix on the accepted gift-build line.

## Scope and remaining gates

This closeout authorizes no device action. The cube is in production use and no
flash, serial monitor, reset or firmware mutation belongs to this documentation
task.

The following remain separate gates:

1. PMU, internal-battery, SD and external power-bank qualification.
2. Forced Wi-Fi and stream recovery matrix under controlled conditions.
3. Fresh 60-minute, two-hour, eight-hour and 24-hour endurance rungs.
4. Per-model A2DP/SBC and power-output qualification for additional speakers.
5. Public-candidate rebuild, dependency/license review and public release
   qualification.

Private gift-build acceptance must not be represented as universal Bluetooth
compatibility, H4 completion or public release readiness.

## Documentation precedence

For the current gift build, this document and docs/104 supersede the active
candidate, reserve-model and next-step statements in docs/93, docs/94, docs/96,
docs/98, docs/99, docs/100 and docs/103. Those files remain dated evidence. The
current summary is also reflected in `STATUS.md` and `CURRENT-MISSION.md`.
