# ADR-003 — Firmware license direction

**Status:** ACCEPTED
**Date:** 2026-07-13

## Context

The project needs durable attribution, low contributor friction and community
improvement. The simplest Arduino audio path includes GPL or mixed-license
dependencies, while a permissive stack may require more implementation work.

## Options

1. GPL-3.0-or-later firmware: simplest current community stack and mandatory share-back for distributed modifications.
2. Apache-2.0 firmware: permissive adoption and patent grant, but requires a dependency path compatible with that distribution goal.

Documentation and original artwork are planned as CC BY-SA 4.0 and station-catalog data as CC0-1.0 in
both options.

## Recommendation

Choose GPL-3.0-or-later. It best matches the founder's current priorities:

- use proven existing GPL-compatible audio components instead of rewriting them,
- keep distributed firmware forks open,
- encourage community improvement rather than closed downstream products,
- publish a non-commercial proof of concept while still using an OSI-style
  license that does not prohibit commercial use.

Choose Apache-2.0 only if maximum permissive adoption is more important than
the easiest implementation path and mandatory share-back. The project purpose
is non-commercial, but adding a `NonCommercial` restriction would make the code
source-available rather than conventional open source and would add ambiguity
for makers, videos, workshops and distributors.

## Decision

Tomasz accepted the recommendation on 2026-07-13:

- software: GPL-3.0-or-later,
- original documentation and artwork: CC BY-SA 4.0,
- factual station catalog data: CC0-1.0,
- final name and project logo outside those grants.

Attribution is handled by copyright notices, `AUTHORS.md`, `CITATION.cff`,
`NOTICE` and the About screen. A public firmware binary remains blocked until
the exact dependency audit is complete.

## Addendum 2026-07-22 — closed-binary option analysed (owner question after 0.2)

The owner asked whether a binary-only distribution (no source sharing) under
a different license would serve him better. Analysis recorded for the next
time this comes up:

**Today there is no choice.** The shipped binary links libmad through
ESP8266Audio — both GPL. Distributing the binary without a source offer
would infringe those authors' copyright regardless of what license we print.
This is the same wall that excluded the AAC decoders (docs/111 §AAC).

**The current model already delivers most of the goal.** Copyright in the
project's own code stays with the owner (GPL is a grant, not a transfer, and
dual-licensing his own code commercially remains possible). The repository
is private; GPL §6b requires only a written offer, exercised only by someone
who has the binary and asks. Clone protection never came from GPL anyway —
it comes from the trademark carve-out in the license text ("Open Radio" name
and branding excluded, official download only from fiedoruk.pl/os/).

**The only road to a closed binary** (future versions only — 0.1/0.2 stay
GPL forever): replace the GPL audio dependencies (candidate: minimp3, CC0,
plus the already-custom pipeline), and ideally leave the LGPL Arduino core
for plain ESP-IDF (Apache-2.0). M5Unified and LovyanGFX are MIT/BSD and fine.
Then a freeware EULA or a source-available license (BSL, PolyForm) becomes
possible. Cost: rewriting and re-stabilising the audio path — the most
fragile subsystem — plus losing the "open project" trust marker on the site.

**Verdict 2026-07-22: not worth it now.** Revisit only if commercial cube
sales become real; even then dual-licensing plus trademark enforcement is
the stronger first move. If the MP3 decoder is ever replaced anyway (e.g.
during AAC R&D on a second lab cube), the licensing freedom returns as a
side effect and this analysis applies.

## Addendum 2026-07-22 (2) — handling §6b source requests, incl. competitors

Recorded so the first real "send me the sources" mail gets a calm, correct
reply instead of an improvised one.

### Who is entitled, and what the answer is

Anyone who possesses a distributed binary (0.1 or 0.2 — both are public
downloads) may exercise the written offer. The complete response is to send
the corresponding-source tarball for the exact version they name (maintainer
archive; the current-release bundle is also published next to the binary at
`fiedoruk.pl/os/`):

- 0.2.1: published next to the binary (`os/open-radio-0-2-1-corresponding-source.tar.gz`)
- 0.2: maintainer archive `open-radio-0-2-corresponding-source.tar.gz`
- 0.1: maintainer archive `open-radio-0-1-corresponding-source.tar.gz`

Delivery by e-mail attachment or a download link. Chargeable cost: only the
physical cost of conveying — for a link, nothing. Respond without
unreasonable delay; a few days is fine, silence is not. The offer runs at
least 3 years from the last distribution of that version.

### What must NOT be demanded from the requester

GPL forbids conditioning the source on anything. Do not ask for identity,
purpose, affiliation, registration, or an NDA — and do not refuse or slow
down a request because the requester looks like a competitor. The binary is
public, so competitors already hold it lawfully; treat the released sources
as de facto public. Any screening attempt would itself be a license
violation on our side ("no further restrictions").

### What is NOT owed (scope stays the tarball, nothing more)

- private repository access, git history, other branches, unreleased work,
- future versions, roadmaps, support, build help, or any maintenance,
- internal reports, session notes, anything outside the tarball,
- broadcaster logos — absent from the public binary by design (runtime
  fetch, ADR-007/ADR-010), therefore not part of Corresponding Source,
- hardware designs, sourcing know-how, the project name and branding
  (trademark carve-out in the license text remains in force).

### What a competitor can and cannot do with it

They may build, modify and sell — GPL permits commercial use and forbids us
from discriminating. They may not: use the "Open Radio" name or branding,
strip copyright notices or claim authorship, or distribute a modified
version without sources (copyleft). Leverage runs both ways: improvements
they distribute are GPL, so this project may absorb them. On violation,
GPLv3 §8 applies — notice, 30-day cure window for a first offence, then the
license terminates and plain copyright infringement remains (enforceable by
the owner and by the libmad/ESP8266Audio authors alike). Internal use
inside a company triggers no obligations; only distribution does.

### Reply templates

PL:

> Dzień dobry, dziękuję za wiadomość. Open Radio jest wydawane na licencji
> GPL-3.0-or-later, a źródła odpowiadające wersji, którą Pan/Pani posiada,
> są dostępne zgodnie z pisemną ofertą. W załączniku/pod linkiem znajduje
> się kompletny pakiet źródeł tej wersji (corresponding source), bez opłat.
> Nazwa i znaki „Open Radio" nie są objęte licencją — pozostają zastrzeżone.
> Pozdrawiam, Tomasz Fiedoruk

EN:

> Hello, thank you for your message. Open Radio is released under
> GPL-3.0-or-later, and the sources corresponding to the version you hold
> are available under the written offer. Attached/linked is the complete
> corresponding-source archive for that version, free of charge. The "Open
> Radio" name and branding are not covered by the license and remain
> reserved. Best regards, Tomasz Fiedoruk

One rule of hygiene: log each fulfilled request (date, version sent) in a
private note next to the release records, so the 3-year offer window and
any repeat requests have a paper trail.
