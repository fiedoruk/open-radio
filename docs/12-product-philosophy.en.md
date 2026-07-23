# Product philosophy

## One sentence

**A radio that simply plays. No account, cloud, or tracking.**

## Principles

1. **Reliability before features.** Playback matters more than animations, metadata and integrations.
2. **Appliance behavior.** Power on, reconnect and resume without daily setup.
3. **Local first.** Credentials, stations, settings and diagnostics stay on the device.
4. **Finished appliance.** No project backend, automatic OTA or routine remote catalog is required or polled.
5. **Last-known-good.** Broken configuration, resolver responses and station endpoints must not destroy the last working state.
6. **Small trusted core.** Every dependency and background task must justify its reliability cost.
7. **Visible failure.** The screen explains whether Wi-Fi, the stream or Bluetooth is failing.
8. **Graceful degradation.** Bluetooth failure falls back to the built-in speaker.
9. **Open operation.** Network endpoints, dependency versions and known limitations are documented.
10. **Community without lock-in.** Forking, local stations and offline configuration remain possible.
11. **PL-first product, EN-first code.** Polish is the default UI; source code and technical interfaces use English.
12. **Respect third parties.** Original station themes are open; official logos require permission. No rebroadcasting, recording or implied endorsement.
13. **One recovery goal.** On-device QC always tries to restore audible playback.

## What viral means here

Viral does not mean collecting user data or adding social features. It means:

- a device people understand in ten seconds,
- a visually clear now-playing screen,
- a reproducible build and ready release binaries,
- an About screen linking to the repository,
- easy station-catalog pull requests,
- shareable enclosures and original themes from day zero,
- visible founder credit for Tomasz Fiedoruk and visible contributor credit.

## Non-goals for MVP

- accounts,
- cloud dashboards,
- listening analytics,
- recording,
- podcasts and catch-up services,
- Spotify or DRM services,
- automatic OTA updates or project catalog polling,
- multiple Bluetooth speakers,
- remote phone control,
- publicly bundled official station logos without permission.

Owner-approved bounded exception: locally synthesized White, Pink and Brown
noise is the second and final playback mode. It adds no network service,
downloaded audio, extensibility surface or dependency to radio playback.
