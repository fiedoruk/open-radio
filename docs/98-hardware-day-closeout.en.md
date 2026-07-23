# Hardware day closeout — 2026-07-15

## Outcome

The M5Stack Core2 now boots the guarded hardware-lab image, restores an
approved Wi-Fi profile, starts an MP3 stream on the built-in speaker, then
connects the remembered Bluetooth Classic A2DP/SBC speaker and routes audio to
it. Display, touch, local audio, network time and Bluetooth playback were
physically observed during the first hardware day.

This is an operational lab candidate, not a public release. The repository
still requires the complete recovery matrix, battery/SD checks and the later
eight-hour gate before a release or broad compatibility claim.

## Evidence and recovery boundary

- Factory firmware `v2.4` (`20250703`) passed the pre-flash display, touch and
  built-in-speaker baseline.
- The target identifies as ESP32-D0WDQ6-V3 revision 3.1 with a 40 MHz crystal,
  16 MB flash and PSRAM.
- A complete private 16 MiB factory image and checksum were created and
  verified before the first write.
- Every write used `scripts/core2-device-action.sh`; no full erase, eFuse,
  rollback write, OTA, public upload or release action occurred.
- The final lab artifact built on 2026-07-15 has SHA-256
  `04ce1c2aa5b169774464044d5fba83292be09538f3041dfc13bb179ea4efefe9`.

## Defects found and closed on hardware

1. Favorite persistence overflowed the Arduino loop-task stack during boot.
   Large working arrays moved to explicit PSRAM allocations.
2. Native RGB565 pixels were uploaded with the wrong byte order. The display
   path now sets the M5GFX swap mode explicitly before the first image.
3. Onboarding navigation and the QR path were reordered; the local setup QR is
   large and the three capacitive circles share one A/B/C action path with the
   UI controller.
4. Brightness updates repeatedly changed speaker gain. Hardware brightness and
   volume are now independently cached and applied only when their own value
   changes; both sliders use continuous drag with one persistence write on
   release.
5. The clock used stale RTC/UTC data and an incorrect daylight-saving rule.
   Optional SNTP now writes Europe/Warsaw local time only after a completed
   sync; the current device log reported the correct CEST hour.
6. Weather was inaccurate and harmed the minimal screen. It was removed from
   the device UI and runtime by owner decision; it is not a playback or boot
   dependency.
7. Local speaker draining discarded PCM that M5Unified had not accepted. PCM
   is now peeked and discarded only after a successful hardware write, with
   two staged speaker blocks and starvation telemetry.
8. Station artwork downloading blocked playback and could freeze after a
   failed logo. It now runs as a bounded background task, is disabled while
   playback is critical, retries missing items and reports redacted stages.
9. Bluetooth treated temporary A2DP queue backpressure as a disconnect and
   returned to the built-in speaker. Routing now follows the real connection
   callback and the source callback always supplies the requested SBC PCM
   frame count, padding transient gaps with silence.
10. Wi-Fi association and Bluetooth initialization overlapped in the smallest
    DRAM window. Remembered Bluetooth now starts only after the first decoded
    audio proves Wi-Fi, resolver and stream health.
11. The A2DP producer held a critical section while copying a full audio block.
    Writes are now split into 256-frame critical sections.
12. The pinned ICY parser could wait forever on a truncated metadata block.
    The reproducible dependency-workspace patch limits each metadata wait to
    500 ms and hands recovery to one bounded source reconnect plus the outer
    station backoff.
13. Timeout recovery repeatedly destroyed and restarted the A2DP stack while
    library callbacks still owned Bluetooth state. The final image starts one
    Classic-only Bluetooth stack per boot, assigns reconnect ownership to one
    outer supervisor, routes only after `AUDIO_STARTED`, and uses a PCM-pull
    watchdog without tearing the stack down.
14. One MP3 decoder call could fill the complete decoded ring and block the UI
    loop for seconds; the local fallback could also strand a partial block that
    was too large to refill and too small to drain. Decoder low/high watermarks
    now bound foreground work, while the local low watermark always admits one
    complete speaker block.

## Audio and memory result

The decoded PCM ring and Bluetooth PCM reserve each hold 131,072 stereo frames
in PSRAM. The Bluetooth reserve is about 2.97 s at 44.1 kHz; decoder low/high
watermarks keep ordinary foreground decode near 8,192–16,384 frames instead of
filling that entire reserve in one loop pass. Station changes explicitly clear
the queues so old-station audio is not retained.

