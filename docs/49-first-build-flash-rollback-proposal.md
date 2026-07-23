# 49 — First build, backup, flash and rollback proposal

**Status:** guarded commands prepared and host-checked; every execution remains owner-gated
**Boundary:** every serial read/write and flash action is T3-high in this project

## Preflight after owner confirmation

```bash
cd the repository root
export PORT=/dev/cu.usbserial-REPLACE_ME
export ESP32_ALLOW_DEVICE_ACTION=1
scripts/core2-device-action.sh preflight
```

Stop if the device, port, 16 MiB flash identity, partition geometry or active
OTA slot is ambiguous. The guarded preflight requires the exact 6.4 MiB
`app0`/`app1` layout and confirms that `app0` is active before any app-only
write can be authorized.

## Factory backup before any write

```bash
scripts/core2-device-action.sh backup
```

The backup directory remains private and ignored. Verify exact byte count
`16777216` and store the hash in the owner evidence log, not in public Git.

## Candidate build, review and registration

```bash
npm run check
.tools/venv/bin/pio run -d firmware/public-candidate -e core2-public-candidate
shasum -a 256 firmware/public-candidate/.pio/build/core2-public-candidate/firmware.bin
```

The build step never writes to the device. Copy the reviewed artifact to
`output/flashed/<sha256>.bin`, add the exact SHA-256, size, source commit,
product surface and bounded purpose to `hardware/approved-app-images.json`, and
commit that reviewed manifest. Only then use `flash-image` below after a new
owner confirmation for that exact SHA. Direct `flash` and `flash-lab` shortcuts
are disabled so a build cannot silently become a device write.

## Exact archived application-image comparison

An application write may use only an immutable image already archived under
`output/flashed/` and approved by the closed registry:

```bash
export CONFIRM_FLASH=YES
export IMAGE_PATH=/absolute/path/to/the/archived/firmware.bin
export EXPECTED_SHA256=64-lowercase-hex-characters
export IMAGE_PURPOSE=CURRENT_CANDIDATE
scripts/core2-device-action.sh flash-image
```

`flash-image` verifies the full-device rollback backup, exact caller-provided
SHA-256, the live OTA layout and active `app0`, the 6.4 MiB `app0` size
boundary and the closed registry in
`hardware/approved-app-images.json`. The registry binds the image to a reviewed
source commit, current GUI/catalog/logo-pack surface and a bounded purpose.
Quarantined or unregistered historical images are rejected even when their hash
is known. It writes only the application partition at `0x10000`, preserves NVS
and all other partitions, then verifies the bytes read from flash. It rejects
arbitrary build paths and symlinks.

`flash-image` is for an already reviewed current candidate or exact restoration
of the current product surface. It is not a binary-bisection mechanism. Adding
an image to the registry requires the owner-facing candidate manifest and a
reviewed commit before any device action.

## Rollback

```bash
export CONFIRM_ROLLBACK=YES
scripts/core2-device-action.sh rollback
```

Rollback is mandatory after an unbootable image, display/power regression,
repeated reset or inability to enter local diagnostics.

The script refuses missing or ambiguous `/dev/cu.*` ports, absent toolchains,
overwriting a factory backup, a backup other than exactly 16 MiB, a failed
SHA-256 check and every write without its second confirmation variable. It has
no erase command.

## Physical credential boundary

The first DIY bring-up deliberately does not burn secure-boot or flash-
encryption eFuses. Wi-Fi credentials in ESP32 NVS are therefore not claimed to
be confidential against an attacker with physical flash access. Keep the cube
physically trusted, do not publish the factory backup, and wipe the device
before transfer or service. A hardened irreversible eFuse profile requires a
separate post-H0 design and owner gate; it is never part of first bring-up.

## Confirmation template

```text
PROPOZYCJA [T3]:
- Co: identify Core2, read a complete factory backup, flash RC0, run H0/H1 smoke.
- Ryzyko: wrong port or interrupted write can make the device temporarily unbootable.
- Rollback: verified 16 MiB factory image written back at offset 0x0.
CZEKAM NA POTWIERDZENIE.
```
