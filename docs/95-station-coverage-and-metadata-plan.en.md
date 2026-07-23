# Station coverage and metadata plan

[Polish version](95-station-coverage-and-metadata-plan.pl.md)

**Date:** 2026-07-15  
**Status:** execution plan after first hardware boot; estimates are focused
engineering time, not a release date.

## Nine-station status

| Station | Transport | Current state | Acceptance condition |
|---|---|---|---|
| RMF FM | MP3/ICY | runs in the current engine | 60 minutes without interruption and correct reconnect |
| Radio ZET | MP3/ICY | runs in the current engine | 60 minutes without interruption and correct reconnect |
| TOK FM | MP3/ICY | source parser pending | official endpoint, LKG and 60 minutes |
| VOX FM | HLS/HE-AAC | decoder missing | shared HLS/HE-AAC engine and 60 minutes |
| Złote Przeboje | MP3/ICY | runs in the current engine | 60 minutes without interruption and correct reconnect |
| Chillizet | MP3/ICY | runs in the current engine | 60 minutes without interruption and correct reconnect |
| RMF MAXX | MP3/ICY | runs in the current engine | 60 minutes without interruption and correct reconnect |
| Radio ESKA | HLS/HE-AAC | experimental device candidate builds | segment/decode proof, reconnect and 60 minutes |
| ESKA Impreska | HLS/HE-AAC | decoder missing | shared HLS/HE-AAC engine and 60 minutes |

Five MP3 stations are executable by the firmware today. TOK FM is a separate,
small parser package. Radio ESKA now has an experimental bounded HLS/HE-AAC
path; VOX FM and ESKA Impreska remain disconnected until that shared engine
passes the device gate.

## Sequence and estimate

1. **Stabilize the current five MP3 stations — 0.5–1 day.** Each station gets
   a 60-minute run, Wi-Fi/stream reconnect and `audio_starvation == 0`.
2. **TOK FM — 1–2 days.** Audit the official player, implement a bounded
   parser, persist last-known-good and test on the device.
3. **ESKA HLS/HE-AAC spike — day 1 of the shared budget.** Parse master/media
   playlists, fetch one segment, test a decoder with SBR and measure CPU/RAM.
   Produce an explicit go/no-go result.
4. **Production HLS/HE-AAC — the next 2–4 days.** Segment buffer, playlist
   refresh, relative URLs, discontinuity, reconnect, rollover and shared
   local/A2DP output.
5. **VOX FM and ESKA Impreska — the final 1–2 days of the shared budget.**
   Attach them to the shared engine, add individual resolvers and run each
   station for 60 minutes.
6. **Nine-station gate — 1 day without feature changes.** Sequentially test
   every station, Wi-Fi loss, restart and LKG restoration.

Stages 3–5 share one **4–7 day** budget; they are not three additive budgets.
The realistic total for a reliable 9/9 set is about **6–10 focused working
days** after the current P1 defects are closed: TOK FM 1–2, all HLS work 4–7,
and the final gate 1 day. Confirming HE-AAC/SBR on the ESP32 is the main risk,
not playlist parsing itself.

## Current-track cover art

The current firmware displays `StreamTitle` and station artwork, but it does
not look up track covers. The planned pipeline is isolated from playback:

1. a per-station parser normalizes `StreamTitle` into `artist` and `title`;
2. lookup runs only for a new valid title and uses an allowlisted documented
   public source;
3. each image is limited to 96 KiB and decoded into 128×128 RGB565 outside the
   audio hot path;
4. a local LRU cache keeps at most 16 covers and 1 MiB;
5. a timeout, miss or bad image immediately falls back to the station
   logo/monogram and never stops radio playback;
6. no Google or Spotify scraping and no project-operated backend.

An MP3-station prototype is 1–2 days. A production implementation with cache,
limits, redacted logs and failure tests is 2–4 days. HLS station metadata
follows the HLS engine.

## Readiness definition

`9/9 ready` means every entry starts from the embedded catalog, plays for 60
minutes through both local and A2DP output, recovers Wi-Fi and stream, never
blocks the GUI, and can restore last-known-good after restart without a remote
catalog dependency. Cover art is an enhancement and is not on this gate's
critical path.