The closing short-soak telemetry reported:

- stream starts: 2; start failures: 0; stops: 1; latest start time: 3,574 ms;
- Bluetooth stack starts: 1; connect attempts: 1; media starts: 1;
- Bluetooth retries: 0; fallbacks: 0; PCM pull watchdogs: 0;
- Bluetooth buffered PCM: 129,920 frames; PCM pull callbacks: 73,233;
- active Bluetooth silence: 10,368 frames (about 235 ms), added during one
  initial source restart and unchanged in the following periodic samples;
- idle Bluetooth silence: 156,544 frames, outside active media playback;
- steady internal DRAM free: 27,468 B; historical minimum: 11,840 B;
- largest internal DRAM block: 15,860 B;
- loop stack high-water mark: 4,104 words;
- PSRAM free: about 2.44 MB; historical minimum: about 2.43 MB;
- steady decoder-loop stalls: approximately 79–88 ms, with occasional display
  flushes raising the complete loop to about 99–170 ms.

The previous image reached a historical `dram_min=484` B. Explicitly releasing
BLE controller memory and initializing Classic-only Bluetooth, together with
the single-lived stack, raised the measured minimum to 11,840 B in the closing
run. A long soak must still prove that the minimum and largest free block do not
degrade over time.

## Build and host quality gate

- Complete repository check: PASS.
- Node tests: 188/188 PASS.
- Firmware host suites: PASS.
- Renderer: 17 cases, 28 screens, 112 variants PASS; deterministic output PASS.
- UI/controller parity, schema, overflow, privacy surface, dependency lock and
  documentation parity checks: PASS.
- Hardware-lab build: 2,364,917 B application flash; 2,371,488 B firmware
  binary.
- The final guarded flash reran the complete repository check before upload,
  verified every written segment and completed a hard reset.
- `git diff --check`: PASS.

## Station, metadata and artwork status

- The embedded catalog contains nine MP3-compatible Polish entries and boots
  without a remote catalog.
- ESKA uses the verified 128 kb/s MP3/ICY endpoint for the operational path.
  The HLS/HE-AAC engine builds in the hardware-lab variant but is not the
  release catalog path and has not passed endurance.
- ICY `StreamTitle` is supported when the broadcaster sends it. Absence of a
  title is not synthesized.
- Automatic live cover art is not universal radio metadata. A future optional
  resolver may use broadcaster APIs, RadioDNS/SI or a replaceable public music
  lookup, but it must remain cached, failure-isolated and outside playback.
- This dated snapshot still described a local logo-download action. S26 later
  removed that runtime at the owner's request; the hardware-lab lane now uses
  an optional build-time logo pack as documented in docs/104.

## Remaining gates

1. On 2026-07-16, complete and record a fresh 60-minute MP3-to-Bluetooth
   endurance run with zero growth in active silence after startup and no reset,
   disconnect or memory trend. The owner explicitly deferred this incomplete
   gate at the end of the 2026-07-15 session.
2. On 2026-07-16, power-cycle the Bluetooth speaker five times; prove immediate
   local fallback and bounded automatic A2DP recovery.
3. Interrupt and restore the approved Wi-Fi network five times; prove stream
   recovery without losing the remembered speaker.
4. Switch through all nine stations and verify title behavior per operator.
5. Historical and superseded: the all-logo download test was removed with the
   S26 runtime. No current recovery gate downloads station logos.
6. Complete PMU/internal-battery, external power-bank and SD smoke tests. USB-C
   power banks do not expose a standard charge percentage to Core2; only local
   PMU facts can be shown reliably.
7. Run the eight-hour soak, power interruption and corrupt-config recovery gate
   before any release image or hardware compatibility matrix claim.

## Operational verdict

`PASS WITH RISKS` for supervised lab use. The current device is usable for
continued listening and recovery tests. H4 is not passed: the 60-minute and
speaker restart evidence was deferred to 2026-07-16. Public release remains
blocked until the remaining physical gates above are recorded. Standards-based Bluetooth
Classic A2DP/SBC interoperability is the only intended compatibility claim;
Bluetooth LE Audio-only speakers remain out of scope.
