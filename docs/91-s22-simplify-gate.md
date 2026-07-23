# S22 simplify gate

SIMPLIFY GATE
Mode: max
Project: Open Radio Core2
Scope: gray device mockup, direct volume control, removal of the station-artwork gate and Kiara screensaver asset
Boundary: software-only; no device action, public release, cloud, OTA, telemetry or unlicensed station artwork
Checks run: focused JS/C++ tests, JS/C++ controller parity, geometry and 44-pixel hitbox validation, PL/EN docs parity, deterministic renderer, browser screenshot smoke, five firmware variants, reproducible public candidate, full repository check
Checks not run: physical display/touch/audio/Wi-Fi/Bluetooth tests, 60-minute endurance, 8-hour soak, power interruption and corrupt-config recovery on a real Core2

Findings
P0: none
P1: none in changed code
P2: physical touch calibration, volume curve and animation cost remain unmeasured until H1
P3: an official station-logo pack remains unavailable because no complete permission manifest exists

Applied: reused the shared renderer/controller, added explicit screens instead of hidden cycling, compiled Kiara into 154 fixed runs, retained original monograms, added source ownership and deterministic checks, and covered new interactions in parity and hitbox tests
Deferred: any official-logo download implementation and every hardware claim
Regression risks: low in software; the new cat animation adds 154 bounded fill operations per frame at the existing 12 FPS cap, while firmware remains at 33.7% flash and 2.6% RAM
Security/Snyk: no new endpoint, credential, parser, telemetry or dynamic asset loading; Snyk was not needed for this dependency-neutral change
Deploy-readiness: source and firmware builds are reproducible, but physical deployment remains blocked by the hardware-arrival gate
Verdict: PASS WITH RISKS
Rationale: software behavior, rendering, ownership and build budgets are measured and green; remaining risks are exclusively physical-device measurements
Next required step: run H1 display/touch/speaker/battery smoke on the arrived M5Stack Core2, then the 60-minute recovery endurance gate
