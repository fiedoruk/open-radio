# 101 — Minimal connectivity and brand reset

Polish version: [101-minimal-connectivity-and-brand-reset.pl.md](101-minimal-connectivity-and-brand-reset.pl.md)

**Decision date:** 2026-07-16
**Scope:** public-candidate implementation; physical flash recorded separately
in report 102

## Outcome

The next candidate removes model-specific Bluetooth discovery and station-logo
runtime work. It restores useful favorites, adds automatic first-speaker
discovery, immediate Wi-Fi setup QR rotation, complete local-data erase and
provisioning of a future same-phone hotspot. Existing audio buffers, routing
and reconnect thresholds are frozen.

## Bluetooth speakers

After Wi-Fi and buffered local radio playback are healthy, Bluetooth starts
automatically. A remembered address always has priority. With no remembered
peer, the device automatically discovers Bluetooth Classic audio/rendering
Class-of-Device results, tries the first compatible result and remembers its
address only after A2DP media starts. Failed initial discovery is retried at a
bounded one-minute interval while the local speaker keeps playing. Manual scan
remains only a recovery/replacement action. No path matches marketing names
such as Xiaomi, MOZOS or Soundcore. A missing advertised name receives a
neutral local label instead of being rejected.

This is standards-based discovery, not a promise of universal compatibility.
Every exact speaker still needs physical A2DP/SBC, volume, fallback and
reconnect qualification. Soundcore states that Boom Go 3i supports SBC and AAC;
SBC makes it a suitable candidate for the ESP32 contract. Its official product
page also states 15 W, 24-hour playback and a 4,800 mAh power-bank output. These
supplier claims remain unverified until the delivered unit is tested.

## Favorites

The main area of a favorite row now selects that favorite's station, clears
stale metadata, persists the station selection and returns to Now Playing. The
chevron still opens detail and two-step deletion. Saving remains local,
deduplicated, bounded to 32 entries and committed through the existing A/B NVS
repository.

## Wi-Fi changes

While the setup portal is active, the left footer action stops and restarts the
local AP, generating a fresh random WPA2 password, CSRF token and QR payload.
The right action closes it only while the radio is already online.

For a phone that will itself become the hotspot:

1. Keep the phone hotspot off and join `OpenRadio-Setup`.
2. Choose the manual future-hotspot action and enter its secured SSID/password.
3. The radio keeps the credentials only in RAM and returns a waiting state.
4. Disconnect the phone from the setup AP and enable its hotspot.
5. The radio retries for at most two minutes and stores the profile only after
   an actual secured connection.

Visible open networks remain rejected and automatic joins remain limited to
previously approved secured profiles.

## Automatic memory and complete local reset

The radio retains up to eight approved secured Wi-Fi profiles and automatically
chooses a reachable known network. It also retains the successfully playing
Bluetooth address, favorites, UI choices and last-known-good station state.

System settings expose a destructive `Erase data` action. The first touch arms
an explicit red confirmation and the second erases the complete default NVS
partition before restart. This removes application configuration, Wi-Fi
credentials, Bluetooth identity and bond state, favorites and cached runtime
state; it does not erase firmware or the private factory backup. The next boot
starts local onboarding from a clean state.

## Local visual identity

Station artwork networking, download manifests, decoding, cache and UI actions
are removed. Stations use only project-original monograms, geometric motifs and
local colors. Open Radio blue is the global interaction color in both themes;
station colors remain content identity rather than global chrome.

## Qualification state

Host contracts and the public PlatformIO build cover the new source. The exact
binary was guarded-flashed and passed a short automatic boot-to-A2DP smoke.
The 3/3 speaker reconnect cycles and 60-minute rung are still required; see
report 102 for the measured boundary.

Two clean public builds are byte-identical. Firmware SHA-256 is
`ac3bda385a1300558463f1a31ddae1ddcadf062a95595fef80164aa85f583950`;
the binary is 2,232,656 bytes. Reconnect retries use a bounded 8–20 second
jitter and never issue a second source dial before the lower A2DP callback has
closed the previous attempt. This is reproducibility evidence; physical gates
remain separate.

Primary references: [ESP-IDF Wi-Fi APSTA overview](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/wifi-driver/overview.html), [ESP-IDF Classic GAP API](https://docs.espressif.com/projects/esp-idf/en/v4.4.8/esp32/api-reference/bluetooth/esp_gap_bt.html), [ESP-IDF A2DP source example](https://github.com/espressif/esp-idf/blob/master/examples/bluetooth/bluedroid/classic_bt/a2dp_source/README.md), [Soundcore Boom Go 3i product page](https://www.soundcore.com/pl/products/d5103-boom-go-3i-portable-speaker-for-powerful-sound) and [Soundcore codec FAQ](https://service.soundcore.com/article-description/What-Bluetooth-codecs-does-the-Boom-Go-3i-support).
