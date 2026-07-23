# Open Radio Core2

<p align="center"><img src="brand/logo-a-signal-cube.svg" width="92" alt="Open Radio — signal cube logo"></p>

<p align="center">
  <a href="https://github.com/fiedoruk/open-radio/actions/workflows/ci.yml"><img src="https://github.com/fiedoruk/open-radio/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/release-0.2.1-3db8f5" alt="Release 0.2.1">
  <img src="https://img.shields.io/badge/license-GPL--3.0--or--later-blue" alt="GPL-3.0-or-later">
  <img src="https://img.shields.io/badge/platform-M5Stack_Core2-orange" alt="M5Stack Core2">
  <img src="https://img.shields.io/badge/stations-218_verified-success" alt="218 verified stations">
  <img src="https://img.shields.io/badge/tests-238_·_38_gates-success" alt="238 tests, 38 gates">
</p>

<p align="center"><a href="https://fiedoruk.pl/open-radio-en.html"><img src="https://fiedoruk.pl/assets/img/or/core2-1.jpg" width="740" alt="Open Radio playing on a real M5Stack Core2 cube"></a></p>

<p align="center">
  <img src="https://fiedoruk.pl/assets/img/or/screen-1.png" height="150" alt="Now-playing screen">
  <img src="https://fiedoruk.pl/assets/img/or/screen-2.png" height="150" alt="Station picker">
  <img src="https://fiedoruk.pl/assets/img/or/screen-3.png" height="150" alt="Settings screen">
  <img src="https://fiedoruk.pl/assets/img/or/screen-4.png" height="150" alt="Status card">
</p>

<p align="center"><b><a href="https://fiedoruk.pl/open-radio-install-en.html">⚡ Install from the browser</a></b> · <a href="https://fiedoruk.pl/os/open-radio-0-2-1.bin">Download 0.2.1</a> · <a href="docs/116-release-0-2-1.en.md">Release notes</a> · <a href="https://fiedoruk.pl/open-radio-stations-en.html">The 218 stations</a></p>

