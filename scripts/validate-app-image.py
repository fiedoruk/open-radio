#!/usr/bin/env python3
"""Validate one exact application image against the reviewed flash registry."""

import json
import re
import sys
from pathlib import Path


def fail(reason: str) -> None:
    raise SystemExit(reason)


if len(sys.argv) != 5:
    fail("USAGE: validate-app-image.py REGISTRY SHA256 BYTE_SIZE PURPOSE")

registry_path, image_sha, image_size_raw, purpose = sys.argv[1:]
if not re.fullmatch(r"[0-9a-f]{64}", image_sha):
    fail("INVALID_SHA256")
try:
    image_size = int(image_size_raw)
except ValueError:
    fail("INVALID_SIZE")
if image_size <= 0:
    fail("INVALID_SIZE")

with Path(registry_path).open(encoding="utf-8") as handle:
    registry = json.load(handle)

if registry.get("schemaVersion") != 1:
    fail("REGISTRY_SCHEMA_MISMATCH")
if any(item.get("sha256") == image_sha for item in registry.get("quarantined", [])):
    fail("QUARANTINED")

record = next(
    (item for item in registry.get("approved", []) if item.get("sha256") == image_sha),
    None,
)
if record is None:
    fail("UNREGISTERED")
if not record.get("flashAllowed"):
    fail("FLASH_DISABLED")
if record.get("byteSize") != image_size:
    fail("SIZE_MISMATCH")
if purpose not in record.get("allowedPurposes", []):
    fail("PURPOSE_REJECTED")

surface_id = record.get("surfaceId")
surface = registry.get("productSurfaces", {}).get(surface_id)
if surface is None:
    fail("SURFACE_MISSING")
if not surface.get("logoPackRequired") or surface.get("stationCount") != 9:
    fail("SURFACE_REJECTED")
# core2-public-candidate joined 2026-07-21 by owner decision: he always runs
# the exact image customers download, so the customer lane must be flashable
# through the same guarded path as everything else.
if record.get("lane") not in {"core2-hardware-lab", "core2-owner-production", "core2-public-candidate"}:
    fail("LANE_REJECTED")

print("|".join((record["role"], record["sourceCommit"], surface_id)))
