# S23 — connectivity menu correction

## Verdict — implemented

The browser cannot access the Core2 Wi-Fi or Bluetooth Classic A2DP radio, so
RF discovery remains simulated. S23 closes the real UI-to-runtime wiring gaps
without claiming that browser RF simulation is physical validation.

## Corrections

- The connected Wi-Fi CTA toggles the local `OpenRadio-Setup` portal. AP+STA
  mode preserves the current approved station connection and audio; the portal
  cannot be disabled while no station connection exists.
- The active portal screen shows `OpenRadio-Setup`, the generated local WPA2
  code and a close action. Credentials remain outside logs and Git.
- Portal routes accept clients only through the Core2 access-point interface;
  clients on the existing LAN receive `403`. A failed AP start is not reported
  as active and remains retryable.
- New Wi-Fi credentials stay in volatile pending memory until the ESP32 confirms
  a connection. Only then are all profiles committed as one bounded checksummed
  NVS blob. Failed profiles are skipped so another known network can recover.
- A second form submission is rejected while a connection attempt is pending.
  A failed NVS commit leaves onboarding open instead of restarting into a
  configuration that cannot reconnect.
- Bluetooth uses one shared idle/scanning/found/connecting/connected/error
  model in JavaScript, C++ controller and RGB565 renderer.
- A repeated user scan cleanly stops the pinned A2DP implementation, immediately
  selects local-speaker output and starts discovery again. A timed-out scan can
  be retried.
- A bounded one-entry FreeRTOS queue projects the selected candidate name from
  the Bluetooth callback task to the UI owner loop.
- The speaker name and remembered flag are persisted only after a connected
  callback. Found, connecting and error states never persist a speaker.
- Connection timeout covers discovery and the post-discovery connection attempt;
  a late UI timer cannot overwrite an already connected state.
- Missing or invalid remembered-speaker identity is repaired to the idle state;
  neither firmware nor emulator remembers a connection without a device name.
- Browser RF is labelled `RF demo` outside the device framebuffer and advances
  through deterministic states without claiming access to host radio hardware.

## Verification

- Focused connectivity/UI tests: PASS.
- JS/C++ controller parity: 8 scenarios and 61 snapshots, PASS.
- Firmware host tests: 4 + 27 + 24 + 18 + 17 + 10 cases/vectors, PASS.
- Renderer: 17 cases, 28 screens and 112 theme/locale variants, PASS.
- Deterministic firmware: two matching builds, PASS.
- `firmware.bin`: 2,281,136 bytes; SHA-256
  Historical S23 hash: `664762412ebbf840a7cb9051defcc216d1e8e82d8b473f5e4cd3c75296de6a3c`.
  The final operational candidate is recorded in `release/rc1-candidate.json`.
- Static RAM: 116,260 bytes of 4,521,984; application flash: 2,274,557
  bytes of 6,553,600.
- GitHub Actions: required for the pushed S23 commit.

## Boundary

No live Wi-Fi credential, Bluetooth pairing, serial access, flash, public
release or hardware compatibility claim is part of this software correction.
Physical touch, RF coexistence and reconnect behavior remain H1–H3 measurements.
