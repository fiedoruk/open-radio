# Automation, secure reset and flash day report — 2026-07-16

[Polski](102-automation-secure-reset-flash-day-report.pl.md)

## Outcome

The exact S26 public candidate was built reproducibly, flashed through the
guarded device workflow and passed a short redacted boot-to-Bluetooth-media
smoke. It restored local state, started the known secured Wi-Fi and MP3 path,
kept the built-in speaker as fallback and reached the remembered A2DP/SBC
speaker without a touch action.

This is a flash and short-smoke PASS, not the 3/3 reconnect matrix, 60-minute
endurance gate or a public release. The destructive secure-reset action was
covered by host tests and visual QA but deliberately was not executed on the
physical cube because it would erase the profiles needed for this smoke.

## Product changes closed today

- Bluetooth starts automatically after healthy buffered local playback. A
  remembered address wins; with no remembered peer, model-agnostic Classic
  audio/rendering discovery starts and retries automatically.
- Reconnect has one owner. It never starts a second source dial before the
  lower A2DP callback closes the previous attempt. Retry pauses use bounded
  8–20 second jitter to avoid phase-lock with a speaker's own page schedule.
- Up to eight approved secured Wi-Fi profiles remain local and are selected
  automatically. Unknown, open and captive networks are never autojoined.
- Same-phone hotspot onboarding can stage credentials in RAM before the
  hotspot becomes visible and commits them only after a real secured connect.
- Settings now has a two-touch red-confirmed local reset. It erases the default
  NVS partition: Wi-Fi profiles, Bluetooth identity/bond, favorites,
  configuration and cached application state, then restarts into onboarding.
- Favorite rows play the saved station again. Runtime station-logo download,
  decoding and cache were removed; project-original monograms, station colors
  and Open Radio blue remain.

The frozen PCM buffers, decoder pump, fallback reserve, volume/AVRCP policy,
routing and standby-media gate were not modified.

## Exact artifact and guarded flash

- Firmware SHA-256:
  `ac3bda385a1300558463f1a31ddae1ddcadf062a95595fef80164aa85f583950`.
- Binary: 2,232,656 bytes; application flash: 2,226,085 bytes; static RAM:
  68,516 bytes.
- Two clean builds were byte-identical.
- Target preflight reconfirmed ESP32-D0WDQ6-V3 revision 3.1 and 16 MB flash.
- The private verified 16 MiB factory backup remained available.
- Every bootloader, partition, boot-app and application write reported
  `Hash of data verified`; the tool completed a hard reset.
- Existing NVS was preserved by the flash.

## Redacted physical smoke

After the monitor-induced reset, local MP3 started and the full decoded reserve
filled before Bluetooth started in remembered mode. The first dial ended as a
clean page timeout after 5,150 ms while the sink was not ready. The sink then
raised an inbound ACL; the supervisor immediately scheduled the normal source
profile dial, which reached A2DP CONNECTED in 423 ms. The standby reserve filled
and media started automatically.

The periodic sample after media start reported:

- route: Bluetooth; media starts: 1; stack starts: 1; connect attempts: 2;
- local starvation: 0; active Bluetooth silence: 0; pull watchdogs: 0;
- Bluetooth buffer: 260,864 frames; decoded buffer: 225,536 frames;
- stream starts/stops/failures: 2/1/0; the source was running in the final
  samples and no active-silence growth followed the reopen;
- internal DRAM minimum: 19,720 B; PSRAM minimum: 569,787 B;
- final reported loop maxima settled near 90–99 ms.

## Quality gate

- Complete `npm run check`: PASS.
- Node tests: 197/197 PASS.
- Firmware host suites: PASS, including 11 UI-controller cases.
- Renderer: 17 cases, 28 screens and 112 variants; deterministic matrix PASS.
- EN/PL parity, overflow, schemas, dependency lock, privacy surface and
  hardware-readiness checks: PASS.
- Firmware surface: zero secrets, nine approved endpoints, five optional
  services and zero bundled station artwork.
- Targeted Snyk test of the root project: no vulnerable paths. The broader
  workspace scan separately found a High `yard` issue only in an mruby
  documentation example inside the shared `.tools/esp-adf` tree; that vendor
  example is outside the source artifact and flashed firmware.
- `git diff --check`: PASS.

## Open physical gates

1. Run three fresh speaker OFF/ready cycles on this exact SHA; each must return
   to audible Bluetooth automatically and show zero active-silence,
   starvation and pull-watchdog growth after media start.
2. Run the mandatory 60-minute MP3-to-A2DP endurance gate with one forced
   stream recovery and confirm stable memory.
3. Qualify the incoming Soundcore Boom Go 3i for actual Classic A2DP/SBC
   interoperability and separately verify whether its USB output can power the
   Core2. Product compatibility remains standards-based, not universal.
4. Complete PMU/battery, SD, Wi-Fi recovery and nine-station physical sweeps,
   followed later by the eight-hour release soak.

Until those gates pass, the correct verdict is: software and short hardware
smoke PASS; release BLOCKED.
