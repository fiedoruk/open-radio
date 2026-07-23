# 32 — Loop S5: persistence and recovery model

**Status:** COMPLETE
**Mode:** BUILD / SOFTWARE-ONLY
**Owner:** engineering agent
**Start gate:** satisfied by owner `next loop` on 2026-07-13

## Goal

Prove offline that configuration writes are atomic, versioned and recoverable.
The host model must always select the newest valid committed slot, fall back to
last-known-good data after corruption or power loss and enter a bounded safe
mode when no bootable state exists.

## Stream 1 — Versioned configuration contract

1. Define JSON Schemas for current, legacy and unsupported-future config versions.
2. Separate public fixture data from credential references; store no real secrets.
3. Implement pure `draft -> validate -> commit` state transitions.

## Stream 2 — Dual-slot persistence model

4. Model A/B slots with generation, checksum and explicit commit marker.
5. Select newest valid state and expose deterministic last-known-good rollback.
6. Inject interruption before write, during payload, before marker and after commit.

## Stream 3 — Corruption, migration and boot fixtures

7. Add truncated payload, invalid JSON, checksum and missing-marker fixtures.
8. Cover interrupted replacement without damaging the previously valid slot.
9. Test supported migration plus explicit rejection of unknown future schema.

## Stream 4 — Supervisor, QC and governance

10. Define bounded boot-loop detection, safe-mode entry and manual local reset boundary.
11. Build deterministic host storage and fault-injection tests with no real filesystem race.
12. Audit logs, privacy, immutable-device limits and synchronize control-plane evidence.

## Exit condition

- every simulated write interruption preserves or restores the previous valid config,
- newest valid committed generation wins and invalid/uncommitted slots never boot,
- supported old config migrates deterministically without mutating its input fixture,
- unknown future config fails explicitly rather than being guessed,
- safe mode is bounded, local and contains no network/deploy escape hatch,
- fixtures and traces contain no passwords, tokens or production identifiers,
- all tests run offline without Core2, flash storage or timing dependence,
- hardware persistence remains unvalidated until physical NVS/flash tests.

## T3 and hardware boundary

No device flash, NVS mutation, real credential capture, firmware release, cloud
backup or account action. The loop may define adapters and contracts, but physical
power-cut durability and flash wear remain hardware-gated evidence.

## Planned evidence

- versioned config and slot JSON Schemas,
- pure persistence state machine and deterministic storage adapter,
- corruption, migration and interrupted-write fixtures,
- boot-selection and safe-mode traces,
- focused negative tests plus complete project QC,
- updated privacy, recovery and portfolio documentation.

## Completion evidence

- current v2, legacy v1, persistence-slot and boot-selection JSON Schemas,
- stable canonical JSON and deterministic CRC32,
- dual A/B slots with generation and final commit marker,
- four write boundaries plus checksum, parse, migration and empty-storage cases,
- nine sanitized traces: 7 `BOOTABLE` and 2 `SAFE_MODE`,
- legacy v1 migration without input mutation and explicit future-v3 rejection,
- bounded boot supervisor at three failures,
- `npm run check`: 56/56 Node tests, 5/5 native renderer cases and unchanged
  hash `121b2e3e0fd94a44`,
- no real credential, NVS, firmware, flash, deploy or `private-workspace` action.
