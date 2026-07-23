# 71 — Loop S14: Signal Cube A2 and font license boundary

> Superseded by S15: A2 was accepted and the custom-font direction was removed.

**Date:** 2026-07-14

**Mode:** software-only

**Boundary:** no font binary or derived atlas, no remote asset, no firmware
flash, public release or hardware claim

## Goal

Remove ambiguity around the All Round Gothic license and turn logo direction A
into a complete, pixel-controlled brand system that remains legible on the
limited Core2 display.

## Delivered

- documented Adobe static-output coverage and the standard App EULA mismatch,
- explicit custom OEM/embedded license requirement for ESP32 firmware,
- redesigned A2 mark with two negative-space broadcast waves and side beacon,
- primary, negative, monochrome and grid-aligned micro SVG assets,
- real 32, 24 and 20 px browser specimens plus a four-column comparison board,
- validators for the license state, local-only assets, variants, safe area and
  minimum size,
- reciprocal English and Polish public license documentation.

## Exit condition

- all four A2 variants load locally with no remote requests,
- real-size micro specimens render at their declared CSS dimensions,
- focused GUI, country-pack and overflow QA passes,
- public documentation parity and `git diff --check` pass,
- full repository check and max Simplify Gate record remaining external risks.

The owner accepted A2 in S15. The product now uses built-in typography only, so
no production font atlas or font-license task remains.
