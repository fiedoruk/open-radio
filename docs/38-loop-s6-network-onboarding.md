# 38 — Loop S6: local network onboarding and recovery

**Status:** COMPLETE
**Mode:** BUILD / SOFTWARE-ONLY
**Owner:** engineering agent
**Start gate:** satisfied by owner `myśl i działaj` on 2026-07-13

## Goal

Build a browser-testable, local-only Wi-Fi onboarding model that can remember
multiple approved networks, select a reachable known profile and recover after
loss without ever autojoining an unknown or open network.

## Stream 1 — Network contracts and selection

1. Define schemas for scan results, opaque remembered profiles and selection results.
2. Model up to eight profile references with priority, health and last success.
3. Reject unknown, open and captive-portal networks from automatic selection.

## Stream 2 — Local onboarding prototype

4. Build a static PL/EN captive-portal mock with the exact minimal first-run flow.
5. Keep submitted passwords ephemeral; fixtures, logs and browser storage contain none.
6. Start the first radio state immediately after Wi-Fi, before optional city and Bluetooth.

## Stream 3 — Recovery and persistence integration

7. Implement deterministic known-network scoring from reachability, approval and health.
8. Model disconnect, bounded rescan, profile fallback and return to the preferred network.
9. Restore opaque profile references through the completed S5 persistence contract.

## Stream 4 — Security, browser QC and governance

10. Validate inputs, redact diagnostics and define captive-portal/DNS boundaries.
11. Run PL/EN browser flows, keyboard/mobile accessibility and negative network scenarios.
12. Run complete offline regression and synchronize architecture and control-plane evidence.

## Exit condition

- onboarding completes locally without account, cloud or phone application,
- only explicitly approved secured profiles can be selected automatically,
- unknown/open/captive networks produce a local prompt and never silent autojoin,
- password values never enter fixtures, logs, URLs, localStorage or generated traces,
- loss of the active network triggers bounded selection among remembered profiles,
- first-sound ordering remains Wi-Fi first, optional city and Bluetooth later,
- PL/EN browser flows pass accessibility, responsive and console gates,
- tests remain offline; real Wi-Fi radio behavior waits for Core2 hardware.

## T3 and hardware boundary

No real credential entry, OS Wi-Fi mutation, router action, DNS interception,
firmware flash, cloud portal or production network. The local browser prototype
uses synthetic scans and in-memory values only.

## Completion evidence

- network profile, scan and selection schemas,
- pure scoring/recovery model with deterministic clock and nine sanitized traces,
- local PL/EN onboarding prototype at `/network-onboarding/`,
- 79/79 Node tests and 5/5 native renderer cases,
- deterministic renderer hash `121b2e3e0fd94a44`,
- Browser QC at 390x844: PL open block, EN captive block, EN first-sound and completion,
- zero Browser console errors/warnings and zero local/session storage entries,
- privacy and recovery contracts in `docs/41-network-selection-contract.md` and `docs/42-local-onboarding-privacy-contract.md`,
- max-mode verdict `PASS WITH RISKS` in `docs/43-s6-simplify-gate.md`.
