# 73 — Loop S15: canonical brand and clickable settings

**Date:** 2026-07-14

**Mode:** software-only

**Boundary:** local device UI only; no cloud, account, runtime asset download,
custom font, firmware flash, public release or hardware claim

**Later correction:** S18 clarifies that `no cloud` here means no mandatory
project-operated backend. Optional direct location, weather and time services
are allowed when failure-isolated and documented.

**Later correction:** S20 replaces the temporary 5×7 decision with the bundled
OFL-licensed Inter 600 atlas shared by firmware and the canonical emulator.

## Goal

Accept Signal Cube A2 as the product mark, remove the custom-font path entirely
and make routine configuration reachable through simple touch actions instead
of source edits or manual project work.

## Delivered

- Signal Cube A2 selected as the only active logo,
- inactive logo alternatives removed from the active source tree,
- browser system stack and deterministic firmware 5×7 typography declared as
  the then-current built-in path, superseded by S20,
- font files, font-face loading, private font path and license gate removed,
- quick settings for Wi-Fi, Bluetooth, volume, brightness, theme and language,
- one-tap system page for region/catalog, About Pro, diagnostics and local
  Wi-Fi/Bluetooth repair,
- contract and tests that require every settings card to perform an action.

## Interaction contract

Settings use two six-card pages with a persistent close target and a 44×44 page
switch. Volume and brightness cycle through bounded 25/50/75/100 values. Theme
and language toggle locally. Network and speaker actions open their existing
safe local flows. No card is decorative or disabled without explanation.

## Exit condition

- A2 is canonical in the manifest and About Pro,
- active GUI assets contain no custom-font reference or font-face rule,
- both settings pages fit the 320×240 viewport and every target is at least
  44 px,
- browser interaction, focused GUI QA, documentation parity, full repository
  checks and `git diff --check` pass.
