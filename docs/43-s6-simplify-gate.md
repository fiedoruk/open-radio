# 43 — S6 simplify gate

```text
SIMPLIFY GATE
Mode: max
Project: Open Radio Core2
Scope: S6 host network selector, recovery fixtures and local PL/EN onboarding portal
Boundary: Codex-native project only; no CC write, device mutation, real credential, router action, deploy or flash
Checks run: npm run check; 79 Node tests; 5 native renderer cases; deterministic clean builds; Playwright 390x844 PL/EN positive and negative flows; console/storage audit; visual screenshot inspection
Checks not run: real Core2 Wi-Fi, SoftAP/DNS, encrypted NVS, RF coexistence, captive-portal OS behavior, firmware build, Snyk

Findings
P0: none
P1: none in measured host scope
P2: device credential storage and SoftAP security are not measured; hardware/network adapters do not exist yet
P3: the portal is a responsive host representation, not a pixel-identical 320x240 device screen

Applied: remembered secured profiles bypass credential re-entry; non-array inputs fail cleanly; future success timestamps receive no scoring bonus; network labels render through text nodes instead of innerHTML; favicon 404 removed; added regression tests and privacy audit hook
Deferred: actual Wi-Fi driver, private credential store, DHCP/DNS portal, reconnect timing and RF soak
Regression risks: firmware adapters may accidentally expose identity or diverge from deterministic scoring; browser password-manager behavior must be rechecked in the embedded portal
Security/Snyk: no secret material, remote call or browser storage write observed; scanner not required for this dependency-free host slice
Deploy-readiness: not applicable; no public service or device binary
Verdict: PASS WITH RISKS
Rationale: software-only S6 exit conditions are measured and green; all remaining risks require device/network implementation or hardware
Next required step: deliver the broad S7 firmware RC0 and hardware-ready integration milestone behind license and no-flash gates
```
