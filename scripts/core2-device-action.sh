#!/usr/bin/env bash
set -euo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIO="$ROOT/.tools/venv/bin/pio"
PYTHON="$ROOT/.tools/venv/bin/python"
ESPTOOL="$ROOT/.tools/platformio-core/packages/tool-esptoolpy/esptool.py"
FLASH_BYTES=16777216
APP_OFFSET=0x10000
APP_MAX_BYTES=6553600
PARTITION_TABLE_OFFSET=0x8000
PARTITION_TABLE_BYTES=0x1000
OTADATA_OFFSET=0xe000
OTADATA_BYTES=0x2000
APP_IMAGE_REGISTRY="$ROOT/hardware/approved-app-images.json"
BACKUP_PATH="${BACKUP_PATH:-$ROOT/hardware/backups/core2-factory-16m.bin}"
LIVE_PREFLIGHT_DIR=""

cleanup_live_preflight() {
  case "$LIVE_PREFLIGHT_DIR" in
    */open-radio-preflight.*)
      [[ ! -e "$LIVE_PREFLIGHT_DIR" || -d "$LIVE_PREFLIGHT_DIR" ]] || return
      [[ ! -e "$LIVE_PREFLIGHT_DIR/partitions.bin" ]] ||
        unlink "$LIVE_PREFLIGHT_DIR/partitions.bin"
      [[ ! -e "$LIVE_PREFLIGHT_DIR/otadata.bin" ]] ||
        unlink "$LIVE_PREFLIGHT_DIR/otadata.bin"
      [[ ! -d "$LIVE_PREFLIGHT_DIR" ]] || rmdir "$LIVE_PREFLIGHT_DIR"
      ;;
  esac
  LIVE_PREFLIGHT_DIR=""
}
trap cleanup_live_preflight EXIT

usage() {
  printf '%s\n' \
    "Usage: PORT=/dev/cu... ESP32_ALLOW_DEVICE_ACTION=1 $0 <preflight|backup|flash-image|rollback|monitor>" \
    "direct build-and-flash actions are disabled; review and register an exact image first" \
    "preflight and flash-image require the live OTA layout to report app0 active" \
    "flash-image additionally requires CONFIRM_FLASH=YES" \
    "flash-image additionally requires IMAGE_PATH, EXPECTED_SHA256 and IMAGE_PURPOSE" \
    "rollback additionally requires CONFIRM_ROLLBACK=YES"
}

require_device_gate() {
  if [[ "${ESP32_ALLOW_DEVICE_ACTION:-0}" != "1" ]]; then
    printf '%s\n' "BLOCKED: set ESP32_ALLOW_DEVICE_ACTION=1 only after explicit owner approval." >&2
    exit 2
  fi
  if [[ -z "${PORT:-}" || "$PORT" != /dev/cu.* || ! -e "$PORT" ]]; then
    printf '%s\n' "BLOCKED: PORT must name the confirmed existing /dev/cu.* Core2 port." >&2
    exit 2
  fi
  [[ -x "$PIO" && -x "$PYTHON" && -f "$ESPTOOL" ]] || {
    printf '%s\n' "BLOCKED: shared ESP32 toolchain is unavailable." >&2
    exit 2
  }
}

redact_device_output() {
  sed -E \
    -e 's/(MAC: )[0-9A-Fa-f:]+/\1[REDACTED]/g' \
    -e 's/(SER=)[^ ]+/\1[REDACTED]/g' \
    -e 's#(/dev/cu\.)[^ ]+#\1[REDACTED]#g'
}

run_esptool_redacted() {
  "$PYTHON" "$ESPTOOL" "$@" 2>&1 | redact_device_output
}

list_devices_redacted() {
  "$PIO" device list | redact_device_output
}

