# 35 — Atomic persistence contract

## Purpose

The device must survive a reset or power loss at every write phase without
destroying its last bootable configuration. This host model defines the exact
selection and migration rules before they are mapped to ESP32 NVS or raw flash.

## Stored configuration

Version 2 stores only product choices and opaque local references:

- UI locale and preferred station ID,
- volume,
- one to eight `wifi:<opaque-id>` references,
- optional `bt:<opaque-id>` reference,
- city mode and optional display label,
- onboarding completion.

The public contract never stores an SSID, Wi-Fi password, Bluetooth address,
access token, resolved stream URL or precise location. A future firmware adapter
must resolve opaque references inside a private credential store.

## Slot envelope

```text
slot A or B
  generation
  canonical JSON payload
  CRC32 corruption check
  commit marker written last
  local monotonic timestamp
```

CRC32 detects accidental corruption; it is not authentication or encryption.
The commit marker is the only promotion boundary. A slot without the final
marker is never bootable even when its payload and checksum are complete.

## Atomic write sequence

1. Validate the complete version-2 draft without mutating storage.
2. Select the slot opposite the newest valid committed generation.
3. Serialize the config with stable key ordering.
4. Write payload and checksum to the inactive slot.
5. Verify the draft can be parsed and validated.
6. Write `COMMITTED` last.
7. On the next boot, select the highest valid generation.

Host fault injection observes four boundaries: `BEFORE_WRITE`,
`DURING_PAYLOAD`, `BEFORE_COMMIT_MARKER` and `AFTER_COMMIT`.

## Boot selection

Each slot is inspected independently:

1. envelope shape,
2. commit marker,
3. CRC32,
4. JSON parse,
5. supported schema version,
6. migration and current-config validation.

Valid slots are sorted by generation descending and then slot `A` before `B`
for a deterministic tie. If neither slot is valid, boot returns `SAFE_MODE`.
Public traces expose only slot ID, generation and rejection class.

## Migration

Version 1 is read-only input. It migrates in memory to version 2 and leaves the
original slot untouched. The next successful settings write can persist version
2 through the normal inactive-slot transaction. Versions newer than 2 return
`FUTURE_SCHEMA_UNSUPPORTED`; the device never guesses their meaning.

## Safe mode

Safe mode is local and bounded. It is entered when no slot is bootable or after
three consecutive boot failures. It may offer diagnostics and a manual local
reset, but it cannot download firmware, contact a project cloud or erase both
slots automatically.

## Hardware boundary

The host model proves ordering and recovery semantics only. ESP32 NVS atomicity,
flash erase granularity, wear, brownout behavior and physical power-cut recovery
remain unmeasured until Core2 hardware tests.