> Released publicly as **Open Radio** — the current release is **0.2.1**
> (2026-07-22, hardware-validated on both Core2 revisions in the field);
> 0.1 and 0.2 remain downloadable as historical builds.
> Official binaries come only from [fiedoruk.pl/open-radio](https://fiedoruk.pl/open-radio.html).
> Release notes and known limitations: [docs/116-release-0-2-1.en.md](docs/116-release-0-2-1.en.md).

Open Radio is AI-assisted, human-directed and owner-accountable: every public
release is gated by executable tests, exact artifact hashes, documented
hardware evidence and an explicit known-limitations list.

Open Radio Core2 is a reliability-first, open-source internet-radio cube for
M5Stack Core2. It is designed to play Polish stations over Wi-Fi through a
remembered Bluetooth speaker, with the built-in speaker as an automatic fallback.

[Polska wersja](README.pl.md)

## Product promise

Turn it on and it plays. Daily listening requires no account, phone, project
cloud or routine update. A phone is used only when a new Wi-Fi network must be
configured through the local device portal.

The radio is designed to:

- remember approved Wi-Fi networks and select one that is reachable,
- reconnect to the last Bluetooth speaker,
- resume the last working station,
- fall back to its built-in speaker,
- recover from Wi-Fi and stream failures without a reboot,
- explain actionable failures in plain language,
- keep its last-known-good catalog and configuration on the device.

It never autojoins unknown or open networks. There is no telemetry, account,
automatic OTA, recording, project-operated backend or routine remote catalog.
The current device firmware uses optional direct NTP time synchronization only.
Any future approximate-location or weather lookup must be bounded and must never
become a boot or playback dependency.

## What “Core2” means

Core2 is the target hardware model: **M5Stack Core2**. It is a technical
qualifier, not necessarily the final consumer-facing brand. Keeping it in the
working title makes the hardware boundary honest while the final name remains
open.

## Honest Bluetooth promise

The testable contract is standards-based interoperability with Bluetooth
Classic A2DP Sink speakers using SBC. Playback does not require AVRCP or
vendor-specific features. Bluetooth LE Audio-only speakers are outside the
original ESP32 hardware contract. No claim of universal speaker compatibility
will be made before physical qualification.

## Current station scope

The device holds nine station slots, and **you pick those nine yourself from
a built-in directory of 218 Polish stations** — each verified by a real
connection and measured under load — at first power-on and any time later
through the phone console (QR). Browse the full directory at
[fiedoruk.pl/open-radio-stations-en](https://fiedoruk.pl/open-radio-stations-en.html).

The factory default nine (used until you choose your own): RMF FM, Radio ZET,
TOK FM, Antyradio, Radio ESKA, RMF MAXX, Radio Plus, Złote Przeboje and
Meloradio.

Every directory entry ships with an MP3 playback path in the public source lane.
The private hardware-lab lane can retain an AAC fallback for diagnosis, but AAC
and HLS remain outside a public binary until separate legal, transport and
resource gates pass. The project does not proxy, rebroadcast or record station
audio and does not imply broadcaster endorsement.

## Hardware target

- M5Stack Core2 with ESP32-D0WDQ6-V3 — field-validated on hardware
  revisions v1.0 (AXP192) and v1.1 (AXP2101) with the same image; every new
  Core2 revision joins the release test matrix as soon as it is available
- 16 MB flash and 8 MB PSRAM
- 320×240 touch display
- built-in I2S speaker and internal battery
- continuous USB-C power from a power bank
- Bluetooth Classic A2DP Source output

## Current status

**The public release 0.2.1 runs on real devices: release-day smoke passed on
the owner's Core2 v1.0 and an external user independently installed and
confirmed it on a factory-fresh Core2 v1.1. The historical note below about a
failed 60-minute run describes an older pre-release lab image, not 0.2.1;
formal endurance qualification of 0.2.1 remains open.**

Available now:

- exact 320×240 light and dark GUI previews,
- full and minimal now-playing layouts,
- local settings, screensavers and screen-off policy,
- local Wi-Fi onboarding with multiple secured profiles and bounded recovery,
- executable MP3 resolver paths for all nine current catalog entries,
- built-in-speaker playback routing and automatic model-agnostic discovery of
  Classic Bluetooth audio-rendering devices, with one approved peer remembered
  by address through the bounded pairing/link flow,
- up to eight automatically selected approved Wi-Fi profiles plus a two-touch
  full local-data reset,
- host-side renderer, persistence and firmware-contract tests,
- reproducible firmware source, guarded exact-image restore and hardware
  evidence capture.

Measured so far:

- Xiaomi Sound Pocket Classic A2DP/SBC playback;
- a focused 600-second RMF run on the corrected image with one real stream
  restart, no injected Bluetooth silence and a clean owner-audible final window;
- an earlier nine-station smoke in which every station recovered, with recorded
  rough edges that do not transfer an H4 verdict to the corrected image;
- a complete 60-minute evidence capture that failed on an A2DP recovery panic
  and a later, distinct measured period with no decoded PCM. The capture does
  not prove whether the two failures were causally independent; automatic
  recovery eventually refilled both queues but does not convert the run into a
  pass.

Still open on the corrected image:

- forced local-speaker fallback, Wi-Fi recovery and three-cycle Bluetooth
  reconnect,
- A2DP pull-watchdog/fallback/reconnect safety, complete nine-station switching
  and endurance qualification,
- additional Classic Bluetooth A2DP/SBC speaker interoperability,
- PMU/battery, SD and 8-hour playback endurance,
- removal of blocking network work from the owner loop, a justified DRAM budget
  and final enclosure fit.

The public MP3-only lane is the released lane: 0.2.1 reproduces byte-for-byte
outside its provenance stamp when the documented build parameters are honored
(see [REPRODUCIBILITY.md](REPRODUCIBILITY.md)). Endurance items above stay open
and are listed honestly in the release notes.

Detailed engineering evidence is maintained in [STATUS.md](STATUS.md).

## Preview the software

From the repository root:

```bash
npm run simulator
```

Open `http://127.0.0.1:4173/gui-lab/` for the canonical device emulator. It has
one visible 320×240 canvas, no renderer tabs and no zoom control. Every visible
device pixel comes from the same C++ RGB565 renderer linked into the Core2
target, including the bundled Inter 600 atlas and compiled icon masks. The 26
screens produce 104 deterministic PL/EN and Light A/Dark B variants.

The canvas proves the logical framebuffer and interaction flow, not the
physical two-inch size, IPS color, brightness, touch calibration or real-device
readability. Those remain hardware measurements. The separate recovery and
onboarding simulators remain engineering tools outside the device emulator.
See the [corrected emulator pixel-parity audit](docs/86-emulator-pixel-parity-audit.en.md).

## User guide

Read [USER-GUIDE.md](USER-GUIDE.md) for first start, daily controls, display
settings, recovery behavior, privacy and known limitations.

## Development and validation

```bash
npm run check
```

The complete host gate validates contracts, generated files, documentation
parity, renderer determinism, firmware-host behavior and source reproducibility.
Device backup, flash, erase and monitor commands remain outside this command.

## Key documentation

- [USER-GUIDE.md](USER-GUIDE.md) — user flow and controls
- [CONTRIBUTING.md](CONTRIBUTING.md) — contribution rules
- [STATUS.md](STATUS.md) — measured project state and open risks
- [docs/66-pixel-perfect-gui-system.en.md](docs/66-pixel-perfect-gui-system.en.md) — GUI contract
- [docs/75-hardware-arrival-handoff.en.md](docs/75-hardware-arrival-handoff.en.md) — first physical session
- [docs/86-emulator-pixel-parity-audit.en.md](docs/86-emulator-pixel-parity-audit.en.md) — exact preview scale and firmware-parity limits
- [docs/88-final-pre-hardware-audit.en.md](docs/88-final-pre-hardware-audit.en.md) — final software verdict and hardware-day checklist
- [docs/85-novice-ux-public-readiness-audit.en.md](docs/85-novice-ux-public-readiness-audit.en.md) — novice UX and public-readiness audit

Historical loop reports remain under `docs/` as engineering evidence, not as
the recommended starting point for users.

## Attribution and license

Founder and original author: **Tomasz Fiedoruk — [fiedoruk.pl](https://fiedoruk.pl)**.

Software is licensed under `GPL-3.0-or-later`, original documentation and
artwork under `CC BY-SA 4.0`, and catalog data under `CC0-1.0`. Official station
logos are not bundled without documented permission. Public firmware releases
(0.1, 0.2, and the current 0.2.1) ship from `fiedoruk.pl/os/`; the
corresponding-source archive for the current release is published alongside
the binary, and each release records its provenance in a release manifest.
