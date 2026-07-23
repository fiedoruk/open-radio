# 84 — S19 Simplify Gate

SIMPLIFY GATE

Mode: max

Project: `the repository root`

Scope: bounded IP-location, weather and optional time adapters; fresh/stale
cache supervisor; global configuration suggestions; persisted screensaver and
screen-off settings; firmware DeviceConfig DTO parity; V3 opportunity study.

Boundary: software-only implementation and Browser QA. No device network
binding, flash, physical TLS/audio measurement, release or publication.

## Checks

- full `npm run check`,
- 157/157 Node tests,
- 10 native renderer tests plus deterministic framebuffer,
- 90 firmware-host tests,
- GUI contract, persistence, network, catalog and documentation parity,
- text overflow and 44-pixel touch gates,
- two deterministic RC1 source rehearsals,
- Browser flow for Display settings, persistence after reload, screensaver
  preview, screen-off and touch wake,
- `git diff --check`.

## Findings

P0: none.

P1: none.

P2: the physical Core2 network binding remains unimplemented until TLS memory,
scheduler contention and continuous audio during timeout are measured. Actual
screensaver frame rate, panel-off behavior and touch wake also remain physical
evidence.

P3: Wi-Fi positioning remains disabled by default until a provider, credential
placement and BSSID disclosure are approved. Microphone and IMU ideas remain V3
research, not active runtime features.

## Simplifications applied

- one generic bounded supervisor owns retry, fresh cache and stale fallback,
- provider adapters return normalized facts and never mutate playback state,
- one Display profile owns GUI, persistence policy and firmware DTO values,
- bounded enumerations replace free-form timer entry,
- the Display page reuses the existing six-card settings geometry,
- Open-Meteo attribution is visible in About Pro,
- V3 ideas are isolated from the current radio contract.

Security/Snyk: no dependency was added, no secret is stored and the existing
firmware surface scan reports zero secrets. Snyk is not required for these local
JavaScript/C++ contract changes. External data egress remains explicit.

Deploy-readiness: not a deployment. Device, flash, release and publication gates
remain closed.

Verdict: PASS WITH RISKS.

Rationale: every host-testable S19 behavior is implemented, persisted and green.
The remaining risk is exclusively physical provider binding and display/audio
coexistence on Core2, which cannot be promoted from a simulator result.
