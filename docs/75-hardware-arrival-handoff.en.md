# 75 — Hardware-arrival handoff

[Polska wersja](75-hardware-arrival-handoff.pl.md)

**Status:** historical pre-arrival handoff; hardware has since arrived. Current
truth is maintained in `STATUS.md` and `CURRENT-MISSION.md`.

**Original physical resume condition:** Tomasz has the M5Stack Core2 in hand

**Hard boundary:** no serial access, factory readback or flash without the
separate owner confirmation described in
`docs/49-first-build-flash-rollback-proposal.md`

## Bring to the session

- M5Stack Core2, a known-good data-capable USB-C cable and the intended power
  bank.
- Xiaomi Sound Pocket `MDZ-37-DB` and MOZOS Outdoor-Xtreme; copy the exact MOZOS
  model/revision from its label before testing.
- A Mac with this private repository and enough private disk space for a 16 MiB
  factory image plus evidence.
- One approved 2.4 GHz Wi-Fi profile. Never commit credentials, MAC addresses,
  BSSIDs, private endpoints or the factory image.

## Start safely

```bash
# Run from the repository root.
git pull --ff-only
npm run check
git status --short
```

Stop if the host gate is not green or the working tree is not clean. Read
`docs/48-hardware-arrival-validation-matrix.md` and
`docs/49-first-build-flash-rollback-proposal.md` before connecting the device.
All serial and flash actions use `scripts/core2-device-action.sh`; do not replace
the guard with ad-hoc upload commands.

## H0 — identify and preserve

After the separate T3 owner confirmation:

```bash
export PORT=/dev/cu.usbserial-REPLACE_ME
export ESP32_ALLOW_DEVICE_ACTION=1
scripts/core2-device-action.sh preflight
scripts/core2-device-action.sh backup
```

1. Inspect the enclosure, board label, USB cable and serial port.
2. Run `pio device list`, `esptool chip_id` and `esptool flash_id` using the
   prepared commands; stop on any port, chip or 16 MiB flash ambiguity.
3. Read the complete `0x1000000` factory image before any write.
4. Verify exactly `16777216` bytes and record its SHA-256 privately.
5. Review the rollback command against the same port and backup hash.

Do not erase the device. Do not flash until H0 evidence and rollback are
unambiguous and Tomasz confirms the proposed write.

## H1 — board smoke

Build only the selected public-candidate lane, then record and review its exact
manifest before flashing through the registered `flash-image` path. Validate display
orientation and clipping, touch corners/center/44 px targets, RGB565 colors,
light/dark themes, brightness steps, the deterministic Inter 600 atlas, built-in
speaker output, battery bridge and A/B config recovery. Confirm that language,
volume, brightness, theme and preferred station survive a restart.

After H0 passes and Tomasz confirms the write:

```bash
export CONFIRM_FLASH=YES
export IMAGE_PATH=/absolute/path/to/output/flashed/REVIEWED_SHA256.bin
export EXPECTED_SHA256=64-lowercase-reviewed-hex-characters
export IMAGE_PURPOSE=CURRENT_CANDIDATE
scripts/core2-device-action.sh flash-image
```

The direct `flash` and `flash-lab` shortcuts are disabled. The reviewed image
must already be present in `hardware/approved-app-images.json` with the current
product surface and purpose.

Any repeated reset, unreadable screen, broken touch transform, silent fallback
speaker or failed known-good config recovery stops the session and triggers
rollback review.

## H2 — local radio and recovery

Join the temporary `OpenRadio-Setup` network with the random WPA2 code shown on
the device, open the local captive portal and add one approved secured 2.4 GHz
profile. Play RMF FM through the built-in
speaker, verify reboot persistence and confirm that TOK FM plus the three HLS
stations remain explicit unsupported states. First prove a
15-minute smoke, then the required 60-minute gate with one forced stream loss
and one forced Wi-Fi loss. The device must recover without rebooting, never join
an unknown/open network and keep unsupported HLS stations explicit instead of
claiming playback.

## H3 — Bluetooth speakers

Open the local Bluetooth screen and start the explicit scan. Test Xiaomi first,
then MOZOS as Bluetooth Classic A2DP Sink/SBC devices. Record
pairing result, remembered reconnect, reconnect time, forced disconnect,
built-in-speaker fallback, return to Bluetooth and Wi-Fi/A2DP coexistence. AVRCP
must not be required and dual output must never occur. Keep the public claim at
“standards-based A2DP compatibility”; never claim universal speaker support.

## H4 — endurance and exit

Run the soak ladder only after the preceding stage passes: 60 minutes local,
2 hours Bluetooth with Wi-Fi recovery, 8 hours on the power bank with a speaker
power cycle, then 24 hours only for release-candidate qualification. Capture
heap, largest block, PSRAM, stack high-water marks, underruns, queue overruns,
reconnect counts and reset reason.

At session close, update `hardware/speaker-qualification-matrix.json`, the
hardware evidence packet, `STATUS.md`, `CURRENT-MISSION.md` and the portfolio
registry. A public release remains a separate gate even when H0–H4 pass.

## First-session success

The first physical session is successful when H0 backup/rollback evidence and
H1 board smoke pass, or when a precise bounded blocker is captured without
losing the factory image. H2–H4 may continue in later sessions; never compress
the soak ladder to manufacture a same-day release result.
