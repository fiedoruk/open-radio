# 26 — Loop S3: shared renderer path

**Status:** COMPLETE
**Mode:** BUILD / SOFTWARE-ONLY
**Owner:** engineering agent
**Start gate:** satisfied by owner `ok` on 2026-07-13

## Goal

Create the first platform-neutral renderer proof so the browser stops being the
only executable interpretation of the 320x240 UI. The proof must render a stable
RGB565 framebuffer on the host without M5Stack, network, audio or Bluetooth.

## Stream 1 — Renderer boundary

1. Freeze the framebuffer, color, clipping and draw-command contract.
2. Define a minimal C++ API for snapshot input and RGB565 output.
3. Generate shared screen/layout constants from the existing JSON contract.

## Stream 2 — Deterministic host implementation

4. Implement bounds-safe fill, rectangle and text-placeholder primitives.
5. Render one representative now-playing fixture into a 320x240 buffer.
6. Add a host executable that writes PPM and a deterministic framebuffer hash.

## Stream 3 — Parity and negative coverage

7. Convert selected JSON fixtures into deterministic generated C++ fixtures.
8. Prove two clean host builds produce the same framebuffer hash.
9. Add negative tests for clipping, invalid indices and undersized buffers.

## Stream 4 — Portability and QC

10. Record compiler/version, command lines and generated artifacts.
11. Document the later WASM adapter without installing a global toolchain.
12. Synchronize roadmap, architecture and browser limitations after the gate.

## Exit condition

- the renderer core has no browser, M5Unified, network or audio dependency,
- a representative fixture produces a complete 320x240 RGB565 framebuffer,
- two consecutive clean host builds produce the same recorded hash,
- clipping and invalid-input tests pass without out-of-bounds writes,
- the generated PPM is inspectable while remaining non-authoritative for Core2,
- the Canvas simulator remains operational and all S2 contract tests stay green.

## T3 and hardware boundary

No firmware flash, dependency publishing, global toolchain installation, public
release or hardware-parity claim. Physical RGB565 color, M5GFX font metrics,
touch, PSRAM behavior and performance remain behind the Core2 arrival gate.

## Planned evidence

- platform-neutral C++ source and headers,
- generated contract constants and fixture inputs,
- host build/test commands,
- framebuffer hash from two clean builds,
- PPM render artifact,
- Node regression and `git diff --check` results.

## Completion evidence

- renderer core: C++17 standard library only,
- generated contract check: 2/2 files PASS,
- native renderer tests: 5/5 cases PASS,
- deterministic rebuild: 2 clean builds, byte-identical PPM,
- canonical framebuffer hash: `121b2e3e0fd94a44`,
- framebuffer: 76,800 RGB565 pixels,
- PPM: 230,415 bytes, SHA-256 `52f3c804cb87cf2dcc197b2f20a64211c17cc138ee005d7fa51904fbbf4c002f`,
- PNG inspection artifact: exact 320x240,
- Node suite: 26/26 PASS,
- browser Canvas regression: fallback flow PASS, console 0 errors and 0 warnings,
- compiler observed: Apple clang 21.0.0, arm64 Apple Darwin,
- no WASM/global toolchain, firmware build or hardware claim introduced.