verify_backup() {
  [[ -f "$BACKUP_PATH" && -f "$BACKUP_PATH.sha256" ]] || {
    printf '%s\n' "BLOCKED: complete backup and checksum are required at $BACKUP_PATH." >&2
    exit 3
  }
  local size
  size="$(wc -c < "$BACKUP_PATH" | tr -d ' ')"
  [[ "$size" == "$FLASH_BYTES" ]] || {
    printf '%s\n' "BLOCKED: backup is $size bytes; expected $FLASH_BYTES." >&2
    exit 3
  }
  (cd "$(dirname "$BACKUP_PATH")" && shasum -a 256 -c "$(basename "$BACKUP_PATH").sha256")
}

verify_live_flash_layout() {
  cleanup_live_preflight
  LIVE_PREFLIGHT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/open-radio-preflight.XXXXXX")"
  local partition_readback="$LIVE_PREFLIGHT_DIR/partitions.bin"
  local otadata_readback="$LIVE_PREFLIGHT_DIR/otadata.bin"
  run_esptool_redacted --chip esp32 --port "$PORT" read_flash \
    "$PARTITION_TABLE_OFFSET" "$PARTITION_TABLE_BYTES" "$partition_readback"
  run_esptool_redacted --chip esp32 --port "$PORT" read_flash \
    "$OTADATA_OFFSET" "$OTADATA_BYTES" "$otadata_readback"
  "$PYTHON" "$ROOT/scripts/validate-core2-flash-layout.py" \
    "$partition_readback" "$otadata_readback" --expected-active app0
  cleanup_live_preflight
}

archive_flash_image() {
  local image="$1" sha archive
  sha="$(shasum -a 256 "$image" | awk '{print $1}')"
  archive="$ROOT/output/flashed/$sha.bin"
  mkdir -p "$(dirname "$archive")"
  [[ -e "$archive" ]] || cp "$image" "$archive"
  printf 'flash_image_sha256=%s archive=%s\n' "$sha" "$archive"
}

resolve_exact_application_image() {
  [[ -n "${IMAGE_PATH:-}" && -n "${EXPECTED_SHA256:-}" &&
     -n "${IMAGE_PURPOSE:-}" ]] || {
    printf '%s\n' "BLOCKED: flash-image requires IMAGE_PATH, EXPECTED_SHA256 and IMAGE_PURPOSE." >&2
    exit 5
  }
  [[ "$EXPECTED_SHA256" =~ ^[0-9a-f]{64}$ ]] || {
    printf '%s\n' "BLOCKED: EXPECTED_SHA256 must be 64 lowercase hex characters." >&2
    exit 5
  }
  local image_dir image_name actual_sha size
  image_dir="$(cd "$(dirname "$IMAGE_PATH")" 2>/dev/null && pwd -P)" || {
    printf '%s\n' "BLOCKED: IMAGE_PATH directory does not exist." >&2
    exit 5
  }
  image_name="$(basename "$IMAGE_PATH")"
  RESOLVED_IMAGE="$image_dir/$image_name"
  [[ -f "$RESOLVED_IMAGE" && ! -L "$RESOLVED_IMAGE" ]] || {
    printf '%s\n' "BLOCKED: IMAGE_PATH must be a regular, non-symlink file." >&2
    exit 5
  }
  case "$RESOLVED_IMAGE" in
    "$ROOT/output/flashed/"*.bin) ;;
    *)
      printf '%s\n' "BLOCKED: IMAGE_PATH is outside the archived-image allowlist." >&2
      exit 5
      ;;
  esac
  size="$(wc -c < "$RESOLVED_IMAGE" | tr -d ' ')"
  [[ "$size" -gt 0 && "$size" -le "$APP_MAX_BYTES" ]] || {
    printf '%s\n' "BLOCKED: application image is $size bytes; allowed maximum is $APP_MAX_BYTES." >&2
    exit 5
  }
  actual_sha="$(shasum -a 256 "$RESOLVED_IMAGE" | awk '{print $1}')"
  [[ "$actual_sha" == "$EXPECTED_SHA256" ]] || {
    printf '%s\n' "BLOCKED: application image SHA-256 does not match EXPECTED_SHA256." >&2
    exit 5
  }
  [[ -f "$APP_IMAGE_REGISTRY" ]] || {
    printf '%s\n' "BLOCKED: approved app-image registry is missing." >&2
    exit 5
  }
  local registry_record
  if ! registry_record="$($PYTHON "$ROOT/scripts/validate-app-image.py" \
      "$APP_IMAGE_REGISTRY" "$actual_sha" "$size" "$IMAGE_PURPOSE")"; then
    printf '%s\n' "BLOCKED: image is quarantined, unregistered or not approved for this purpose." >&2
    exit 5
  fi
  printf 'verified_application_image sha256=%s bytes=%s offset=%s purpose=%s registry=%s\n' \
    "$actual_sha" "$size" "$APP_OFFSET" "$IMAGE_PURPOSE" "$registry_record"
}

