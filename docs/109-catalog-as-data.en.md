# 109 — The catalog as data

[Wersja polska](109-catalog-as-data.pl.md)

**Purpose:** record the first phase of release 0.2 — playback endpoints stop
being C++
**Covers:** the station catalog, the header generator, endpoint resolution and
the default nine
**Does not authorise:** device writes, audio-path changes or a release

## What changed

`resolveEndpoint()` was a switch over station indices with the addresses
inlined. Changing the nine meant editing C++, and rotating away from a dead
address only worked for the RMF stations (through the operator pools) and for
ESKA (through a hand-written `ic1`/`ic2` flip). The other six replayed **one**
address forever, no matter how often the rotation counter advanced.

Endpoints are data now. The catalog carries a `playback[]` array, the generator
turns it into a flat table in `firmware/generated/station_catalog.hpp`, and the
firmware walks that station's own rows. Thirteen entries across nine stations —
six stations now have a real alternate.

## Why a separate array and not `candidates[]`

`candidates[]` documents the broadcaster's official surfaces and exists for
provenance. The contract requires HTTPS there and **rejects** transient hosts
(`rmfstream`, `streamtheworld`, `cdn*`, `edge*`). Stream addresses are exactly
those hosts, so putting them there would fail the validator, and rightly so.

`playback[]` has the opposite rule: **plain HTTP, required**. That is not a
relaxation. Under an active A2DP link a TLS handshake needs about 40 KB of
internal heap and only 25–30 KB tends to be free, so an https address is not
the more careful choice here — it is an unreachable one. The host must also
appear in `firmware/manifests/network-services.lock.json`, and the address must
fit in 127 characters, because `start()` rejects longer ones and silently falls
back to last-known-good.

## The audio surface is frozen by a gate

`check:audio-surface` compares six files of the decode path, the A2DP sink and
the noise generator against tag `open-radio-0-1`, and additionally guards four
invariants inside files that may change: the `BALANCE` coexistence preference,
the 8192-frame decoder budget and two 262,144-frame reserves.

All six files were **byte-identical** to the tag when the lock was written, so
the gate records the shipped state rather than legalising drift after the fact.
After 18 July, "we did not intend to touch the audio" has no evidential value;
now any change fails the build unless an explicit exception names it with a
reason.

## The new nine

| # | Station | Endpoints | Note |
|---|---|---|---|
| 0 | RMF FM | rmfon pool + `rs102…/rmf_fm` | unchanged |
| 1 | Radio ZET | streamtheworld | unchanged |
| 2 | RMF MAXX | rmfon pool + `rs202…/rmf_maxxx` | **held slot** |
| 3 | VOX FM | `ic1`/`ic2.smcdn.pl/3990-1.mp3` | new |
| 4 | Antyradio | streamtheworld | unchanged |
| 5 | RMF Classic | `rs102`/`rs202…/rmf_classic` | new |
| 6 | Eska Rock | `ic1`/`ic2.smcdn.pl/5380-1.mp3` | new |
| 7 | Radio ESKA | `ic1`/`ic2.smcdn.pl/2980-1.mp3` | **held slot** |
| 8 | Radio Wnet | `audio.radiownet.pl:8000/stream` | new |

Meloradio, Złote Przeboje, Chillizet and RMF MAXX Club left. The four new
palettes inherit their colours verbatim from the four departing, so contrast
and overflow stay exactly as validated.

## Two held slots, and why

The owner picked Jedynka and Polskie Radio 24 for the nine. Both broadcast MP3
**only at 192 kb/s**; the sub-192 mounts checked on the broadcaster's servers
are podcast channels and answer `ICY 401`. There is no software path.

The measured throughput ceiling under an active Bluetooth link is 15.6 KB/s,
but the measurement is demand-limited: all eight stored runs were 128 kb/s
streams, so each pulled exactly what it needed. They establish "headroom above
zero", not "headroom of at least 8 KB/s".

So the catalog carries `bitrateCeilingKbps: 128` and the validator rejects a
station where **no** endpoint fits under it. The block is mechanical, not a
matter of judgement. RMF MAXX and Radio ESKA hold those two slots; both already
shipped and both still play. Once the ceiling is measured on hardware, the swap
is a data-only change.

## Two corrections to the design

**Eska Rock needs no redirect following.** The design assumed
`302 → revma CDN` with a token valid for five seconds. The station has a mount
in the same CDN family as ESKA (2980) and VOX FM (3990): `5380-1.mp3` on
`ic1`/`ic2`. Both hosts were already in the lock, so the whole problem class
disappeared.

**`audio.radiownet.pl:8000/` is an Icecast status page, not a stream.** The
address from the design returns `text/xml`. The mount is `/stream`.

## The catalog generator

`npm run catalog:refresh` queries radio-browser, applies a hard filter and
probes candidates on a **raw socket**, because the firmware accepts the
`ICY 200 OK` status line that `fetch` and `urllib` reject — a conventional HTTP
client would under-report.

The script also probes the plain-HTTP form of an address published as HTTPS.
Broadcasters routinely publish one and serve both; filtering on the published
scheme hid **133 working stations** — 191 feasible became 324. That is how Eska
Rock and VOX FM were found.

The output is a report and a proposal, never an automatic commit. Networking
lives in the generator; the build stays offline, because reaching out during
compilation would destroy the byte-for-byte reproducibility the provenance
proof stands on.

We do not trust `lastcheckok`. It says a stream worked for somebody else. Only
our own probe admits a station — a third party's measurement does not enter the
product as our guarantee.

## The health counter

A full lap through a station's alternates without a single healthy frame is the
difference between "the edge blinked" and "this station is not broadcasting".
The counter resets on the first decoded frame, so it measures consecutive
failure rather than historical trouble, and it emits a `station_health` line on
the serial port.

Nothing reads it yet. The "this station is not broadcasting" screen needs a new
`Screen` value, a drawing function, a mirror in the parity twin and a snapshot
field — the same size of work as removing saved tracks, and it ships separately
so both can be verified.

## Gate

`npm run check`: **36 gates** (the new `check:audio-surface`), **223 tests**, no
failures. Public build `SUCCESS`, `firmware.bin` 2,245,328 B.
