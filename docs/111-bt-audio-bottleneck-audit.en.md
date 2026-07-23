# 111 — BT path and stutter audit

[Wersja polska](111-bt-audio-bottleneck-audit.pl.md)

**Purpose:** close the "why does it stutter" audit with numbers instead of impressions
**Covers:** the Wi-Fi → decoder → A2DP path, station selection, repair levers
**Does not authorise:** any change to the frozen audio surface (`check:audio-surface`)

## The symptom and who reported it

The owner: "Eska Rock, VOX and PR24 keep cutting out." **Corrected the same
evening:** those reports came from a build that — through a change of our own,
since reverted — kept the soft access point transmitting for five minutes
after configuration, and followed a series of buffer-clearing reboots. The
"stutters → stopped → again" rhythm matches the AP's lifetime window. The
historical counter-evidence: Radio ESKA on the same smcdn CDN played clean for
days on 0.1. Of the original verdicts, only the 192 kb/s arithmetic survives.

## The equation everything follows from

MP3 at 128 kb/s needs **15.625 KB/s**. The cube's measured intake under an
active A2DP link is **15.6–15.7 KB/s** — a demand-limited measurement (the
buffer was full), so the true ceiling is "at least this much", and an hour-long
soak with a full buffer proves the balance holds in clean air. **The margin is
near zero at best.** Any 2.4 GHz congestion window pushes the balance negative,
and recovery afterwards is capped by the same ceiling — not by the server's
generosity.

## CDN measurements (2026-07-21, raw socket, following 302s)

| CDN | 3 s burst | sustained | stations |
|---|---|---|---|
| rmfstream | 65–66 KB/s | 1.51× realtime | RMF FM, RMF Classic, RMF24 |
| streamtheworld | 68–69 | 1.56–1.57× | Radio ZET, Antyradio |
| smcdn | 47–50 | 1.34–1.35× | **VOX FM, Eska Rock** |
| radiownet | 36 | 1.22× | **Radio Wnet** |
| polskieradio | 69–75 | 1.58× | Jedynka, PR24 — but 192 kb/s |

After a source death (8 s watchdog / edge disconnect) the cube reopens and
rebuilds its buffer from the burst. Burst decides **recovery speed**, not
whether a station works: a live stream converges to 1.0x realtime once caught
up, so "sustained" mostly measures the server's prebuffer size. Recovery takes
seconds on rmfstream and three times as long on radiownet — which is why the
measurements are used to **rank alternates**, while admission only rejects
streams below ~1.1x (cannot hold realtime) or above 128 kb/s.

## Jedynka and PR24 — a different mechanism

192 kb/s = **23.4 KB/s**, half again above the measured intake under BT. The
server is generous (1.58×) — the cube simply cannot receive it. The owner's
listening on 2026-07-21 ("PR24 cuts out") is, in effect, the 192 kb/s
measurement under A2DP: **negative**. The catalog validator was right to hold
those stations behind `bitrateCeilingKbps`.

## How much the cube can survive — buffer inventory

| Buffer | Size | Time at 128 kb/s |
|---|---|---|
| input (compressed, PSRAM) | 128 KiB | ~8.2 s |
| decoded PCM | 262,144 frames | ~5.9 s |
| A2DP queue | 262,144 frames | ~5.9 s |
| **total (BT route)** | | **~20 s** |

Documented stalls: the LWIP DNS retry ladder at **16.3 s** (survivable only on
full buffers), a 6.6 s start without a network, and evening congestion windows
lasting minutes, which no buffer survives on a negative balance. The local
speaker route drains in 131,072-frame blocks (~3 s), which makes it fragile on
lean streams — described 2026-07-17; the smaller-block design is still waiting.

## AAC — status after re-checking

The earlier "AAC rejected on licence grounds" was based solely on `libhelix`
(RPSL). **FAAD2 is GPL-2.0-or-later, with SBR — licence-compatible with our
GPL-3.0.** The blocker moves to two other places: (1) **memory** — the ESP32
port needs ~60 KB of stack in a separate task, while an active A2DP link
leaves 25–30 KB of internal heap free (the same wall TLS hit); (2)
**patents** — revised the same evening: pools pursue products and encoders, not
free open-source decoders (FAAD2 has shipped in Debian for two decades; Fedora
ships an AAC-LC decoder since 2017), the AAC-LC core has expired and the
2001–2004 SBR filings expired through the mid-2020s — for a free GPL project
the practical exposure equals every Linux distribution's. A memory escape worth
testing: task stacks in PSRAM (`SPIRAM_ALLOW_STACK_EXTERNAL_MEMORY`; ~1.9 MB
free) plus trimming to LC+SBR. Hard condition: R&D only on a second, lab cube.
Conclusion: a research track, not a 0.2 path. Spec §4.2 is revised from "permanently" to "closed until a feasible
decoder exists".

## Levers, cheapest first

| # | Lever | Cost | Status |
|---|---|---|---|
| 1 | Cube and speaker together, away from the router | zero | **empirically confirmed** (July) |
| 2 | Pick stations by CDN burst (data, not code) | zero | the directory carries the measurements |
| 3 | PR24 → RMF24 (same role, 66 KB/s CDN) | data change | **awaiting owner decision** |
| 4 | Larger input ring (PSRAM has ~1.9 MB free) | audio-lock exception + soak | proposal |
| 5 | Smaller local drain blocks (~0.74 s) | lock exception + soak | proposal from 07-17 |
| 6 | Cache the resolved IP (skips the DNS ladder) | `station_runtime` — not frozen | proposal |
| 7 | SBC bitpool on the source side | IDF layer, invasive | last resort |
| 8 | FAAD2 AAC at 64 kb/s (8 KB/s) | R&D: memory + patents | outside 0.2 |

Levers 4–5 touch files guarded by `check:audio-surface` — they need an explicit
exception with a reason and a hardware soak, which is precisely why that gate
exists.

## What the user sees in 0.2

No automatic station-hopping (owner decision): the cube stays on the chosen
station and rotates through **its own** endpoints indefinitely
(0.25 s → 5 s → 30 s → 2 min → 10 min). After a full lap with no healthy
frame, the title line says: *"This station is not broadcasting. Still trying."*
— the first decoded frame restores the station name, and a real ICY title then
overwrites it.
