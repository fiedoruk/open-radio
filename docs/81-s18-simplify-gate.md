# 81 — S18 Simplify Gate

> Superseded operationally by S19. The previously deferred host adapters,
> bounded caches and persisted Display settings are implemented in document 82;
> only the physical firmware network binding remains hardware-gated.

SIMPLIFY GATE

Mode: max

Project: `the repository root`

Scope: autonomous location selection, approved direct public services,
onboarding simplification, local diagnostics policy and removal of accidental
blanket endpoint and time-sync bans.

Boundary: software-only contracts, deterministic selector, browser GUI and host
tests. No live provider adapter, firmware network request, device flash,
physical performance claim or public release.

## Findings

P0: none.

P1: none.

P2: live IP, weather and optional SNTP adapters still need bounded firmware
supervisors; TLS memory and playback contention are not measured; Wi-Fi
positioning remains disabled by default because the reviewed provider requires
a key and billing and would transmit nearby BSSIDs.

P3: the owner can still manually correct or disable automatic location, and can
later choose the default now-playing variant.

## Simplifications applied

- one ranked selector owns all location source precedence,
- one machine-readable allowlist owns optional public endpoints,
- approved secured Wi-Fi starts location automatically without a city form,
- cached per-network results avoid continuous tracking and repeated requests,
- manual correction always wins without becoming an onboarding requirement,
- local Pro diagnostics stay useful while exported evidence remains redacted,
- provider failures cannot block boot, playback or recovery.

## Validation

Focused selector, onboarding, simulator and GUI tests pass. GUI geometry,
contrast, overflow, documentation parity, firmware surface, hardware-readiness
and source-lock gates are included in the final repository check. Browser QA
verifies the automatic locality marker and the city-step removal without console
errors.

## Deferred work

Implement the keyless IP adapter first, then weather and optional SNTP as
independent bounded services. Add Wi-Fi positioning only after an approved
provider, secret-placement design and explicit BSSID disclosure exist. Hardware
arrival must measure TLS memory, timeout behavior, cached fallback and audio
continuity during every provider failure.

Security/Snyk: no dependency was added and no remote browser asset is loaded.
Snyk is not required for this contract-only change. Exact external data egress
is documented instead of being mislabeled as local-only behavior.

Deploy-readiness: not a deployment. Hardware, flash, release and publication
gates remain closed.

Verdict: PASS WITH RISKS.

Next required step: finish the host QA and source rehearsal. After hardware
arrival, implement and measure the bounded adapters before enabling live
automatic enrichment in the physical candidate.
