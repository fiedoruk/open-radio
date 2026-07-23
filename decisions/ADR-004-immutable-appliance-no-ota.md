# ADR-004 — Immutable appliance and no automatic OTA

**Status:** ACCEPTED
**Date:** 2026-07-13

## Context

The founder wants a finished, single-purpose radio rather than an application
platform that requires ongoing updates. Reliability must come from local
recovery, not a project cloud or remote control plane.

## Decision

- Normal operation uses immutable firmware and an embedded station snapshot.
- The device has no automatic OTA and does not poll for project firmware.
- The device has no mandatory remote station-catalog dependency.
- Runtime resolvers may query official broadcaster surfaces as part of normal
  station playback; that is not a project update channel.
- Self-healing handles known failure classes locally.
- A manual USB rescue image remains PROPOSED and requires a separate founder
  answer before implementation.

## Consequences

The device remains independent of project infrastructure and cannot be remotely
changed. A broadcaster API, codec, TLS or Bluetooth ecosystem change outside the
implemented contract may require a conscious USB recovery build or may end
support for that station on an unmodified device.