action="${1:-}"
case "$action" in
  preflight)
    require_device_gate
    list_devices_redacted
    run_esptool_redacted --chip esp32 --port "$PORT" chip_id
    run_esptool_redacted --chip esp32 --port "$PORT" flash_id
    verify_live_flash_layout
    ;;
  backup)
    require_device_gate
    [[ ! -e "$BACKUP_PATH" && ! -e "$BACKUP_PATH.sha256" ]] || {
      printf '%s\n' "BLOCKED: refusing to overwrite an existing factory backup." >&2
      exit 3
    }
    mkdir -p "$(dirname "$BACKUP_PATH")"
    run_esptool_redacted --chip esp32 --port "$PORT" \
      read_flash 0x0 0x1000000 "$BACKUP_PATH"
    (cd "$(dirname "$BACKUP_PATH")" && \
      shasum -a 256 "$(basename "$BACKUP_PATH")" > "$(basename "$BACKUP_PATH").sha256")
    verify_backup
    ;;
  flash|flash-lab)
    printf '%s\n' \
      "BLOCKED: DIRECT_BUILD_FLASH_DISABLED. Build without a device write, review the exact candidate manifest, register its SHA-256, then use flash-image." >&2
    exit 4
    ;;
  flash-image)
    require_device_gate
    [[ "${CONFIRM_FLASH:-NO}" == "YES" ]] || {
      printf '%s\n' "BLOCKED: set CONFIRM_FLASH=YES after reviewing H0 evidence and rollback." >&2
      exit 4
    }
    verify_backup
    verify_live_flash_layout
    resolve_exact_application_image
    cd "$ROOT"
    run_esptool_redacted --chip esp32 image_info "$RESOLVED_IMAGE"
    archive_flash_image "$RESOLVED_IMAGE"
    run_esptool_redacted --chip esp32 --port "$PORT" \
      write_flash --flash_size keep "$APP_OFFSET" "$RESOLVED_IMAGE"
    run_esptool_redacted --chip esp32 --port "$PORT" verify_flash \
      "$APP_OFFSET" "$RESOLVED_IMAGE"
    ;;
  rollback)
    require_device_gate
    [[ "${CONFIRM_ROLLBACK:-NO}" == "YES" ]] || {
      printf '%s\n' "BLOCKED: set CONFIRM_ROLLBACK=YES after confirming the port and backup hash." >&2
      exit 4
    }
    verify_backup
    archive_flash_image "$BACKUP_PATH"
    run_esptool_redacted --chip esp32 --port "$PORT" \
      write_flash 0x0 "$BACKUP_PATH"
    run_esptool_redacted --chip esp32 --port "$PORT" verify_flash \
      0x0 "$BACKUP_PATH"
    ;;
  monitor)
    require_device_gate
    "$PIO" device monitor --port "$PORT" --baud 115200 2>&1 | redact_device_output
    ;;
  *)
    usage
    exit 1
    ;;
esac
