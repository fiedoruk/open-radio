# Emulator pixel-parity audit

[Polska wersja](86-emulator-pixel-parity-audit.pl.md)

## Correction

The previous audit was wrong to present three rendering modes and a 5×7 font
as the finished device view. It verified coordinate geometry but did not enforce
one canonical production path. This document supersedes that conclusion.

## Canonical path

GUI Lab now contains exactly one visible `<canvas width="320" height="240">`.
It has no renderer tabs, SVG design mode or zoom control. Its CSS box is also
320×240 CSS pixels. Every device pixel is obtained from `/api/renderer-frame`,
which runs the host build of the same C++ RGB565 renderer linked into the Core2
target. The browser only decodes that frame and paints it to the canvas.

Typography is the generated Inter 600 atlas from the checked-in OFL-licensed
font. Icons are the same compiled masks used by firmware. There is no browser
font substitution inside the device framebuffer.

## Measured software result

| Area | Result | Meaning |
| --- | --- | --- |
| Canvas structure | PASS | One visible 320×240 canvas; retired tabs and SVG mode are rejected by tests. |
| Frame source | PASS | The visible device frame comes only from the C++ RGB565 renderer endpoint. |
| Typography | PASS | Firmware and emulator share the generated Inter 600 glyph atlas. |
| Screen coverage | PASS | 26 screens cover PL/EN and Light A/Dark B: 104 variants. |
| Determinism | PASS | Two fresh host builds produce byte-identical output for all 104 variants. |
| Text bounds | PASS WITH RISKS | Renderer bounds tests pass; intentional ellipsis is counted, but panel readability is unmeasured. |
| Touch flow | PASS WITH RISKS | Tap, hold and horizontal-swipe logic is host-tested; physical touch behavior is unmeasured. |
| Physical display | NOT MEASURED | Panel color, brightness, viewing angle, scaling and touch calibration require hardware. |

The canonical 104-frame matrix SHA-256 is
`bae568ccafc26d7217883268ce68354fb1961547daa8940ba9d691efec228d23`.
The default fixture hash is `f5edbcd318f51527`.

## Exact meaning of 1:1

One RGB565 framebuffer pixel maps to one canvas bitmap pixel, and the canvas
occupies 320×240 CSS pixels. This is exact logical-pixel inspection. It cannot
guarantee one framebuffer pixel equals one physical monitor pixel because
browser zoom, device-pixel ratio and operating-system compositing are external.
It also cannot reproduce the Core2 panel's optical properties.

## Verdict

Logical framebuffer parity is **PASS WITH HARDWARE RISKS**. The emulator is now
the single honest software representation of what firmware asks the display to
show. Calling the whole result “pixel perfect on Core2” would still be false
until the physical comparison gate passes.

## Hardware gate

1. Flash only after the explicit hardware-arrival approval.
2. Compare photographed Core2 frames with the same C++ golden frames.
3. Verify orientation, clipping, Inter readability and every touch target.
4. Measure brightness, IPS color behavior and animation timing under audio load.
5. Record panel-specific corrections as measured calibration, not assumptions.
