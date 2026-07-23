# 80 — Autonomous configuration audit

> Implementation status was advanced by S19. The policy audit remains valid;
> live host adapters and bounded caches are documented in document 82.

[Polska wersja](80-autonomous-configuration-audit.pl.md)

## Verdict

The previous privacy interpretation was too broad. It treated data minimization
as a ban on direct public lookups and made the user choose information the
device can infer. The corrected principle is: automate first, keep data local
when possible, disclose unavoidable direct egress, cache results and always
preserve offline radio operation.

## Location pipeline

After approved secured Wi-Fi becomes online, `AUTO_OPTIMIZE` runs without a
question. It prefers a manual correction, a fresh location saved for that Wi-Fi
profile, onboarding-device geolocation when the browser can legally provide it,
approved Wi-Fi positioning, keyless IP geolocation and finally the country-pack
default. A more accurate available source can replace a weaker estimate.

## External data truth

IP geolocation cannot be entirely on-device unless a large, frequently updated
IP database is bundled. A direct lookup necessarily exposes the request's
public IP to the provider. Weather necessarily exposes the request IP and
coordinates. Wi-Fi positioning would expose nearby BSSIDs and signal strength.
These requests are useful configuration traffic, not analytics, but they are
still external data transfer and are documented as such.

## Other corrected over-blocks

Optional SNTP is now architecturally allowed for the visible clock and RTC;
recovery timers remain monotonic. Country, timezone, locale and station-region
candidates come from automatic location. Internal Pro diagnostics may show
current SSID/local IP, location accuracy and endpoint host. Only exported or
community evidence must redact those facts. Approved enhancement endpoints use
a machine-readable allowlist instead of a blanket firmware URL ban.

## Restrictions retained

The radio still never autojoins unknown/open networks, uploads listening
history, runs project analytics, requires an account or project backend, polls
for OTA/catalog updates, bundles unlicensed station logos, connects to an
unapproved Bluetooth speaker or lets weather/location failure interrupt audio.
These remain reliability, consent, legal or secret-handling boundaries rather
than accidental privacy blocks.

## Implementation

`ui-contract/location/auto-location.v1.json` defines source ranking, refresh,
storage and egress. `location/auto-location.mjs` selects the best fresh result
deterministically. The default DeviceConfig enables automatic approximation;
onboarding presents it as already active, with correction or disable available.
The GUI marks the weather locality as `AUTO`.

## Current boundary

The selection mechanism and GUI are host-tested. Live IP, Wi-Fi positioning,
SNTP and weather adapters are not in RC1 firmware yet. Google-style Wi-Fi
positioning is supported as a source but disabled in the public default because
the available API requires a key/billing and transmits nearby BSSIDs. It may be
enabled only after an approved provider and secret-placement design exist.

## Next gate

Implement the keyless IP adapter first, then weather and optional SNTP behind
independent bounded supervisors. On Core2, measure TLS memory, timeouts, cache
recovery and continued playback during every provider failure before enabling
them in the physical candidate.
