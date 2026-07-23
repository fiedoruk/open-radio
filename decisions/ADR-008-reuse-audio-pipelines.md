# ADR-008 — Reuse audio pipelines, own the product layer

**Status:** ACCEPTED FOR HARDWARE SPIKES / FINAL STACK DEFERRED
**Date:** 2026-07-13

## Context

Prior-art research found working components for Core2 hardware, HTTP/MP3 decode,
HLS/HE-AAC, local speaker output and Bluetooth Classic A2DP Source. It did not
find a complete Core2 product matching the project's immutable catalog, Polish
station scope, custom UI, local fallback and bounded recovery contracts.

## Decision

- Do not write custom Core2 drivers, audio decoders or Bluetooth stack.
- Keep project-owned catalog/resolver, persistence, supervisor, OutputRouter,
  UI and local-only diagnostics.
- Use M5Unified as the Core2 HAL candidate.
- Use the official ESP-ADF `pipeline_bt_source` as the first hardware spike.
- Keep M5Unified + ESP32-A2DP + Arduino Audio Tools as the lighter alternative.
- Decide the final firmware stack only after MP3->A2DP, local fallback and one
  HLS/HE-AAC spike plus a dependency/license audit.

## Consequences

The project does not reinvent the proven media pipeline, but also does not fork
a large radio product with conflicting cloud, OTA or catalog assumptions. A
public binary remains blocked until codec and dependency licenses are closed.

Research evidence:

- `docs/34-prior-art-reuse-research-2026-07-13.md`,
- `docs/39-prior-art-technical-deep-dive-2026-07-13.md`,
- `docs/40-audio-dependency-license-audit-2026-07-13.md`.
