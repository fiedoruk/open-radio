# ADR-010 — Runtime station logos fetched by the device

**Status:** ACCEPTED — OWNER DECISION 2026-07-21
**Date:** 2026-07-22
**Supersedes:** the "no station-artwork request" clause of ADR-007

## Context

ADR-007 removed all station-artwork networking: monograms were the complete
station identity. Release 0.2 reopened the question under two owner rules:
the owner always runs the exact image customers download (no owner-only
embedded logo pack), and logos must appear with no manual intervention —
"fetched by the cube itself, the same for everyone".

A phone-relay design (browser downloads, converts and posts pixels) was
considered and rejected: it adds CORS, a POST surface and a second image
pipeline, and hands the device a URL chosen by a client.

## Decision

The device fetches its nine tile logos itself, once, unattended:

- The compiled-in catalog carries one favicon URL per station. Every URL
  passed a same-day QC probe (HTTP 200, PNG magic, sane dimensions) before it
  was allowed into the catalog. The phone never supplies an address, so there
  is no SSRF surface by construction.
- The fetch runs in the window after Wi-Fi associates and before the
  Bluetooth stack exists — the only time the device has both internet and
  enough internal heap for TLS. `setInsecure()` is deliberate: an icon is
  decoration, not a trust boundary, and pinning eighty broadcaster CDNs is
  unmaintainable.
- LovyanGFX decodes PNG only (float scale; JPEG offers only power-of-two
  divisions). The result is a 96×96 cover-cropped RGB565 tile on SPIFFS with
  a URL-hash sidecar, so a catalog or slot change refetches instead of
  showing the previous broadcaster's mark forever.
- The renderer paints through a runtime provider registered at boot; missing
  or failed logos fall back to the project-original monogram. The host never
  registers a provider, so the deterministic render contract is unchanged.

## Legal position

Broadcaster logo bytes never enter the repository, the firmware image or any
project server. The user's own hardware fetches each broadcaster's published
icon from the broadcaster's own origin, on the user's behalf, exactly as a
browser would. Public redistribution, screenshots and marketing remain
separate rights questions (unchanged from ADR-007).

## Consequences

One image for everyone: the owner-production lane with `EMBED_LOGO_PACK`
left the release path. First boot after provisioning shows monograms for a
few seconds while the fetch runs; the title line explains the quiet start.
A station without a QC-verified PNG icon keeps its monogram permanently —
that is the designed degradation, not an error.
