# The documentation model / Model dokumentacji

**EN** — Two kinds of documents live here. The **numbered files** (`docs/NN-*`)
are a dated engineering journal: they record what was true and decided on
their date, are kept verbatim, and are never "updated" — a 2026-07 loop
report describing a pre-release image is history, not a current claim.
**Current truth** lives in the living docs — `README`, `STATUS.md`,
`USER-GUIDE`, the current release notes (see `release/claims.json` →
`releaseNotesBase`) — and is enforced by the `check:doc-currency` gate:
`release/claims.json` holds the canonical release facts, and every release
cut bumps it, which fails any living doc still telling the previous
release's story until the sweep is complete.

**PL** — Żyją tu dwa rodzaje dokumentów. **Pliki numerowane** (`docs/NN-*`)
to datowany dziennik inżynierski: opisują to, co było prawdą i decyzją w
swojej dacie, są zachowywane dosłownie i nigdy nie są „aktualizowane" —
raport pętli z 2026-07 opisujący obraz przedwydaniowy to historia, nie
bieżąca deklaracja. **Bieżąca prawda** mieszka w dokumentach żywych —
`README`, `STATUS.md`, `USER-GUIDE`, aktualnych notach wydania (patrz
`release/claims.json` → `releaseNotesBase`) — i jest egzekwowana bramką
`check:doc-currency`: `release/claims.json` trzyma kanoniczne fakty
wydania, a każde cięcie wydania podbija ten plik, co obala każdy żywy
dokument opowiadający jeszcze historię poprzedniego wydania, dopóki
przegląd nie będzie kompletny.
