# Open Radio Core2 — user guide

[Polska wersja](USER-GUIDE.pl.md)

## Current hardware evidence

The current public release 0.2.1 is hardware-validated: release-day smoke
passed on the owner's Core2 v1.0, and an external user independently installed
and confirmed it on a factory-fresh Core2 v1.1, so both hardware revisions
have field evidence. Battery duration, power-bank behavior and long endurance
runs remain unmeasured for 0.2.1 — the release notes list every known
limitation ([docs/116-release-0-2-1.en.md](docs/116-release-0-2-1.en.md)).

## First start

1. Power the radio over USB-C.
2. If no approved Wi-Fi network is stored, connect a phone to the temporary
   `OpenRadio-Setup` network using the one-time WPA2 code shown on the radio.
   The captive portal opens locally; if it does not, open `192.168.4.1`.
3. Add a secured Wi-Fi network. Unknown and open networks are never autojoined.
4. The built-in speaker starts first so sound does not depend on Bluetooth.
5. The radio reconnects its remembered Bluetooth Classic A2DP/SBC speaker. With
   no remembered speaker it starts a standards-based audio-device scan; the
   local Bluetooth screen can repeat that scan.

The phone is not required after onboarding unless a new network must be added.

## Daily screen

The bottom controls move to the previous station, open the station grid and move
to the next supported station. The settings button opens all device preferences.

Two home layouts are available:

- **Full** prioritizes station identity and the current ICY title when present.
- **Minimal** prioritizes the clock and keeps station information intentionally compact.

The selection is stored on the device. Missing metadata never stops audio; the
relevant field falls back or disappears.

## Settings

Settings are split into three clearly numbered pages:

- **Quick:** Wi-Fi status, Bluetooth, volume, brightness, theme and language.
- **System:** location/region, display, project information, diagnostics, home
  layout and Bluetooth rescan.
- **Display:** screensaver on/off, delay, mode, screen-off on/off, delay and preview.

Cards use one-tap bounded choices. Values wrap through a short predefined list;
there is no hidden text configuration or source-code editing.

## Local noise

From Settings, tap the concentric-circles icon beside **X** to open the fully
local Noise mode. Tap the large control to play or stop and choose White, Pink
or Brown below it; hardware A/C change color, while B or **X** returns to the
last station. The cube stores the selected mode and color, resumes Noise after
a power cycle, and keeps the same Bluetooth output and built-in-speaker
fallback without making Wi-Fi a playback dependency.

## Screen sleep

Pulse, Bars, Orbit and Kiara are visual screensavers. They start after 30 seconds to
10 minutes, depending on the selected setting. The display can turn off after
15, 30 or 60 minutes. Audio, networking and recovery continue. Touch wakes the
screen and returns to the selected daily layout.

## Recovery behavior

- Lost Wi-Fi: the radio retries known networks with bounded backoff.
- Broken stream: the radio reopens the stream and rotates available candidates.
  Stable-dwell scoring and per-endpoint quarantine are not implemented yet.
- Lost Bluetooth: audio falls back to the built-in speaker while bounded reconnect
  attempts continue.
- Invalid configuration: safe mode avoids unknown networks and offers local repair.

## Privacy

There is no account, analytics or project-operated backend. Wi-Fi credentials,
known-network identifiers and diagnostics stay on the device. The current
firmware uses optional direct NTP time synchronization. Planned location and
weather enhancements are not present in the device firmware and must never
become playback dependencies.

## Known limitations

- The historical notes below about a failed 60-minute run describe an older
  pre-release lab image, not the shipped 0.2.1.
- Forced Wi-Fi/stream/speaker recovery cycles, PMU/battery/SD behavior and
  longer endurance remain formally unqualified for 0.2.1.
- All nine current catalog entries use MP3 paths, but endpoint availability
  can change independently of any firmware release.
- The full known-limitations list for the current release lives in
  [docs/116-release-0-2-1.en.md](docs/116-release-0-2-1.en.md).
- Official station logos are not publicly bundled without permission.
- Bluetooth LE Audio-only speakers are outside the Core2 contract.
- The current public release is 0.2.1; endurance and battery duration are not
  yet formally qualified.

See [STATUS.md](STATUS.md) for current measured evidence and
[docs/75-hardware-arrival-handoff.en.md](docs/75-hardware-arrival-handoff.en.md)
for the physical validation sequence.
