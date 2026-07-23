# 66 — Pixel-perfect GUI system

[Polska wersja](66-pixel-perfect-gui-system.pl.md)

## Hardware basis

The GUI source of truth targets the [M5Stack Core2](https://docs.m5stack.com/en/core/core2): a 2-inch, 320×240 IPS display driven by ILI9342C with capacitive touch. The design uses one fixed landscape viewport and RGB565-compatible colors. It does not claim physical color, touch or timing parity before hardware validation.

The browser GUI Lab is available at `http://127.0.0.1:4173/gui-lab/` after running `npm run simulator`. It complements the logical failure simulator; it does not replace the shared firmware renderer.

## Pixel system

`ui-contract/gui/core2-pixel-system.v1.json` is the machine-readable geometry contract. All screen boxes use integer coordinates inside 320×240, a 2-pixel base grid and a minimum 44×44 interactive target. Exact inset drawing rectangles are recorded separately from their touch rectangles. The screen is divided into a 28-pixel status area, a 156-pixel content area and a 56-pixel bottom action area.

The GUI Lab paints the canonical C++ RGB565 framebuffer at exactly 320×240 CSS pixels. Every source coordinate is a device pixel and the preview does not scale the framebuffer. There is no scrolling inside the device viewport.

## Light and dark themes

Both themes are complete variants of the same layout and flow. Light A uses a neutral high-contrast canvas for daylight. Dark B reduces large bright surfaces and is the product default. Open Radio blue (`#3689FF` dark / `#0B63CE` light) is the stable brand color for controls and navigation; project-original station colors are limited to station identity. Theme choice changes tokens only; navigation, touch geometry, information priority and recovery behavior remain identical.

Normal text and muted text are automatically checked against canvas, surface and raised backgrounds at a minimum 4.5:1 contrast ratio, following [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Station button foregrounds are checked against every accent with the same threshold.

## Icon system

The project uses a compile-time subset of [Tabler Icons](https://github.com/tabler/tabler-icons), pinned to version `3.44.0` and commit `6d128ed935d4546607b1e4d5d08c8b27bdbe7758`. The source set keeps the original 24×24 view box, 2-pixel stroke and MIT license. The exact license is stored in `ui-contract/icons/TABLER-LICENSE.txt`.

The browser reads `ui-contract/icons/tabler-core2.svg` locally. Firmware must not include an SVG parser or fetch icons at runtime. The selected theme is converted offline from the same paths into compact monochrome masks, then tinted with local RGB565 tokens.

## Station identity and logos

Every station has a project-original fallback identity in `ui-contract/gui/station-identities.v1.json`: monogram, accent, alternate accent, readable foreground and simple geometric motif. This makes every card complete without copying broadcaster artwork.

Official broadcaster artwork is never bundled; since release 0.2 the device downloads station logos itself at runtime under `decisions/ADR-010`, storing them only on the device. Project-original monograms, geometric motifs and local RGB565 colors remain the complete fallback identity whenever a logo is missing, so every card is complete without any bundled broadcaster artwork.

## Screen map and flow

The GUI Lab covers now playing, direct volume control, the 3×3 station grid, settings, Wi-Fi recovery, Bluetooth fallback, unsupported transport, safe mode, local diagnostics and all three onboarding steps. The editorial home volume indicator opens a dedicated 0–100% screen with a draggable bar and 44-pixel decrement, done and increment controls. Safe mode opens bounded local diagnostics and keeps network radios disabled until local repair. A user-started Bluetooth scan accepts any Classic A2DP rendering/audio candidate exposed by the pinned stack instead of matching model names; the first accepted connection is remembered by address. Unsupported HLS entries never show a playing state. Previous, next and automatic fallback select only supported MP3 entries. Bluetooth loss without an active remembered speaker is a no-op; active Bluetooth loss keeps audio on the built-in speaker.

Recovery screens use one message, one bounded explanation and one primary action. The UI does not require the user to supervise automatic Wi-Fi, stream or speaker reconnection.

## Firmware conversion path

Both themes now generate renderer constants and RGB565 tokens, and six Tabler paths generate compile-time 24×24 masks. Dark B is also the renderer fixture default. The canonical device emulator and firmware share one deterministic Inter 600 atlas generated offline from the checked-in OFL source. Kiara uses the CC0 `Pixel cat` source by `scofanogd`, reduced offline to 154 four-level grayscale runs and rendered without image decoding or heap allocation. There is no runtime font or SVG decoder in the public candidate. Since release 0.2 the firmware carries a bounded PNG decode path used only by the runtime station-logo fetch (`decisions/ADR-010`); logos live in device storage and never in the shipped image.

Parity requires framebuffer fixtures for every screen in PL and EN, deterministic hashes, overflow checks and side-by-side device photographs. The browser lab is therefore the exact visual specification, not evidence that the physical IPS panel already matches it.

## Acceptance gate

`npm run qa:gui` verifies viewport geometry, grid alignment, 44-pixel touch targets, theme and brand-blue contrast, station accent contrast, catalog-to-identity order, disabled artwork runtime and built-in typography policy, canonical logo presence, settings actions, version pinning, overflow, country packs and the no-remote-assets rule. `npm run check` remains the full repository closure gate.

Hardware H1 validates clipping, physical readability, touch transform, brightness and color behavior; H2/H3 validate the same recovery flow with local and Bluetooth audio. No hardware or release claim is unlocked by the browser result alone.
