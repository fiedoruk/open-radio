#!/usr/bin/env python3
"""Fail closed unless a live Core2 readback has the expected active app0 layout."""

import argparse
import struct
import zlib
from pathlib import Path


PARTITION_MAGIC = 0x50AA
PARTITION_MD5_MAGIC = 0xEBEB
OTA_ENTRY_BYTES = 32
OTA_SECTOR_BYTES = 0x1000
ALLOWED_OTA_STATES = {2, 0xFFFFFFFF}  # VALID or rollback-disabled/undefined
EXPECTED_PARTITIONS = {
    "nvs": (1, 2, 0x9000, 0x5000),
    "otadata": (1, 0, 0xE000, 0x2000),
    "app0": (0, 0x10, 0x10000, 0x640000),
    "app1": (0, 0x11, 0x650000, 0x640000),
}


def fail(reason: str) -> None:
    raise SystemExit(reason)


def parse_partitions(raw: bytes) -> dict[str, tuple[int, int, int, int]]:
    if len(raw) != 0x1000:
        fail("PARTITION_READBACK_SIZE_MISMATCH")
    partitions: dict[str, tuple[int, int, int, int]] = {}
    for cursor in range(0, len(raw), 32):
        magic = struct.unpack_from("<H", raw, cursor)[0]
        if magic in (0xFFFF, PARTITION_MD5_MAGIC):
            break
        if magic != PARTITION_MAGIC:
            fail("PARTITION_TABLE_MALFORMED")
        part_type, subtype, offset, size = struct.unpack_from(
            "<BBII", raw, cursor + 2
        )
        label_bytes = raw[cursor + 12 : cursor + 28].split(b"\0", 1)[0]
        try:
            label = label_bytes.decode("ascii")
        except UnicodeDecodeError:
            fail("PARTITION_LABEL_MALFORMED")
        if not label or label in partitions:
            fail("PARTITION_LABEL_MALFORMED")
        partitions[label] = (part_type, subtype, offset, size)
    return partitions


def ota_entry(raw: bytes, sector: int) -> tuple[int, int] | None:
    cursor = sector * OTA_SECTOR_BYTES
    entry = raw[cursor : cursor + OTA_ENTRY_BYTES]
    if len(entry) != OTA_ENTRY_BYTES:
        fail("OTADATA_READBACK_SIZE_MISMATCH")
    sequence = struct.unpack_from("<I", entry, 0)[0]
    state = struct.unpack_from("<I", entry, 24)[0]
    stored_crc = struct.unpack_from("<I", entry, 28)[0]
    if sequence in (0, 0xFFFFFFFF) or state not in ALLOWED_OTA_STATES:
        return None
    calculated_crc = zlib.crc32(struct.pack("<I", sequence), 0xFFFFFFFF)
    return (sequence, sector) if calculated_crc == stored_crc else None


def newer_entry(
    left: tuple[int, int], right: tuple[int, int]
) -> tuple[int, int]:
    difference = (left[0] - right[0]) & 0xFFFFFFFF
    if difference == 0:
        return left
    return left if difference < 0x80000000 else right


parser = argparse.ArgumentParser()
parser.add_argument("partition_readback")
parser.add_argument("otadata_readback")
parser.add_argument("--expected-active", choices=("app0", "app1"), required=True)
args = parser.parse_args()

partition_raw = Path(args.partition_readback).read_bytes()
otadata_raw = Path(args.otadata_readback).read_bytes()
if len(otadata_raw) != 0x2000:
    fail("OTADATA_READBACK_SIZE_MISMATCH")

partitions = parse_partitions(partition_raw)
for label, expected in EXPECTED_PARTITIONS.items():
    if partitions.get(label) != expected:
        fail(f"PARTITION_LAYOUT_MISMATCH:{label}")

valid_entries = [
    entry for sector in range(2) if (entry := ota_entry(otadata_raw, sector))
]
if not valid_entries:
    fail("OTADATA_NO_VALID_ENTRY")
active_entry = valid_entries[0]
for entry in valid_entries[1:]:
    active_entry = newer_entry(active_entry, entry)
active_slot = f"app{(active_entry[0] - 1) % 2}"
if active_slot != args.expected_active:
    fail(f"ACTIVE_SLOT_MISMATCH:{active_slot}")

print(
    "PASS flash-layout "
    f"active={active_slot} ota_seq={active_entry[0]} "
    "app0=0x10000+0x640000 app1=0x650000+0x640000"
)
