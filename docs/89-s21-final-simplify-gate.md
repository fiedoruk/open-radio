# S21 final Simplify Gate

SIMPLIFY GATE
Mode: max
Project: Open Radio Core2
Scope: canonical 320×240 GUI, host simulator, touch/controller flow, local Wi-Fi onboarding, MP3 runtime, local-speaker fallback and Bluetooth A2DP Source candidate
Boundary: software-only review inside this repository; no device flash, public release, production action, secret access or write outside the project
Checks run: full `npm run check`; 170 Node tests; 15 renderer cases across 26 screens and 104 variants; 7 C++ UI-controller cases; 53 JS/C++ parity snapshots; 62 overflow checks; five PlatformIO firmware variants; two clean reproducible public builds; endpoint/secret/artwork surface gate; EN/PL parity; browser render and interaction smoke; `git diff --check`
Checks not run: physical FT6336U touch calibration, LCD inspection, audio/RF coexistence, heap and stack probes, speaker interoperability, power interruption, 60-minute or 8-hour endurance; no device was connected and no Snyk scanner is configured for this embedded C++ lane

Findings
P0: none
P1: none remaining; the open onboarding AP, premature last-known-good write, broad Bluetooth model match and non-working home-variant handoff were fixed before this verdict
P2: synchronous Wi-Fi scans are bounded to 300 ms and RMF TLS discovery to 5 s, but their physical effect on touch latency and audio continuity is not measured; operator MP3 audio continues over HTTP after CA-verified discovery; Wi-Fi/A2DP coexistence and both owner speakers remain hardware-only evidence
P3: TOK FM remains parser-pending and three HLS/HE-AAC stations remain explicitly unsupported; this is visible product scope rather than hidden failure

Applied: bundled Inter 600 replaced the serif atlas; one exact C++ RGB565 renderer now drives firmware and the device mockup; left accent strips were removed; both home variants persist; Kiara, favorites, display controls, touch gestures and A/B/C shortcuts share tested controller logic; onboarding now uses a random per-boot WPA2 code shown on-device; known Wi-Fi profiles, bounded retries, real MP3 startup, local fallback and constrained A2DP selection are integrated; last-known-good is persisted only after decoded audio; the explicit firmware size gate is 2.25 MiB
Deferred: physical H0-H4 validation, asynchronous network-operation redesign if hardware latency requires it, TLS-capable audio transport if broadcaster endpoints support it, TOK parser and any legally/resource-cleared HLS/HE-AAC path
Regression risks: hardware touch transforms may differ at glass edges; blocking network calls may temporarily delay UI; local and Bluetooth output queues may underrun under RF contention; broadcaster endpoints can change independently of source
Security/Snyk: local review found no committed credential, telemetry path, unapproved host, `setInsecure`, unknown/open-network autojoin or third-party station artwork; the onboarding credential now crosses only a random WPA2 local AP and is cleared in the browser; Snyk was not run because no supported/configured embedded C++ scanner exists in this project
Deploy-readiness: source is reproducible and push-ready, but device flashing and any release remain blocked by the explicit hardware gate; rollback starts with a full 16 MiB factory backup
Verdict: PASS WITH RISKS
Rationale: all software gates and builds are green, remaining risks require the actual Core2 display, touch controller, radios, speakers and power path rather than more host simulation
Next required step: on hardware arrival run H0 backup, H1 display/touch/local-audio smoke, H2 Wi-Fi/stream recovery, H3 Xiaomi and MOZOS A2DP qualification, then H4 endurance and power recovery
