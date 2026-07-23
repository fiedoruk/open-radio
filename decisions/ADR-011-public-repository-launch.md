# ADR-011 — Public repository launch

**Status:** ACCEPTED, AMENDED BY ADR-012 (launch execution stays owner-gated)
**Date:** 2026-07-22

## Context

Releases 0.1 and 0.2 are public binaries under GPL-3.0-or-later with a §6b
written offer; the corresponding-source archive is byte-identical to the
release tag tree, so the tracked sources are already de facto public for
anyone who asks. GPL also lets any recipient republish those sources — the
first GitHub copy could be someone else's fork, taking the canonical-upstream
position. A 2026-07-22 readiness audit found the history clean (no secrets,
binaries, MACs or SSIDs across 244 commits) and the tree publication-grade
after hygiene fixes.

## Options

1. Stay private with the written offer only: no new exposure, but manual §6b
   fulfilment forever, growing "fauxpen source" distrust, and the
   canonical-upstream position left to whoever republishes first.
2. Flip the existing private repository public: full history and all working
   branches exposed at once, no control over what a first impression sees.
3. Fresh public mirror receiving exactly `main` and `open-radio-*` tags:
   commit hashes preserved (release provenance becomes publicly verifiable),
   working branches stay private, publication is one guarded push.

## Decision

Option 3. The private repository stays the workshop; the public repository is
the canonical upstream for releases.

- Only `main` and `open-radio-*` tags are ever pushed, never force-pushed.
- `release/public-mirror-policy.json` defines the remote, allowed refs and
  forbidden paths/content; `scripts/check-public-mirror.mjs` enforces it
  inside `npm run check` on every commit, including in public CI.
- `scripts/publish-public-mirror.sh` is the only sanctioned publish path and
  requires `ALLOW_PUBLIC_PUSH=1 CONFIRM_PUBLISH=YES` plus a green full gate.
- External pull requests are not merged by default (mirror-first posture):
  accepting outside copyright would constrain the dual-licensing option
  recorded in ADR-003. Revisit on the first substantial contribution.
- The launch itself — creating the repository, enabling private
  vulnerability reporting, the first push and the site link — is a separate
  owner-approved action; the procedure lives in
  `docs/114-public-mirror-runbook.en.md`.

## Amendment (2026-07-23)

A deeper pre-launch audit found reachable private identifiers in the history
that the 2026-07-22 scan (secrets-oriented) could not see. Two points above
are superseded by ADR-012:

- The public repository starts as a **sanitized import** (fresh root), not a
  hash-preserving mirror; release provenance moves to an explicit manifest.
- External pull requests **are** accepted, under GPL-3.0-or-later + DCO
  (ADR-012 D3), replacing the mirror-first posture.

The owner gate, the policy file, the guard and the single sanctioned publish
script remain in force unchanged.
