# Audio engine and quality-control direction

[Polish version](94-audio-engine-quality.pl.md)

**Date:** 2026-07-15  
**Status:** engineering position; negotiated Bluetooth codec evidence and
listening measurements are still pending on physical speakers.

## Position

The current path is suitable for reliability testing, but it is not yet proven
to deliver 100% of the quality available from the source or the best quality
that the Core2 Bluetooth path can sustain. A premium Bluetooth speaker can
improve amplification, drivers and room response, but it cannot reconstruct
information discarded by the broadcaster codec or by a second lossy SBC encode.

The useful target is therefore not a literal lossless claim. It is: choose the
best official source, preserve its decoded PCM without clipping, underruns or
unnecessary resampling, and negotiate a stable high-quality SBC link.

## Current engine

| Stage | Current implementation | Known boundary |
|---|---|---|
| Station input | Official MP3/ICY paths for supported stations | Source bitrate and processing set the first quality ceiling |
| Decode | ESP8266Audio `libmad` MP3 decoder | Only 44.1 kHz, 16-bit-equivalent stereo output is accepted |
| Internal bus | Signed 16-bit stereo PCM, 44.1 kHz | No resampler; mismatched formats fail instead of playing at the wrong rate |
| Local output | M5Unified speaker queue | Diagnostic/fallback output, not a hi-fi reference |
| Bluetooth output | ESP32 Classic A2DP Source through ESP32-A2DP | Mandatory SBC interoperability; no aptX, LDAC or LE Audio claim |
| Recovery | 8,192 PCM frames in PSRAM plus two 4,096-frame M5 playback slots | About 186 ms of decoder reserve plus another 186 ms in the hardware queue; RF coexistence and long-run starvation still need measurement |

The recovery figures in this table are the state recorded on 2026-07-15. The
current runtime reserve, standby and Bluetooth recovery values are maintained
in [docs/104](104-cc-stabilization-closeout.en.md).

The local output never discards a partial block. It waits until a complete
4,096-frame block is available, queues at most the two slots exposed by
M5Unified and reports each post-start queue starvation as the redacted serial
counter `audio_starvation`. This directly addresses the short queue observed
during H1. The large PCM and Bluetooth rings now use explicit PSRAM allocation
so internal DRAM remains available to Wi-Fi, Bluetooth, TLS and DMA.

The ESP32-D0WDQ6-V3 is a Bluetooth 4.2 BR/EDR + BLE device. This generation
number does not itself determine sound quality. The relevant product path is
Classic A2DP and its negotiated SBC configuration. The current firmware does
not yet record the negotiated channel mode, bitpool or effective SBC bitrate,
so any statement that the link is already at its maximum would be speculation.

## Where quality is lost

1. Most radio sources are already lossy MP3 or AAC and may include aggressive
   broadcaster loudness processing.
2. The radio decodes that source to PCM.
3. A2DP Source encodes the PCM again as SBC for the speaker.

This lossy-to-lossy transcode is the main architectural quality limit. Stable
SBC at a high negotiated bitpool can still sound very good for internet radio,
but it is not bit-perfect. A top speaker mainly makes defects easier to hear.

The current volume control drives the local M5 speaker. Bluetooth loudness is
normally controlled by the speaker; the project has no mandatory AVRCP volume
dependency and does not currently apply a separate DSP gain stage to Bluetooth
PCM.

## Quality work worth doing

P1 before an audio-quality claim:

- inventory the real codec, sample rate and bitrate of every selected station;
- capture the negotiated SBC sample rate, channel mode, min/max bitpool and
  effective packet/bitrate facts without device identifiers;
- use the local `audio_starvation` counter and add equivalent rejected-frame
  and Bluetooth callback-gap counters;
- prove zero unintended resampling, channel swaps, clipping and DC offset;
- compare local decoded PCM against a host reference decoder with deterministic
  test material;
