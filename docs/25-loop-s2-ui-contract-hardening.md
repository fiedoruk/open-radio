# 25 — Loop S2: UI contract hardening

**Status:** COMPLETE
**Mode:** BUILD / SOFTWARE-ONLY
**Owner:** engineering agent
**Hardware evidence:** not required and not claimed

## Goal

Turn the 320x240 simulator baseline into a strict, portable UI contract that can
later be consumed by the host renderer and M5Stack Core2 firmware without
embedding browser-only behavior or undocumented touch logic.

## Stream 1 — Contracts and boundaries

1. Define JSON Schema 2020-12 documents for `UiSnapshot` and `UiCommand`.
2. Add focused runtime validators with explicit rejection reasons.
3. Build a pure `createUiSnapshot()` projection between reducer state and UI.

## Stream 2 — Data-driven interaction

4. Move every touch rectangle into a versioned hitbox layout document.
5. Resolve repeated city, speaker, station and settings targets from templates.
6. Make the Canvas renderer consume a snapshot and resolved hitboxes only.

## Stream 3 — Fixture and text coverage

7. Add the complete system-state x locale x output fixture matrix.
8. Cover onboarding, recovery, fallback and safe-mode command paths.
9. Add deterministic text-slot definitions and overflow auditing.

## Stream 4 — QC and control plane

10. Add schema acceptance and rejection tests, including unknown commands.
11. Run contract validation, state tests, overflow audit and browser smoke.
12. Synchronize roadmap, mission, status and evidence after the exit gate passes.

## Exit condition

The loop is complete only when all of the following are true:

- both schema documents are valid JSON and referenced by project tooling,
- valid snapshots and commands pass while malformed and unknown variants fail,
- the renderer does not import or call the reducer,
- all Canvas touch behavior comes from the hitbox data document,
- every system state has PL/EN and BT/local fixture coverage,
- longest supported copy passes the declared 320x240 text-slot audit,
- focused Node tests, project checks and browser smoke pass,
- no hardware compatibility or visual-parity claim is introduced.

## T3 and hardware boundary

This loop may edit only local project files and run local tests. It must stop
before firmware flashing, public release, dependency publishing, remote account
actions or any claim that requires the physical Core2 display, touch controller,
speaker, power path, Wi-Fi radio or Bluetooth radio.

## Evidence artifacts

- `ui-contract/schemas/ui-snapshot.schema.json`
- `ui-contract/schemas/ui-command.schema.json`
- `ui-contract/layout/hitboxes.json`
- `ui-contract/layout/text-slots.json`
- `ui-contract/fixtures/ui-matrix.json`
- focused tests under `tests/`
- exact 320x240 browser screenshots under `output/playwright/`

## Completion evidence

- `npm run check`: PASS,
- UI validator: viewport 320x240, 9 stations, 20 matrix fixtures and 8 hitbox screens,
- overflow audit: 62 checks across 10 text slots,
- Node test suite: 22/22 PASS,
- browser flow: onboarding, station selection, settings and recovery PASS,
- browser console: 0 errors and 0 warnings,
- screenshot: `output/playwright/08-s2-first-boot-320x240.png`, verified 320x240.
