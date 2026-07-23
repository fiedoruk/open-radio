# 30 — Offline station resolver contract

## Purpose

The resolver model decides what the device should try and when it should stop
trying. It never downloads a project catalog, proxies audio or assumes that an
operator endpoint is permanent. Tests run without internet, hardware or real
waiting.

## Catalog layers

The embedded station record contains canonical identity and official discovery
surfaces. It does not contain temporary playback hosts returned by operator APIs.

```text
embedded station
  -> official discovery candidate
  -> transient playback endpoint returned at runtime
  -> decoder capability check
  -> last-known-good only after successful playback
```

Discovery candidates always use `DISCOVERY_ONLY`. A runtime stream URL may be
cached locally as last-known-good, but it is not promoted into the public
canonical catalog.

## Candidate order

1. non-quarantined candidates before quarantined candidates,
2. higher health score before lower score,
3. primary before alternate when scores are equal,
4. last-known-good after discovery candidates during recovery,
5. optional `preferLastKnownGood` only for fast startup from a proven endpoint.

Reference-only official pages remain provenance and human recovery surfaces.
The device model records a skip instead of pretending that an HTML article is a
machine-readable resolver.

## Health policy

Each runtime candidate starts at score 100.

| Outcome | Score | Immediate behavior |
|---|---:|---|
| success | +20, capped at 100 | clear failures and quarantine |
| timeout | -25 | try another candidate; quarantine after repetition |
| HTTP 404 | -50 | quarantine for at least 30 seconds |
| stale response | -20 | try another candidate, bounded retry |
| parse error | -35 | try another candidate, then bounded retry |

Two consecutive failures or score 50 and below activate quarantine. Backoff is
bounded to 5 s, 30 s, 120 s and 600 s. There is no unbounded loop in one resolver
call; each eligible candidate is attempted at most once.

## Last-known-good

The public trace contains only `lkg:<station-id>`. It never contains the cached
URL, query string, CDN hostname or user network information. A successful LKG
attempt returns `PLAYING`; failure continues to bounded retry.

## Capability boundary

The current software proof declares `MP3_ICY` supported by the resolver model.
`HLS_HE_AAC` returns `UNSUPPORTED` before any endpoint attempt because its decoder
does not exist yet. This is intentional evidence, not a launch exclusion.

## Result states

- `PLAYING`: a candidate or LKG succeeded,
- `RETRY_SCHEDULED`: no candidate succeeded; next attempt has a bounded time,
- `UNSUPPORTED`: the transport/codec class is not implemented.

## Logging and privacy

Allowed local diagnostic fields:

- station ID,
- candidate ID,
- outcome class,
- score before/after,
- quarantine deadline relative to the deterministic/device clock,
- selected result state.

The device-local Pro diagnostics view may additionally show current SSID, local
IP, location source/accuracy and current endpoint host. These values stay
ephemeral and are not copied into resolver traces.

Prohibited exported/community fields:

- resolved stream URL,
- query string or access token,
- temporary CDN hostname,
- listening history upload,
- exact coordinates, public IP, SSID/BSSID, Wi-Fi password or Bluetooth address,
- audio data or metadata payload.

The model has no network code and no telemetry sink.

## Local simulation

Run `npm run simulate:resolver` to print all nine deterministic terminal states.
The table contains only station/candidate IDs, step counts and bounded retry time;
it never prints discovery or last-known-good URLs.
