# 39 — Technical prior-art deep dive: Core2 internet radio → A2DP Source

**Research date:** 2026-07-13
**Scope:** M5Stack Core2, live internet radio over Wi-Fi, decoded PCM routed to
the built-in speaker or an external Bluetooth Classic A2DP speaker.
**Method:** current upstream source, official documentation and GitHub release
metadata. No repository was cloned, no dependency was installed and no firmware
was built or flashed.

## Executive verdict

We are **not reinventing the media transport**, but there is no upstream project
that can be adopted as the complete product.

The strongest direct proof is Espressif's
[`pipeline_bt_source`](https://github.com/espressif/esp-adf/tree/release/v2.x/examples/player/pipeline_bt_source):
one classic ESP32 fetches MP3 over Wi-Fi, decodes it and sends PCM to a Bluetooth
speaker as an A2DP **Source**. Core2 uses the compatible classic
ESP32-D0WDQ6-V3 and has 8 MB PSRAM, a 320×240 display and an I2S speaker
([official Core2 specification](https://docs.m5stack.com/en/core/core2)).

The recommended architecture is therefore:

1. **Reuse M5Unified** for Core2 hardware and local speaker output.
2. **Reuse an existing A2DP Source implementation**, never write a Bluetooth
   stack: first qualify ESP-ADF; retain ESP32-A2DP as the lighter alternative.
3. **Reuse existing HTTP/HLS/MP3/AAC components**, subject to hardware and
   dependency/license gates.
4. **Own only the product layer:** station resolver, supervisor, bounded
   recovery, persistence, single-active-sink `OutputRouter`, UI and local QC.

The most important correction to simplistic reuse plans is that M5Unified's
Bluetooth example is a **Sink**, not a Source. Likewise, projects marketed as a
"Bluetooth radio" often receive music from a phone rather than send radio to a
speaker.

## Hardware facts that make reuse possible

- [Core2](https://docs.m5stack.com/en/core/core2) contains the original dual-core
  ESP32-D0WDQ6-V3 at up to 240 MHz, 520 KB SRAM, 16 MB flash and 8 MB PSRAM.
- It has an NS4168 I2S amplifier and built-in speaker on BCLK GPIO12, LRCK GPIO0,
  DATA GPIO2, with speaker enable controlled by AXP192.
- The original ESP32 supports Bluetooth Classic. Espressif documents A2DP
  **Source and Sink** roles and SBC as the mandatory codec
  ([profiles](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/classic-bt/profiles-protocols.html)).
- Wi-Fi and Bluetooth share the RF resource through time division. Espressif
  supports coexistence but requires the software coexistence option and real
  workload testing
  ([RF coexistence](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-guides/coexist.html)).

SBC being mandatory gives broad interoperability, but it does **not** justify a
promise that literally every present and future speaker will pair. Pairing,
legacy PIN/SSP behavior, reconnect policy, AVRCP quirks and vendor sleep behavior
must be qualified against a device matrix.

## Candidate comparison

| Candidate | Exact role and formats | Core2 / local speaker | Current upstream snapshot | Verdict |
|---|---|---|---|---|
| [ESP-ADF `pipeline_bt_source`](https://github.com/espressif/esp-adf/tree/release/v2.x/examples/player/pipeline_bt_source) | HTTP(S) MP3 → decode → PCM → A2DP **Source** | Same SoC; board port and local sink still required | `v2.8` published 2026-03-17; `release/v2.x` active 2026-07-03 | **P0 golden reference and first spike** |
| [M5Unified WebRadio](https://github.com/m5stack/M5Unified/blob/master/examples/Advanced/WebRadio_with_ESP8266Audio/WebRadio_with_ESP8266Audio.ino) | ICY/MP3 → Core2 speaker | Direct Core2 support and ready local output adapter | `0.2.18` published 2026-07-09 | **P0 HAL and local fallback** |
| [M5Unified Bluetooth example](https://github.com/m5stack/M5Unified/blob/master/examples/Advanced/Bluetooth_with_ESP32A2DP/Bluetooth_with_ESP32A2DP.ino) | Phone → A2DP **Sink** → Core2 speaker | Direct Core2 support | Same M5Unified release | **Not our BT direction**; useful only for M5 speaker buffering patterns |
| [ESP32-A2DP](https://github.com/pschatzmann/ESP32-A2DP) | PCM 44.1 kHz, stereo, 16-bit → SBC → A2DP **Source** | Compatible original ESP32; no decoder or Core2 sink | `v1.8.11` published 2026-05-30; active 2026-06-29 | **P0 lightweight alternative** |
| [Arduino Audio Tools](https://github.com/pschatzmann/arduino-audio-tools) | URL/ICY/HLS, MP3/AAC/MPEG-TS decode glue, queues, resampling, A2DP TX/RX | Core2 needs M5 output adapter | `v1.2.5` published 2026-06-23; active 2026-07-13 | **P1 rapid composition candidate** |
| [Amellinium Core2 WebRadio](https://github.com/Amellinium/M5Stack-Core2-WebRadio) | ICY/MP3 → built-in Core2 speaker; no BT, AAC or HLS | Exact device, legacy `M5Core2` | `v0.3.3` published 2025-11-02 | **Reference only; do not fork** |
| [Squeezelite-ESP32](https://github.com/sle118/squeezelite-esp32) | LMS/SlimProto → decode/resample → A2DP **Source** or I2S | Original ESP32, not Core2-specific | tree active 2026-07-11; latest published image 2025-12-26 | **Reference for proven BT buffering/state machine** |
| [ESPuino](https://github.com/biologist79/ESPuino) | SD/local PCM → A2DP **Source**; web streams exist only outside BT mode | Not Core2-specific; local speaker supported on its boards | `v2.8` published 2026-07-10; active 2026-07-13 | **Excellent PCM bridge reference, negative proof for memory policy** |
| [ESP32-audioI2S](https://github.com/schreibfaul1/ESP32-audioI2S) | HTTP/ICY MP3/AAC/AAC+ → I2S; no integrated A2DP output | Core2-compatible SoC/PSRAM, but I2S-centric | `3.4.7` published 2026-07-08; active 2026-07-13 | **Decoder reference/alternative, not product architecture** |
| [AtlasCube](https://github.com/marcinozog/AtlasCube) | HTTP/HLS MP3/AAC → local DAC; service-oriented recovery | ESP32-S3 custom board, therefore no Classic A2DP on-chip | `v0.43.0` published 2026-07-12 | **Current HLS/recovery reference only** |

Dates above describe repository/release activity, not proof that every exact
example was modified on that date. Versions must be pinned again immediately
before a hardware build.

## 1. ESP-ADF: closest complete transport

### Exact files and APIs to reuse

The old but still present HTTP proof is:

- [`examples/player/pipeline_bt_source/main/play_bt_source_example.c`](https://github.com/espressif/esp-adf/blob/release/v2.x/examples/player/pipeline_bt_source/main/play_bt_source_example.c)
- `http_stream_init(&http_cfg)` creates the network reader.
- `mp3_decoder_init(&mp3_cfg)` creates the decoder.
- `bluetooth_service_create_stream()` creates the Bluetooth writer.
- `audio_pipeline_register()` plus `audio_pipeline_link()` connect
  `http → mp3 → bt`.
- `audio_element_set_uri()` supplies the HTTP(S) MP3 URL.

The newer direct A2DP element is demonstrated separately in:

- [`examples/player/pipeline_a2dp_source_stream/main/play_bt_source_example.c`](https://github.com/espressif/esp-adf/blob/release/v2.x/examples/player/pipeline_a2dp_source_stream/main/play_bt_source_example.c)
- `a2dp_stream_init(&a2dp_config)` creates the writer without the broader
  Bluetooth service wrapper.
- the example registers A2DP callbacks and uses `esp_a2d_source_connect()`.

For production architecture, qualify the original HTTP example first, then
prefer the direct `a2dp_stream_init()` path if it remains supported by the pinned
ADF version. Do not retain a service wrapper solely because an older demo used
it.

### HLS and AAC path

ESP-ADF's [`http_stream_cfg_t`](https://github.com/espressif/esp-adf/blob/release/v2.x/components/audio_stream/include/http_stream.h)
contains `enable_playlist_parser`, `auto_connect_next_track` and event hooks.
The component tree includes the HLS playlist parser. The official
[`aac_decoder_cfg_t`](https://docs.espressif.com/projects/esp-adf/en/latest/api-reference/codecs/aac_decoder.html)
exposes `plus_enable` for HE-AAC v1/v2.

This makes `HLS/TS/AAC → PCM → A2DP` plausible from supported components, but
there is no single official Core2 example proving that entire chain under our
Wi-Fi+BT load. It remains a hardware spike, not an accepted capability claim.

### Core2 and fallback gap

The example is board-oriented toward Espressif audio boards. Core2 still needs:

- board initialization and power control through M5Unified or a small BSP;
- an output adapter for its NS4168 speaker;
- a `single-active-sink` router so PCM is sent to either A2DP or local I2S;
- a deliberate I2S ownership boundary so ADF and M5Unified do not both control
  the peripheral at the same time.

### Do not copy

- example Wi-Fi provisioning, hard-coded media URL and demo event loop;
- assumptions about LyraT buttons, codec chip or I2S pins;
- unbounded reconnect behavior;
- the full ADF feature surface when only HTTP, two decoders and one output are
  required;
- binary codec components into a public release before SBOM/license review.

## 2. M5Unified: Core2 HAL and local speaker, not outgoing BT

### Exact reusable local output

The official
[`WebRadio_with_ESP8266Audio.ino`](https://github.com/m5stack/M5Unified/blob/master/examples/Advanced/WebRadio_with_ESP8266Audio/WebRadio_with_ESP8266Audio.ino)
contains a purpose-built `AudioOutputM5Speaker`:

- derives from ESP8266Audio's `AudioOutput`;
- converts decoder samples into a triple buffer;
- calls `M5.Speaker.playRaw()`;
- uses `AudioFileSourceICYStream`, `AudioFileSourceBuffer` and
  `AudioGeneratorMP3`;
- initializes hardware through `M5.begin()`, `M5.Speaker.config()` and
  `M5.Speaker.begin()`.

This is the clearest local fallback reference. Reuse the adapter idea and M5
HAL, not the whole demo application.

### Bluetooth example is the opposite direction

[`Bluetooth_with_ESP32A2DP.ino`](https://github.com/m5stack/M5Unified/blob/master/examples/Advanced/Bluetooth_with_ESP32A2DP/Bluetooth_with_ESP32A2DP.ino)
includes `BluetoothA2DPSink.h`, subclasses `BluetoothA2DPSink` and ends in
`M5.Speaker.playRaw()`. It turns Core2 into a Bluetooth speaker. It cannot send
internet radio to an external speaker.

### Do not copy

- station list, UI loop or blocking connection logic from examples;
- ESP8266Audio AAC code without a separate provenance/license decision;
- both M5 speaker and ADF I2S writers active simultaneously.

## 3. ESP32-A2DP: smallest outgoing Bluetooth layer

### Exact Source APIs

[`BluetoothA2DPSource.h`](https://github.com/pschatzmann/ESP32-A2DP/blob/main/src/BluetoothA2DPSource.h)
provides the exact primitives needed by our `OutputRouter`:

- `set_data_callback()` or `set_data_callback_in_frames()` to pull PCM;
- `start(name)` / `start(vector_of_names)` for discovery by sink name;
- `set_ssid_callback()` to select a discovered speaker;
- `set_auto_reconnect()` with a bounded retry count;
- connection, audio-state and AVRCP callbacks;
- SSP and legacy PIN configuration;
- `connect_to(address)` in the current library for explicit device selection.

The source consumes 44.1 kHz, 16-bit, two-channel PCM and encodes it to SBC.
It performs no HTTP fetching and no MP3/AAC decoding.

### Minimal integration pattern

`decoder PCM producer → bounded PCM ringbuffer → BluetoothA2DPSource callback`.
The callback must never wait on the network or decoder. Underrun should emit
bounded silence and telemetry; overflow needs an explicit drop/restart policy.

### Do not copy

- name-only matching as the sole durable identity;
- library auto-reconnect without the project supervisor's retry budget;
- assumptions that SBC interoperability means universal pairing;
- debug logging of speaker MAC addresses in public QC traces.

## 4. Arduino Audio Tools: fastest compositional experiment

The library already exposes the elements required to assemble a host-readable
pipeline:

- [`HLSStream`](https://github.com/pschatzmann/arduino-audio-tools/blob/main/src/AudioTools/Communication/HLSStream.h)
  parses playlists and continuously loads segments;
- [`A2DPStream`](https://github.com/pschatzmann/arduino-audio-tools/blob/main/src/AudioTools/Communication/A2DPStream.h)
  uses `begin(TX_MODE)` for an A2DP Source and `begin(RX_MODE)` for a Sink;
- `A2DPStream` expects 44.1 kHz, stereo, 16-bit PCM and exposes a bounded write
  buffer plus connection state;
- [`hls-buffer-i2s`](https://github.com/pschatzmann/arduino-audio-tools/blob/main/examples/examples-communication/hls/hls-buffer-i2s/hls-buffer-i2s.ino)
  composes `HLSStream`, `QueueStream`, `MP3DecoderHelix`, `AACDecoderHelix`,
  `MTSDecoder`, `MultiDecoder` and `EncodedAudioOutput`;
- the HLS implementation explicitly recommends buffering segment loading in a
  separate task.

The technically plausible experiment is:

`HLSStream → QueueStream → MultiDecoder(MP3/AAC/MTS) → A2DPStream(TX_MODE)`.

No upstream example found in this review qualifies that exact live HLS→A2DP
chain on one original ESP32 while Wi-Fi is active. Audio Tools is therefore an
excellent spike stack, not yet the reliability winner.

Do not use `MultiOutput` to feed local I2S and A2DP simultaneously. The product
needs one selected sink, not duplicated playback competing for CPU, RAM and RF.

## 5. Amellinium Core2 WebRadio: exact enclosure reference, wrong core

The monolithic
[`M5Stack-Core2-WebRadio-v0.3.3.ino`](https://github.com/Amellinium/M5Stack-Core2-WebRadio/blob/main/M5Stack-Core2-WebRadio-v0.3.3.ino)
proves several useful device-level facts:

- `M5Core2`, Core2 touch and built-in speaker work as an internet radio;
- `AudioFileSourceICYStream + AudioGeneratorMP3` are buffered with 256 KB;
- a touch keyboard can provision Wi-Fi entirely on-device;
- station names and URLs can be loaded from SD.

It has no A2DP Source, AAC or HLS. It saves Wi-Fi data through `Preferences`,
uses a mutable SD station list and contains blocking loops and placeholder
functions. Its legacy `M5Core2` dependency is inferior to M5Unified for our new
codebase.

Reuse only measurements and interaction lessons: Core2 screen geometry, touch
keyboard ergonomics, buffer starting point and local-speaker proof. Do not fork
the `.ino` or import its persistence/catalog model.

## 6. Squeezelite-ESP32: mature A2DP Source proof, wrong network protocol

Squeezelite is a valuable proof that an original ESP32 can decode network audio,
resample and transmit to a Bluetooth speaker:

- [`components/squeezelite/output_bt.c`](https://github.com/sle118/squeezelite-esp32/blob/master-v4.3/components/squeezelite/output_bt.c)
  implements `output_init_bt()`, `output_bt_data()`, start/stop/tick handling,
  output buffering and underflow statistics;
- [`components/driver_bt/bt_app_source.c`](https://github.com/sle118/squeezelite-esp32/blob/master-v4.3/components/driver_bt/bt_app_source.c)
  registers `esp_a2d_source_register_data_callback(&output_bt_data)`, scans for
  the configured sink, connects by address and implements explicit connection
  and media state machines;
- its documentation requires 44.1 kHz for Bluetooth output and points to
  internal resampling when the source rate differs.

What it does **not** solve is an autonomous HTTP radio. Its network source is a
Lyrion/Logitech Media Server, and its large feature surface includes protocols,
web configuration and update assumptions we do not want. The repository also
contains mixed-license components.

Reuse state-machine and buffer telemetry ideas. Do not fork the firmware or add
an LMS dependency.

## 7. ESPuino: the most concrete PCM interception pattern

Current ESPuino source contains a highly relevant bridge built around
ESP32-A2DP:

- [`AudioPlayer.cpp`](https://github.com/biologist79/ESPuino/blob/master/src/AudioPlayer.cpp)
  forces 44.1 kHz in A2DP Source mode and intercepts decoded PCM through
  `audio_process_i2s()`;
- that hook calls `Bluetooth_Source_SendAudioData()` and disables the normal I2S
  write for the frame;
- [`Bluetooth.cpp`](https://github.com/biologist79/ESPuino/blob/master/src/Bluetooth.cpp)
  feeds a 16 KB FreeRTOS ringbuffer, prefills multiple frames, emits silence on
  underrun, scans, connects by address and applies bounded manual retries;
- the A2DP callback converts the buffered stereo sample layout into
  `Frame.channel1/channel2`.

This is an excellent reference for our `single-active-sink` and bounded PCM
queue. Because ESPuino is GPL-3.0, direct code reuse must preserve notices and
be isolated enough to audit.

However, ESPuino explicitly states that Bluetooth cannot run in parallel with
Wi-Fi in its configuration due to memory restrictions; web radio is unavailable
in Bluetooth Source mode. It therefore proves the local-file→A2DP bridge, not
our required Wi-Fi-radio→A2DP product. Do not import its mutually exclusive
operation-mode policy.

## 8. Other useful but non-winning references

### ESP32-audioI2S

[`ESP32-audioI2S`](https://github.com/schreibfaul1/ESP32-audioI2S) is an active,
PSRAM-requiring decoder and ICY client. On original ESP32 it documents MP3/AAC
support, but AAC+ is limited to mono; SBR and Parametric Stereo are available on
S3/P4, which cannot provide the required on-chip Classic A2DP Source. Its main
output contract is I2S, not a bounded PCM sink abstraction.

Use it only if a small spike proves its PCM interception hook and codec behavior
superior to ADF. Do not assume that S3 AAC+ results transfer to Core2.

### AtlasCube

[`AtlasCube`](https://github.com/marcinozog/AtlasCube) is a fresh ESP-IDF/ADF
radio with service separation and HLS code under `components/icy_http_stream/hls`
and `components/services/radio_service.c`. Its ESP32-S3 and external Bluetooth
hardware make it unsuitable as our A2DP implementation. Use it only to compare
HLS retry, metadata and service boundaries.

### Projects describing a “Bluetooth speaker”

[`paulgreg/esp32-audio-station`](https://github.com/paulgreg/esp32-audio-station)
switches between web radio and A2DP **Sink**, uses an external VS1053 and reports
insufficient RAM to switch Wi-Fi/BT without reboot. It is evidence for careful
role checking and memory qualification, not a reusable Core2 core.

## Build vs reuse matrix

| Layer | Decision | Candidate | Acceptance evidence |
|---|---|---|---|
| Core2 display/touch/power/speaker HAL | **REUSE** | M5Unified | Core2 boot, touch, backlight, battery and local tone |
| HTTP/ICY input | **REUSE** | ESP-ADF `http_stream` or Audio Tools URL/ICY | one Polish MP3 stream, redirect/timeout/reconnect cases |
| HLS playlist/segments | **REUSE CONDITIONALLY** | ESP-ADF HLS first; Audio Tools alternative | one ZPR HLS stream for 60 min without segment leak |
| MP3 decoder | **REUSE** | ESP-ADF or selected open decoder | PCM format and heap/CPU budget |
| AAC/HE-AAC decoder | **REUSE CONDITIONALLY** | ESP-ADF `aac_decoder` | exact station codecs, stereo result, dependency/license gate |
| Bluetooth Source | **REUSE** | ESP-ADF direct A2DP or ESP32-A2DP | discovery, pairing, reconnect and SBC playback across device matrix |
| PCM queue/resampling | **REUSE OR ADAPT** | ADF ringbuffers, Audio Tools or ESPuino pattern | no callback blocking; bounded overflow/underrun behavior |
| Local speaker adapter | **REUSE/ADAPT** | M5Unified `AudioOutputM5Speaker` pattern | clean fallback without reboot |
| Output selection and supervisor | **BUILD** | project-owned | one active sink, bounded recovery, no split-brain output |
| Catalog/resolver/persistence/UI/QC | **BUILD** | existing project contracts | deterministic software tests plus later hardware evidence |

## Minimal hardware spikes

### Spike H1 — prove the exact mandatory path

**Goal:** `HTTP MP3 → PCM → A2DP Source` on Core2, without GUI.

1. Pin ESP-IDF/ADF versions and build the official `pipeline_bt_source` topology.
2. Replace only board initialization, credentials and test URL.
3. Pair with three devices: modern speaker, headphones and older/legacy-PIN
   speaker if available.
4. Record internal SRAM/PSRAM minima, CPU per core, Wi-Fi RSSI, reconnect time,
   PCM underruns and A2DP state transitions.
5. Run 60 minutes plus forced Wi-Fi and speaker disconnects.

**Pass:** continuous audio, bounded reconnect, no reset, no monotonic heap loss.

### Spike H2 — prove one-owner local fallback

**Goal:** route the same decoded PCM to either A2DP or Core2 NS4168.

1. Adapt M5Unified's `AudioOutputM5Speaker` or use a minimal Core2 I2S writer.
2. Implement a temporary two-state router, never two simultaneous outputs.
3. Disconnect BT during playback and switch to local output after a fixed
   deadline; reconnect and switch back only at a safe PCM boundary.
4. Measure clicks, stale buffer playback and recovery latency.

**Pass:** deterministic sink ownership, no duplicate audio and no reboot.

### Spike H3 — close the codec risk

**Goal:** `HLS/HE-AAC → PCM → A2DP` for one of the three pending Polish stations.

1. Use the same radio/BT core proven in H1.
2. Enable HLS and `aac_decoder_cfg_t.plus_enable` only for this build.
3. Log playlist refreshes, segment gaps, decoder sample-rate changes, resampler
   load, heap minima and A2DP underruns.
4. Compare ADF against Audio Tools only if ADF fails the bounded test.

**Pass:** stereo audio where the source is stereo, 60-minute run, bounded memory
and recovery after a forced segment failure.

## Stack decision after spikes

### A) ESP-IDF + ESP-ADF

- **Use when:** H1–H3 pass and dependency/license review permits public binaries.
- **Unlocks:** official HTTP/HLS/codec/A2DP task model and strongest integrated
  evidence.
- **Cost:** larger framework, Core2 BSP work, binary codec/license scrutiny.
- **Does not solve:** our UI, resolver, persistence, output policy or reliability
  supervisor.

### B) M5Unified + ESP32-A2DP + Arduino Audio Tools

- **Use when:** ADF integration is too heavy or fails Core2 speaker ownership,
  while the compositional spike passes the same metrics.
- **Unlocks:** smaller and more transparent C++ stream graph, direct M5 HAL.
- **Cost:** more glue owned by us; HLS/AAC and queue behavior require stronger
  qualification.
- **Does not solve:** product recovery or universal speaker compatibility.

### C) Fork a complete existing radio

- **Use when:** not recommended under current requirements.
- **Unlocks:** a fast visual demo only.
- **Cost:** imports mutable catalogs, cloud/web/OTA assumptions, wrong BT roles,
  unrelated UI and larger maintenance/licensing surface.
- **Does not solve:** the immutable autonomous Core2 product.

**Recommendation:** run **A first**, retain **B as a measured fallback**, reject
**C**. The stack decision must be based on the same H1–H3 evidence rather than
developer preference.

## What must remain project-owned

Even after maximum reuse, no candidate supplies all of these contracts:

- exact nine-station embedded catalog and resolver with LKG;
- bounded Wi-Fi, stream, decoder and BT recovery under one supervisor;
- automatic A2DP-to-local fallback with one active PCM consumer;
- dual-slot persistence and safe mode;
- PL/EN 320×240 station UI and original visual assets;
- immutable/no-cloud/no-OTA lifecycle;
- sanitized QC traces without credentials, endpoint tokens or speaker MACs.

That is the legitimate original engineering surface. Decoders, Bluetooth stack,
Core2 drivers and generic stream parsers are not.

## Final answer: are we rebuilding the wheel?

**No for the audio engine; partially yes by necessity for the appliance.**

The ecosystem already provides all low-level wheels and even a direct official
HTTP-MP3-to-A2DP proof. It does not provide the complete Core2 appliance that
combines Polish station provenance, HLS risk handling, automatic local speaker
fallback, immutable configuration and a tested `always return to PLAYING`
policy. Our efficient path is to integrate and qualify existing components, then
keep the custom code thin and concentrated in the supervisor and product
contracts.
