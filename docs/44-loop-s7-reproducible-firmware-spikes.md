# 44 — Loop S7: software RC0 and hardware-ready integration milestone

**Status:** COMPLETE
**Mode:** BUILD / SOFTWARE-ONLY / T4 BOARD
**Owner:** engineering agent
**Expected size:** one wide macro-loop, four streams, twelve end-to-end tasks
**Hardware action:** prohibited until a separate confirmation

## Correction to loop scale

S7 is not a framework spike and does not end after producing two manifests.
The two build lanes are an internal checkpoint inside one larger milestone.
Codex continues through architecture selection, integrated firmware RC0,
dependency and binary QC, release rehearsal and the complete first-hardware
packet before returning to the owner.

Finishing one stream, four tasks, one successful compile or one prototype is
not an exit condition. The loop ends only at the milestone exit below or at a
real T3/hardware/external-license blocker.

## Milestone goal

Deliver the broadest useful result possible without Core2 hardware: one pinned,
inspectable firmware Release Candidate 0 that incorporates the completed UI,
catalog, resolver, persistence and network contracts; a measured comparison of
the two reusable audio stacks; reproducible build and licensing evidence; and a
ready-to-run first-device validation packet that still performs no flash.

## Direction carried from research

### Reference lane — ESP-IDF + ESP-ADF

- Reuse the official HTTP/MP3 to A2DP Source topology.
- Treat it as the private technical reference for audio pipeline behavior.
- Keep AAC/HE-AAC and unresolved ESP-ADF codec binaries outside public artifacts.

### Public-candidate lane — M5Unified + ESP32-A2DP + Arduino Audio Tools

- Optimize for smaller integration surface and community reproducibility.
- Keep local speaker and Bluetooth outputs behind one project-owned interface.
- Do not promote it merely because it is easier to compile.

The project selects a lane from evidence gathered inside S7. It does not rebuild
audio transport already supplied by maintained components.

## Stream 1 — Architecture, toolchains and evidence-based stack selection

1. Pin project-local versions or commit hashes for ESP-IDF/ESP-ADF and the lighter M5Unified/A2DP/Audio Tools lane; record rollback and cache boundaries.
2. Define one minimal adapter surface for board, network, device store, stream input, PCM, output routing and UI without duplicating completed host policy.
3. Build both smallest viable Core2 targets from clean state, capture compiler/component evidence and select a leading lane or one precise blocker.

**Checkpoint output:** two reproducible build records, adapter contract and a
measured stack decision. Work continues immediately into Stream 2.

## Stream 2 — Integrated firmware RC0

4. Create the real firmware source tree for the leading lane and generate/import the existing station, UI and schema assets instead of copying constants by hand.
5. Wire firmware-shaped adapters to the completed resolver, network-selection, persistence and recovery-supervisor contracts with host fakes where hardware is unavailable.
6. Compile the complete MP3-first application path with mutually exclusive local-speaker and A2DP outputs, embedded local onboarding assets and explicit unsupported HLS states.

**Checkpoint output:** one coherent firmware RC0 build, not disconnected demos.
No runtime or audio-success claim is allowed without hardware.

## Stream 3 — Reproducibility, security, licenses and release rehearsal

7. Add clean-cache build automation, pinned dependency verification and negative gates for credentials, private endpoints, unapproved logos and forbidden codec artifacts.
8. Capture firmware size, partition use, static memory, component graph, warnings and deterministic artifact hashes; define budgets for later heap/stack measurements.
9. Generate SBOM-style dependency inventory, license matrix, notices and a source/binary eligibility verdict; rehearse a local release bundle without publishing it.

**Checkpoint output:** repeatable RC0 artifacts plus an honest statement of what
may be published as source, binary or private experiment. Work continues into
Stream 4.

## Stream 4 — Failure engineering and complete hardware-arrival packet

10. Extend host fault injection across boot, stored configuration, Wi-Fi selection, resolver, stream, output routing and safe mode; keep the full existing regression gate green.
11. Prepare one hardware validation matrix covering display/touch, local speaker, A2DP speakers, Wi-Fi+BT coexistence, powerbank behavior, reconnects, memory budgets and 1/2/8/24-hour soak stages.
12. Write exact first-build, backup, flash, rollback, smoke and evidence-capture commands plus the owner confirmation gate; synchronize README, architecture, decisions and portfolio control-plane.

**Checkpoint output:** a self-contained packet that can be executed when the
Core2 arrives, but no serial port, erase or flash command has been run.

## Milestone exit condition

All of the following are required:

- both candidate stacks have pinned, inspectable evidence or a precise external blocker,
- one leading firmware RC0 integrates the existing product contracts end to end,
- the MP3-first application compiles or the exact remaining compile blocker is isolated,
- local and A2DP outputs share a bounded project-owned routing contract,
- public-source and public-binary eligibility are explicit per dependency,
- AAC/HE-AAC and unresolved ESP-ADF binary stop-gates are mechanically enforced,
- clean-cache build, secret/artifact scans and the full host regression pass,
- resource budgets and deterministic artifact evidence are recorded,
- the release bundle is rehearsed locally but not published,
- the first-device validation, rollback, smoke and soak packet is complete,
- project documentation and the Codex control-plane match the resulting architecture,
- no hardware, production, account, secret or `private-workspace` action occurred.

## Stop boundaries

Stop early only for a genuine T3-high action, physical device dependency,
production/release publication, secret requirement, unresolved legal decision
that blocks every eligible task, or three failed attempts on the same blocker.
Otherwise choose the next eligible task from another stream of this same
milestone; do not return after an internal checkpoint and do not fall through to
another project.

## Completion evidence — 2026-07-13

- Both pinned lanes build: ESP-ADF `v2.8` reference and the selected Core2
  public candidate.
- Public RC0 compiles HTTP/ICY MP3, bounded PCM queues, local speaker fallback,
  A2DP Source and all generated catalog/onboarding assets.
- Two empty-cache builds produce identical `firmware.bin` hashes.
- The public link map contains no AAC, Helix or ESP-ADF codec symbols.
- Dependency locks, SBOM, notices, resource budgets and a source-only local
  release rehearsal pass.
- Host coverage now spans 82 Node tests, 5 renderer cases and 14 firmware
  contract/application cases, including 13 cross-layer fault scenarios.
- The first-hardware validation matrix and unexecuted backup/flash/rollback
  proposal are complete. No hardware or account action occurred.
