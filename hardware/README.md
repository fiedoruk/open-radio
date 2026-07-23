# Hardware

This directory contains only reviewed hardware contracts, public manufacturer
facts and sanitized measurement templates. It must not contain factory backup
images, serial captures, device addresses, credentials or private endpoint
values.

- `speaker-qualification-matrix.json` records the three owner-provided test
  speakers. The Xiaomi row separates a bounded physical A2DP/SBC focused PCM
  pass from the failed 60-minute panic/stream-starvation endurance result;
  forced reconnect/fallback and the other speakers remain explicitly open.
- `callback-trace-capture-template.json` is the bounded local measurement shape.
- `approved-app-images.json` is the closed, reviewed allowlist for exact
  current-surface recovery or a separately reviewed candidate. The running
  failed-endurance image is approved only to recover the current GUI/catalog/
  logo surface, not as a stable baseline or future candidate. Historical
  whole-app images remain quarantined even when their bytes are available.
- `FINAL-MULTIVECTOR-AUDIT-2026-07-18.pl.md` is dated internal evidence and the
  postmortem for the BT regression, process incident and whole-cube gap audit;
  it is not the canonical execution checklist.
- `../docs/106-final-private-cube-closeout-loop.en.md` and its Polish peer are
  the canonical finite private-cube qualification and production-closeout loop.
- `backups/` is ignored and remains owner-local.

Pinouts and diagrams may be added only from attributable manufacturer sources.
Do not copy ambiguous retailer graphics without an exact hardware revision.
