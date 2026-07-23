# 48 — Core2 hardware-arrival validation matrix

## Entry conditions

- Owner confirms the exact board and USB cable.
- Xiaomi Sound Pocket `MDZ-37-DB` and MOZOS Outdoor-Xtreme are available for
  qualification; their Bluetooth Classic A2DP/SBC result is not assumed.
- `hardware/speaker-qualification-matrix.json` still reports both candidates as
  `NOT_MEASURED`, and the exact MOZOS revision is copied from its label.
- First flash/backup proposal in `docs/49-first-build-flash-rollback-proposal.md`
  receives a separate T3 confirmation.
- No production network credentials are committed or copied into logs.

## Stage H0 — identity and recovery

| Test | Evidence | Pass |
|---|---|---|
| USB device and chip identity | sanitized `pio device list` and `esptool chip_id` | ESP32 Core2 identified |
| Flash size | `flash_id` evidence | 16 MiB detected |
| Factory backup | SHA-256 and byte size | complete 16 MiB readback |
| Rollback dry review | commands and file hash | no command ambiguity |

## Stage H1 — board smoke

| Area | Test | Pass |
|---|---|---|
| Display | color bars, text, 320×240 orientation | no corruption or clipping |
| Touch | corners, center, long press | mapped within agreed tolerance |
| Speaker | 44.1 kHz stereo test block | audible, no reset |
| Power | USB-C, battery bridge, reconnect | no reboot during short handover |
| Storage | A/B config write and corrupt-newest fallback | older known-good loads |

## Stage H2 — radio path

| Test | Pass |
|---|---|
| One official MP3 stream → local speaker | 15 minutes, no watchdog reset |
| Stream interruption | bounded retry then `PLAYING` |
| Wi-Fi loss and return | reconnect without reboot or unknown autojoin |
| Unsupported HLS station | explicit unsupported UI, no crash loop |
| Endpoint quarantine | alternate or scheduled retry is visible |

## Stage H3 — Bluetooth and coexistence

Test at least: mains speaker, battery speaker, headphones, an older SBC-only
device and one modern multiprofile speaker. Record model, firmware, A2DP result,
reconnect time and fallback result without publishing private device addresses.

The first two required records are the owner-provided Xiaomi Sound Pocket
`MDZ-37-DB` and MOZOS Outdoor-Xtreme. Capture the exact MOZOS label revision
before pairing because published retailer specifications differ between the
original and V2 listings.

Required passes:

- remembered speaker reconnects after power cycle,
- BT loss moves audio to local speaker,
- BT recovery does not produce dual output,
- active Wi-Fi download does not starve A2DP beyond the underrun budget,
- AVRCP absence does not block playback,
- LE Audio-only devices are reported outside scope.

## Stage H4 — resource and power endurance

Capture free internal heap, largest free block, PSRAM, relevant task stack high
water marks, queue overrun/underrun counters, reconnect counts and reset reason.

Soak ladder:

1. 60 minutes: local speaker and one forced stream recovery.
2. 2 hours: Bluetooth plus one Wi-Fi recovery.
3. 8 hours: normal powerbank operation and speaker power cycle.
4. 24 hours: release-candidate endurance only after the earlier stages pass.

Any watchdog reset, memory trend, credential leak, unbounded reconnect loop or
failure to preserve local fallback stops the ladder.
