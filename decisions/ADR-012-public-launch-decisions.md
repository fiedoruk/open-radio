# ADR-012 — Public launch decisions: history, contributions, claims

**Status:** ACCEPTED (repository creation and first push stay owner-gated)
**Date:** 2026-07-23
**Supersedes:** the history model and external-PR posture of ADR-011

## Context

A 2026-07-23 pre-launch audit (internal, three independent review tracks)
confirmed the 0.2.1 release binary as a sound live baseline and blocked the
first public push on packaging grounds: reachable private identifiers in the
git history (household network names in fixtures and one tracked screenshot,
tool-session artifacts, private workspace paths in deleted files), stale
release metadata, and an unresolved contribution-licensing contradiction.
The working tree was cleaned the same day (synthetic fixtures, regenerated
assets, screenshot removed); git history cannot be cleaned without rewriting
it, and rewritten refs must never masquerade as the originals.

## D1 — Public history model: sanitized import

The public repository starts from a fresh root commit carrying the current
tree, not from the private history. ADR-011 chose a hash-preserving mirror
on the strength of a history scan that measured secrets, not private
identifiers; the deeper audit invalidated that premise.

- The private repository remains the workshop and keeps the full history.
- A provenance manifest in the public tree records the private code cut of
  the shipped release (`e4ec0c8…`, tag `open-radio-0-2-1`) and the exact
  artifact hashes, so provenance stays verifiable without the private refs.
- Consequence accepted: public commit ids differ from private ones; private
  tags are not pushed (an unreachable tag would drag its ancestry along).
- The 0.3 candidate study stays out of the launch surface.

## D2 — The shipped 0.2.1 binary is immutable

The published `open-radio-0-2-1.bin` stays byte-identical: same URL, same
SHA-256, same version number. One synthetic-looking fixture literal (a
network name, no credential) is embedded in it; the sources are already
clean, so the literal disappears from the next release naturally. No
republishing, no tag moves, no silent swaps.

## D3 — Contributions: GPL-3.0-or-later + DCO, no CLA

External pull requests are welcome under the project license with a
Developer Certificate of Origin sign-off. No contributor license agreement.

- Consequence accepted: the maintainer gains no special relicensing rights
  over external contributions. The dual-licensing option recorded in
  ADR-003 therefore applies only to owner-authored code; any future change
  would require a CLA introduced openly and prospectively.
- Rationale: a solo-maintained appliance firmware gains more from a simple,
  honest contribution path than from keeping a hypothetical relicensing
  option that a CLA-free GPL project cannot deliver anyway.

## D4 — Trademark and artwork split

- The final Open Radio mark and the project name are reserved: downstream
  builds may not present themselves as official releases.
- Other original project artwork: CC BY-SA 4.0. Catalog data: CC0.
- The device fetches broadcaster favicons at runtime for private, personal
  display; no broadcaster artwork ships in the repository or binary, and no
  rights to broadcaster marks are granted or implied. The exact reserved
  paths live in `TRADEMARKS.md`.

## D5 — Public claims policy

Every public statement carries one of four labels: measured, owner-attested,
user-reported, or estimate. No universal-compatibility wording (Bluetooth
support is standards-based A2DP/SBC with a community compatibility list);
battery duration is an estimate until measured; the network-endpoints
document lists every outbound traffic class the firmware can generate.

## D6 — AI provenance note

One professional statement, kept in the README: the project is AI-assisted,
human-directed and owner-accountable, and every public release is gated by
executable tests, exact artifact hashes and documented hardware evidence.
Quality is defended with evidence, not token counts.

## D7 — Community surfaces at launch

Issues and private vulnerability reporting open on day one. Pull requests
follow D3. Discussions can come later if traffic warrants it.
