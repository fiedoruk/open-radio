# Core2 UI simulator

The simulator renders the logical `320x240` device viewport to a Canvas and
keeps scenario controls outside the device. It has no runtime dependencies.

```bash
npm run simulator
```

Open `http://127.0.0.1:4173/simulator/`.

For the separate pixel-perfect light/dark visual specification, open
`http://127.0.0.1:4173/gui-lab/`. The GUI Lab uses the exact 320x240 SVG
viewport, contract geometry, local Tabler icon subset and station identity
manifest. It is for visual and flow review before the selected theme is compiled
into the shared firmware renderer.

## What it validates

- onboarding flow,
- nine station themes,
- navigation and touch hitboxes,
- Polish/English copy,
- Wi-Fi, Bluetooth, station and safe-mode scenarios,
- selected station versus fallback station,
- exact logical viewport dimensions.
- strict `UiSnapshot` and `UiCommand` boundaries,
- data-driven touch hitboxes,
- automated PL/EN text overflow policy.

## What it does not validate

Browser Canvas is the current software prototype. It does not prove pixel parity
with M5GFX, RGB565 conversion, physical IPS colors, touch transform, RF, audio,
memory or timing. The production-grade path is a shared platform-neutral C++
renderer compiled for Core2 and WASM; the JSON contract and fixtures are prepared
so the Canvas renderer can later be replaced without redesigning the UX.
