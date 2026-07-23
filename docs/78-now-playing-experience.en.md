# 78 — Now-playing experience and enclosure research

[Polska wersja](78-now-playing-experience.pl.md)

## Decision

The GUI Lab now exposes two playback screens and three screensaver directions.
Variant 1 keeps the established editorial station identity but replaces the
oversized reliability message with useful track metadata. Variant 2 is a
minimal glance screen with station, local clock, optional weather and a compact
precipitation-soon card. No playback or persistence logic changes in S17.

## Track metadata

The primary source is optional ICY `StreamTitle` metadata exposed by the stream
client. Input is bounded, control characters are removed and stale metadata is
discarded. A station that supplies no usable title falls back to station name
and playback health; the product never claims that every station supplies song
metadata. Reference implementation evidence:
<https://github.com/earlephilhower/ESP8266Audio>.

## Weather and privacy

Weather is optional and must never block boot or playback. Location starts
automatically after approved secured Wi-Fi: a saved result for that network is
preferred, then an available onboarding-device position, approved Wi-Fi
positioning, keyless IP geolocation and finally the country default. Manual
correction always wins but is not required. Open-Meteo needs no account or API
key for the non-commercial case; the device requests only temperature, WMO
weather code and precipitation probability, caches the last good result, backs
off on failure and hides the widget when stale. Provider attribution is shown
in About Pro. Sources:
<https://open-meteo.com/en/docs> and <https://open-meteo.com/en/license>.

## Universal market model

The GUI consumes normalized location/weather facts, not a Poland-specific
provider response. Automatic location supplies country, timezone, locale and
station-region candidates. Country packs provide strings, units and safe
fallbacks. Radio playback, station resolution and recovery do not depend on a
location or weather endpoint.

## Widget priority

Always visible: station, current title when available and output route. Glance
variant: local RTC clock, optional temperature and precipitation soon. Shown
only when actionable: Wi-Fi recovery, Bluetooth fallback and low battery.
Rejected for the first release: headlines, calendar, air-quality dashboard and
remote station logos. A sleep timer is the best next optional radio-specific
widget, but it is not part of S17.

## Audio-reactive screensavers

S19 adds persisted Display settings: screensaver ON/OFF, Pulse/Bars/Orbit mode,
30-second to ten-minute activation and independent screen-off after 15, 30 or
60 minutes. The default is Pulse after two minutes and screen-off after 30
minutes. Screen-off affects only the panel/backlight; audio and recovery keep
running and any touch wakes the display.

The dry-run offers Pulse, Bars and Orbit. GUI Lab uses a clearly labelled
synthetic envelope. Firmware must use a bounded PCM analysis tap, cap drawing
at 16 fps, skip frames under audio pressure and exit on any touch. Pulse and
Orbit need amplitude only; the multi-band Bars mode remains a physical
performance gate. All three modes remain `NOT_MEASURED` on Core2.

## Rear enclosure shortlist

First choice is the original Core2 battery bottom or official M5GO Bottom2,
because it preserves the battery, IMU and microphone design. The official
M5Stack hardware repository provides revision-specific `Core2_Base.stl` and
`Core2_v1.1_Base.stl` files for a project-owned minimal shell:
<https://github.com/m5stack/M5_Hardware>. A community “Simple M5Stack Back
Cover” is visually minimal but remains an unverified fit candidate, not a
recommendation to print before the exact Core2 revision is in hand:
<https://cults3d.com/en/3d-model/gadget/simple-m5stack-back-cover>.

## Hardware gate

After arrival, identify the Core2 revision, photograph and measure the exposed
rear, confirm whether battery/IMU/microphone must remain, then test screw
positions, USB-C and SD access, speaker ventilation, antenna clearance and heat
on continuous power. Only then select the official bottom, adapt official CAD
or qualify a community print.
