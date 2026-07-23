# 64 — Loop S12: private repository baseline and CI

**Date:** 2026-07-14

**Mode:** software-only

**Boundary:** private development repository; no public release, firmware flash
or hardware claim

## Goal

Resolve the final S11 owner action by storing the reviewed baseline in a private
repository and making the complete host contract gate repeatable on GitHub.

## Repository contract

- `main` is the baseline branch.
- `CODEOWNERS` assigns the current tree to `@fiedoruk`.
- Workflow permissions are limited to read-only repository contents.
- Official GitHub Actions are pinned by commit SHA rather than floating tags.
- Node.js is pinned to `24.18.0` for this host gate.
- CI runs `npm run check`, `git diff --check` and a generated-drift check.
- CI is development evidence only; it does not replace the pinned firmware
  build, physical Core2 tests or release approval.

## Owner-decision proposals

### Public project name

1. **Open Radio Core2 — recommended.** Matches the current product identity,
   documentation and hardware focus.
2. **Radio Cube ESP32.** More generic and portable, but loses the exact MVP
   board signal.
3. **Otwarte Radio Core2.** Strong Polish identity, but less immediate for the
   English documentation and international DIY audience.

### Reference Bluetooth speaker

**Owner decision, 2026-07-14:** use the speakers already available rather than
buying a separate reference device.

1. **Xiaomi Sound Pocket `MDZ-37-DB` — primary candidate.** Xiaomi documents
   Bluetooth 5.4, 5 W output and the exact model, but the public specification
   used here does not name A2DP or SBC. H3 must therefore measure the required
   profile and codec instead of inferring them from the Bluetooth version.
2. **MOZOS Outdoor-Xtreme — secondary candidate.** This provides a materially
   different larger speaker for reconnect, range, coexistence and power-cycle
   tests. Retail listings conflict between Bluetooth 5.0 and 5.3/V2, so the
   physical label and revision must be captured before qualification.
3. **Qualification rule.** Neither speaker becomes a compatibility claim until
   pairing, SBC playback, reconnect, fallback and coexistence tests pass on the
   Core2.

Official evidence:

- Xiaomi Sound Pocket Polish specification:
  `https://www.mi.com/pl/product/xiaomi-sound-pocket/specs/`
- MOZOS Outdoor-Xtreme original listing:
  `https://www.x-kom.pl/p/727990-glosnik-przenosny-mozos-xtreme-outdoor.html`
- MOZOS Outdoor-Xtreme current product listing:
  `https://www.mediaexpert.pl/telewizory-i-rtv/hi-fi-audio/glosniki-mobilne/glosnik-mobilny-mozos-outdoor-xtreme-czarny`

### Public security contact

Candidate routings weighed here historically: a dedicated brand-domain alias
(durable, separate from general traffic), a project-specific alias (more
explicit, longer), or GitHub private vulnerability reporting plus a maintainer
address. The resolved, current channel is the one published in `SECURITY.md`;
this section remains only as the dated record of the decision space.

## Exit condition

- private baseline exists on `main`,
- CI definition is source-controlled and included in the RC1 source lock,
- the complete local gate passes,
- the first remote CI run passes,
- no release or hardware action occurs.
