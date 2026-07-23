# 82 — S19 autonomy layer

[Polska wersja](82-s19-autonomy-layer.pl.md)

## Result

S19 completes every host-testable part of autonomous enrichment without making
radio playback depend on a public provider. Approved secured Wi-Fi can start a
bounded IP-location lookup, compact weather forecast and optional time sync.
The layer returns normalized configuration suggestions and never throws a
provider failure into playback state.

## Service behavior

- IP location: two attempts, 3.5-second request timeout, 30-day fresh cache and
  90-day stale fallback per approved Wi-Fi profile.
- Weather: current temperature, WMO weather code and six forecast hours for
  precipitation warnings; 20-minute fresh cache and six-hour stale fallback.
- Time: optional `pool.ntp.org` synchronization with RTC fallback. Recovery
  timers remain monotonic.
- Global derivation: country, locale candidate, timezone, station region and
  weather coordinates come from normalized location facts rather than a
  Poland-specific code path.

## Display settings

The settings UI now has a dedicated Display page. Screensaver and screen-off
are independently switchable and persisted through DeviceConfig V2 atomic A/B
storage. The firmware DTO carries the same bounded values.

Default profile:

- screensaver enabled,
- Pulse mode,
- starts after two minutes,
- screen off enabled,
- panel/backlight turns off after 30 minutes,
- audio, networking and recovery continue,
- any touch wakes or dismisses the visual layer.

Available screensaver delays are 30 seconds, one, two, five and ten minutes.
Screen-off delays are 15, 30 and 60 minutes. Modes are Pulse, Bars and Orbit.

## Boundary

The host adapters, parsers, cache supervisor, contracts, GUI, persistence and
firmware DTO are implemented and tested. The physical firmware network binding
is deliberately not enabled before Core2 measurement of TLS memory, scheduler
contention and uninterrupted audio during provider timeout. This is the only
remaining S19 item and requires hardware evidence.

## Failure contract

Fresh cache wins. A failed live refresh falls back to bounded stale cache. With
no location, weather is skipped. With no provider at all, the embedded country
pack and last working radio continue. No provider receives listening history,
SSID, Bluetooth identity or a project account identifier.
