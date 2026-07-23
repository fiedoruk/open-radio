# 29 — Loop S4: catalog and resolver simulator

**Status:** COMPLETE
**Mode:** BUILD / SOFTWARE-ONLY
**Owner:** engineering agent
**Start gate:** satisfied by owner `ok` on 2026-07-13

## Goal

Build a deterministic station-resolution model that can recover from endpoint
failure without requiring a remote catalog, private proxy or device firmware.
Every launch station must have explicit transport, provenance, artwork-rights
status and a tested recovery trace.

## Stream 1 — Catalog truth and schemas

1. Define schemas for canonical stations, resolver candidates and results.
2. Normalize all nine station records with operator, region and capability data.
3. Separate official discovery surfaces from transient playable endpoints.

## Stream 2 — Resolver and health model

4. Implement pure candidate ordering with primary and alternate sources.
5. Add health score, bounded backoff, quarantine and last-known-good state.
6. Define retry budgets that never block UI or already-playing fallback audio.

## Stream 3 — Failure and capability fixtures

7. Model success, timeout, 404, stale response and alternate recovery.
8. Cover six MP3 and three HLS/HE-AAC capability classes explicitly.
9. Produce a deterministic recovery trace for every launch station.

## Stream 4 — QC and governance

10. Use a deterministic clock so tests never depend on real waiting or internet.
11. Audit endpoint logging, privacy, rights metadata and immutable-device limits.
12. Run negative tests and synchronize catalog, architecture and portfolio state.

## Exit condition

- every launch station validates against the canonical schema,
- every station records operator/source provenance and artwork-rights status,
- official discovery and transient playback endpoints are separate concepts,
- timeout, 404 and stale candidates move through bounded health transitions,
- last-known-good playback survives resolver failure,
- all nine station traces end in playing, bounded retry or explicit unsupported state,
- tests are deterministic and require no live stream or hardware,
- live endpoint freshness remains an external audit fact, not a hardcoded guarantee.

## T3 and external boundary

No private proxy, rebroadcasting, recording, station-account action, credential,
remote catalog deployment or firmware flash. Live web verification may update
public provenance evidence, but automated tests must remain offline and stable.

## Planned evidence

- catalog/resolver JSON Schemas,
- normalized nine-station catalog,
- pure resolver and deterministic clock,
- failure fixtures and nine recovery traces,
- focused Node tests and negative cases,
- updated endpoint/privacy documentation,
- complete project and portfolio QC.

## Completion evidence

- canonical catalog: 9 stations and 18 primary/alternate candidates,
- capability split: 6 `MP3_ICY` and 3 `HLS_HE_AAC`, with unsupported
  decoder classes reported before any endpoint attempt,
- deterministic resolver outcomes: 5 `PLAYING`, 1 `RETRY_SCHEDULED` and
  3 `UNSUPPORTED`,
- bounded health transitions for timeout, HTTP 404, stale and parse failure,
- last-known-good recovery without endpoint values in traces,
- `npm run check`: 38/38 Node tests, 5/5 native renderer cases and stable hash
  `121b2e3e0fd94a44`,
- `npm run simulate:resolver`: sanitized nine-station summary stored in
  `output/resolver/s4-summary.txt`,
- no firmware build, flash, remote catalog, proxy, account or `private-workspace`
  change.