- run RF stress with Wi-Fi, active display updates and each target speaker;
- perform level-matched listening comparisons, not louder-is-better comparisons.

## Execution packages

1. **AQ0, local continuity — 0.5 day:** 60 minutes on every working station,
   active display and enhancement downloads, with `audio_starvation == 0`.
2. **AQ1, quality instrumentation — 1–2 days:** source format/bitrate,
   callback gaps, negotiated SBC channel mode and bitpool, without a speaker
   identifier.
3. **AQ2, best sources — 1–2 days:** compare official candidates and select
   the highest stable quality for every station.
4. **AQ3, two target speakers — 1–2 days:** RF stress, reconnect and a
   level-matched A/B against a phone playing the same stream.
5. **AQ4, DSP only with evidence — up to 1 day:** gain/limiter only when
   measurement confirms clipping or harmful level differences.
6. **Gate — 8 hours:** soak without audible interruptions or new underruns.

AQ0 permits a local-path stability claim. Only AQ1–AQ4 make it possible to say
honestly how much quality the source and a specific Bluetooth link deliver.

P2 improvements after measurement:

- select the highest-quality reliable official source per station;
- add a bounded PCM gain/limiter only if measurements show clipping or large
  inter-station level differences;
- tune queue depth and SBC policy only from measured underrun and negotiated
  capability evidence;
- expose an `Audio QC` diagnostics page with source format, PCM format,
  negotiated SBC facts and local counters.

aptX and LDAC are not a realistic default for this open Core2 target: they are
not part of the current ESP32-A2DP/SBC contract and bring implementation,
interoperability and licensing constraints. If quality beyond high-grade SBC is
required, a wired external I2S DAC or different radio hardware would be a
separate product lane.

## ESKA and HLS/HE-AAC

The official ESKA player currently exposes
`https://liveradio.timesa.pl/2980-1.aac/playlist.m3u8`. Its master playlist
declares about 85 kbit/s and `mp4a.40.5`, which identifies HE-AAC rather than
the MP3 path supported today.

The 2026-07-15 candidate now includes a bounded playlist parser, MPEG-TS
segment prefetch in PSRAM, ADTS demux, Helix HE-AAC/SBR and 48 -> 44.1 kHz
resampling. It builds and is wired to the ESKA slot, but remains experimental
until the device gate passes. Supporting ESKA reliably still needs:

1. bounded HLS master and media-playlist parsing;
2. relative-URL resolution, segment refresh and discontinuity handling;
3. a rolling segment/input buffer that cannot starve the audio queue;
4. an HE-AAC decoder spike proving SBR support, RAM, CPU and license fit;
5. the same built-in-speaker and A2DP/SBC output path;
6. reconnect, playlist rollover and 60-minute endurance evidence.

A one-station engineering spike is about one focused day. A hardware-tested,
recovery-safe implementation for ESKA and the other ZPR HLS stations is more
realistically four to seven working days. The decoder is the critical unknown:
the checked-in ESP8266Audio dependency now builds its Helix AAC path, while
real-time HE-AAC/SBR capability still has to be proven on the Core2.

## Acceptance gate

No `maximum quality` claim is allowed until two named Bluetooth speakers pass:

- 60 minutes without audible gaps or PCM/SBC underrun;
- Wi-Fi reconnect and stream reconnect without a permanent quality downgrade;
- recorded negotiated SBC facts;
- level-matched A/B against the same station played by a reference phone;
- 8-hour soak for the release candidate.

## Primary references

- [Espressif ESP32 datasheet](https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf)
- [ESP-IDF Classic Bluetooth A2DP API](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/bluetooth/esp_a2dp.html)
- [M5Stack Core2 documentation](https://docs.m5stack.com/en/core/core2)
- [Official Radio ESKA player](https://player.eska.pl/?stream_uid=radio_eska)
- [Bluetooth A2DP specification overview](https://www.bluetooth.com/specifications/specs/advanced-audio-distribution-profile-1-4/)
