# 112 — Logos, one image, catalog classes

[Wersja polska](112-logos-one-image-catalog-classes.pl.md)

**Purpose:** record the second phase of release 0.2 — automatic station
logos, a single product image and the measured catalog
**Covers:** the logo chain, the owner-image rule, directory classes A/B/C,
the console session and the device address
**Does not authorise:** device writes, audio-path changes or a release

## One image for everyone

The owner's rule reshaped the release: **the owner always runs the exact
image customers download.** The `core2-owner-production` lane with an
embedded logo pack left the release path; `core2-public-candidate` is the
product lane, and the registry accepts it for flashing. Nothing about the
owner's cube is special any more — which is the point: every regression the
owner can see is a regression a customer would see.

## The logo chain (ADR-010)

Logos are fetched by the cube itself, once, unattended:

```
catalog carries QC-verified favicon URLs (probed the same day: 200, PNG
magic, sane dimensions)
   │  first Wi-Fi association, BEFORE the Bluetooth stack exists
   │  (the only window with both internet and heap for TLS)
   ▼
LovyanGFX PNG decode → 96×96 cover-crop → RGB565 on SPIFFS
(`/lN.bin` + `/lN.url` sidecar hash pinning pixels to the URL)
   ▼
renderer runtime provider — logo clipped INTO the rounded tile,
monogram when absent; host never registers a provider, so the
deterministic render contract is unchanged
```

The phone never supplies an address, so there is no SSRF surface by
construction. A station without a QC-verified PNG keeps its monogram — the
picker marks which directory stations carry a fetchable logo.

Factory-on-new-build erases NVS **and** the logo store, so every build walks
the customer's first-run path; the sidecar hash refetches a logo whenever a
slot's station (and with it the URL) changes.

## Catalog classes — "truly does not stutter", measured

Every endpoint was probed by our own raw socket (15 s per endpoint,
ICY-aware, redirect-following), identity-checked by `icy-name`, and graded
by sustained intake relative to that stream's own need:

| Class | Criterion | Stations | In the 0.2 picker |
|---|---|---|---|
| A | ≥1.5× realtime | 184 | yes |
| B | 1.3–1.5× | 34 | yes — ESKA's delivery class, proven on hardware in 0.1 |
| C | 1.1–1.3× | 61 | **no** — holds realtime with the slowest recovery |
| — | dead / >128 kb/s / <1.1× | rejected | no |

The burst bar is **relative** (≥3.5× the stream's own need): an absolute bar
had wrongly killed TOK FM's 64 kb/s mount. The admission floor of 1.1× is
the corrected value after the calibration-contamination lesson (docs/111):
never calibrate thresholds on symptoms gathered during your own
interference. Class C stays in the data and returns to the picker when any
of it is proven on hardware.

## Console session and the device address

After association the firmware registers **open-radio.local** (mDNS) and the
Wi-Fi screen shows the address pair (mDNS name + raw IP). The Console tile
in system settings opens a 15-minute idle window during which the portal
endpoints (`/api/directory`, `/api/slots`, CSRF as before) accept clients
from the home network; radio playback suspends for the duration — the HTTP
window competes for the same air as the stream — while local noise keeps
playing. Outside a session the server is not listening at all. A slot change
during the session restarts the device, because the new logos need the
pre-Bluetooth TLS window only a fresh boot provides.

## Cross-references

- `decisions/ADR-010-runtime-station-logos.md` — the decision and the legal
  position
- `docs/109-catalog-as-data.en.md` — endpoints as data (phase one)
- `docs/110-choosing-the-nine.en.md` — the default nine and its QC
- `docs/111-bt-audio-bottleneck-audit.en.md` — the bandwidth equation and
  measurement method
