# 61 — Loop S11: RC1 source freeze and community kit

**Status:** COMPLETE
**Mode:** BUILD / SOFTWARE-ONLY / T4 BOARD
**Expected size:** one macro-loop, four streams, twelve end-to-end tasks
**Publication action:** prohibited until a separate owner gate

## Goal

Turn the software-only RC0/S10 evidence into a reviewable RC1 source candidate
that another person can reproduce, inspect and improve without receiving a
binary, secret, device identity or unsupported hardware claim. Prepare the
viral open-source contribution path locally; do not create a remote repository
or publish a release.

## Completion evidence

- `release/rc1-source-policy.json` owns the included/excluded surface and all
  generated outputs; `release/rc1-source-lock.json` records every source hash.
- `scripts/rehearse-rc1-source.mjs` runs eight generator drift checks and creates
  two byte-identical source archives plus two byte-identical community kits.
- Three strict schemas cover Bluetooth compatibility, station playback and
  callback replay without free text, identity, credentials or endpoint fields.
- Seven fixtures cover valid Classic A2DP/SBC, LE Audio-only out-of-scope,
  supported MP3, unsupported HLS/HE-AAC, good replay, stale firmware and schema
  rejection.
- The local CLI returns bounded `PASS`, `STALE_FIRMWARE`, `SCHEMA_REJECTED`,
  `PRIVACY_REJECTED` or `UNSUPPORTED_REPORT` outcomes and performs no network
  action.
- EN/PL contribution, support and reproducibility pairs pass the automated
  parity gate.

## Stream 1 — deterministic source freeze

1. Define the RC1 included/excluded source manifest and canonical generated-file
   ownership without freezing hardware-only evidence as truth.
2. Produce stable hashes for release-relevant source, contracts, licenses and
   notices while excluding caches, screenshots, raw captures and local state.
3. Add a drift gate that detects missing, unexpected or stale generated files
   and proves two clean source-package rehearsals are identical.

## Stream 2 — privacy-safe community evidence

4. Define a Bluetooth compatibility-result schema around A2DP/SBC capabilities,
   outcomes and firmware hash without speaker MAC, owner identity or free text.
5. Define a station playback report schema with station ID, declared codec,
   bounded outcome and time bucket, never endpoint URLs or listener identity.
6. Add hostile fixtures and redaction tests for identifiers, credentials,
   endpoints, serial logs, PCM and third-party artwork.

## Stream 3 — contributor replay workflow

7. Build a local CLI that validates and replays sanitized callback traces into
   the existing JS ingress runner without network access.
8. Add deterministic summaries and machine-readable failure reasons suitable
   for an issue attachment without exposing private payload.
9. Provide contributor fixtures for good replay, schema rejection, incompatible
   Bluetooth profile, unsupported codec and stale firmware evidence.

## Stream 4 — bilingual handoff and QC

10. Update EN/PL contributor, support and reproducibility instructions with the
    exact local commands, evidence boundary and attribution model.
11. Rehearse a source-only RC1 archive and community issue packet twice; assert
    zero binary, credential, endpoint, device identity or publication action.
12. Run full Node/C++/renderer/build regression, license/notices/privacy scans,
    docs parity, control-plane synchronization and a max Simplify Gate.

## Exit condition

- one deterministic RC1 source manifest and drift gate exist — **PASS**,
- community Bluetooth and station evidence have strict privacy-safe schemas — **PASS**,
- sanitized traces can be validated and replayed locally without network — **PASS**,
- EN/PL contributors can reproduce the source candidate and submit bounded
  evidence without unsupported compatibility claims,
- no hardware, live network, secret, serial, flash, account, remote repository,
  publication or `private-workspace` write occurs — **PASS**.

## T3 boundary

Creating or configuring a public repository, publishing a package/release,
flashing a device, opening serial, pairing Bluetooth or running live network
tests is not part of S11 and requires a separate explicit gate.
