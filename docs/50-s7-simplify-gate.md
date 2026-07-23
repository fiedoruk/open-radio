# 50 — S7 simplify gate

```text
SIMPLIFY GATE
Mode: max
Project: Open Radio Core2
Scope: S7 toolchains, public firmware RC0, ESP-ADF reference, host application contracts, dependency/release QC and hardware-arrival packet
Boundary: Codex-native project and Codex control-plane only; no private-workspace write, real credential, network join, serial access, flash, publish or deploy
Checks run: pinned ESP-ADF v2.8 official example build; two empty-cache public Core2 builds; binary hash equality; public linker-map codec scan; resource budgets; firmware surface scan; npm run check with 82 Node tests, 5 renderer cases and 14 firmware cases; 13-scenario fault matrix; source-only release rehearsal and negative artifact gate; JSON/shell syntax; registry/dashboard checks
Checks not run: Core2 boot/display/touch/speaker, real MP3 playback, A2DP pairing, Wi-Fi/BT coexistence, NVS credential storage, heap/stack/underrun telemetry, powerbank behavior, 1/2/8/24-hour soak, public release, Snyk

Findings
P0: none
P1: none in the measured compile/host/release-rehearsal scope
P2: actual storage/network/resolver/onboarding adapters still need S8 golden-vector parity; all runtime audio/RF/power claims remain hardware-blocked; public binary remains blocked until hardware and corresponding-source verification; the repository still has no first commit and all project files are untracked
P3: the ADF reference graph emits upstream deprecation warnings and is intentionally not candidate-quality; bootstrap requires existing uv and the ADF reference additionally requires Docker

Applied: selected the smaller pinned Core2 lane; removed the unnecessary Audio Tools layer; filtered ESP32-A2DP to Source files and ESP8266Audio to HTTP/ICY/MP3/libmad; added bounded URL/OOM handling; protected the cross-task A2DP queue; generated all onboarding/catalog assets; added exact locks, budgets, SBOM, notices, secret/endpoint/artwork/codec gates, deterministic builds, release-negative gate, application fakes and hardware rollback packet
Deferred: real service adapters to S8; runtime heap/stack/queue telemetry and device compatibility to the hardware matrix; HLS/HE-AAC remains excluded; public publication remains a separate owner gate
Regression risks: Arduino/ESP32 library updates may invalidate the compatibility/source filters; synchronous HTTP and decoder behavior may expose RF or heap limits only on device; an immutable appliance still depends on external broadcaster/TLS behavior
Security/Snyk: public firmware sources contain no embedded endpoint, credential, MAC/BSSID or third-party artwork; link map contains no forbidden codec symbol; no dependency-bearing web application change or supported Snyk target justified a scan
Deploy-readiness: not applicable; source bundle was rehearsed locally with zero binary/cache/private artifact and nothing was published
Verdict: PASS WITH RISKS
Rationale: every S7 software-only exit condition is measured and green, but hardware reliability and public-binary eligibility cannot be promoted from a compile
Next required step: after owner continuation, execute broad S8 service parity; when Core2 arrives, request the separate T3 backup/flash gate and run H0 through H4 in order
```
