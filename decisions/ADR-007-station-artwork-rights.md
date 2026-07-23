# ADR-007 — Station presentation and artwork rights

**Status:** SUPERSEDED 2026-07-16 — LOCAL PROJECT IDENTITY ONLY;
the no-request clause is superseded again by ADR-010 (2026-07-22): the device
fetches QC-verified station icons itself at first configuration.
**Date:** 2026-07-15

## Decision

Per-station colors, layouts, artwork slots and custom presentation are required
from the first UI implementation. The public project ships original artwork
that it has the right to license.

The public repository and firmware image never bundle broadcaster logo bytes.
Project-original monograms, colors and motifs remain the complete offline
fallback.

The optional download action and its runtime were removed by the owner on
2026-07-16. The device makes no station-artwork request. Project-original
monograms, colors and motifs are the complete station identity for the current
minimal product.

## Consequences

The UI remains complete offline and does not falsely open-license third-party
marks. Image networking, decoding, cache and remote-source maintenance leave
the firmware. Public redistribution, screenshots, marketing and any future
logo pack remain separate rights questions and require a new explicit decision.
