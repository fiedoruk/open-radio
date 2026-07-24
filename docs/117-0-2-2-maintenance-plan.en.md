# 0.2.2 maintenance plan — scope, safety rails and the execution path

[Wersja polska](117-0-2-2-maintenance-plan.pl.md)

## Prime directive: 0.2.1 is the untouchable baseline

Release 0.2.1 works in the field — audio, Wi-Fi, Bluetooth, runtime logos and
a responsive touch UI — and is validated on both Core2 hardware revisions.
Everything in this plan obeys one rule: **nothing may degrade what 0.2.1
already does.** The published `open-radio-0-2-1.bin` is never republished or
moved; rollback to it must stay possible at every step (the artifact stays on
the download server, the exact image stays archived, and a rollback flash is
rehearsed as part of the release gate below).

## Safety rails guarding the sacred surfaces

The four surfaces the owner named — audio, Wi-Fi, Bluetooth, logos — are
protected by executable rails, not promises:

1. **Frozen-surface lock** (`firmware/manifests/audio-surface.lock.json`,
   gate `check:audio-surface`): the audio pipeline, ICY stream source, HLS
   fence, byte ring, Bluetooth profile gate, local noise source **and — since
   this plan — the Wi-Fi runtime, logo store, station runtime and station
   slots** are SHA-frozen. Any edit fails the gate until the lock is
   deliberately rewritten; a lock rewrite is a reviewed, plan-listed act,
   never a side effect.
2. **Dependency pins by name + resolved-tree check**: every library resolves
   exactly once at an exact commit; duplicate installs are a hard failure
   (`check-resolved-libdeps`), and CI compiles the firmware on every push.
3. **Determinism contract**: double clean builds must match; the 104-byte
   provenance stamp and the build-root path are the only documented deltas
   (`REPRODUCIBILITY.md`).
4. **Catalog-as-data boundary**: station list changes are data plus generated
   tables — they never modify C++ logic.
5. **Host gate**: the full `npm run check` suite (38 gates, 238 tests,
   renderer determinism) runs on every commit and in CI.
6. **Hardware release gate**: no binary ships without the device matrix in
   Phase 4, and flashing remains an explicit owner action.

## Candidate inventory

Grouped by theme; every item marks whether it touches a frozen surface
(**F**) and therefore requires the lock ritual.

### A. Reliability and hygiene (from the 2026-07-23 pre-launch audit)

- **A1 (F)** Atomic runtime-logo publication: publish each completed logo as
  an immutable snapshot behind a release/acquire pointer; today's write-once
  struct assignment is formally UB even though guards bound the practical
  effect to a skipped frame.
- **A2 (F)** Favicon redirect validation: re-validate the host after
  redirects; refuse private, link-local and loopback targets.
- **A3 (F)** Conditional RMF discovery prefetch: fetch only the pools the
  configured nine actually use. Pool 29 stays — RMF Club is selectable from
  the directory.
- **A4** PNG/JPEG contract: the favicon QC accepts JPEG while the device
  decodes only PNG; mark only truly decodable icons as logo-capable.
- **A5** Strip the embedded build-root path and the historical fixture
  literal from the image (`-ffile-prefix-map`; sources are already clean) —
  this changes the determinism baseline once, documented in the release
  notes.
- **A6** Release engineering: annotated (and signed, if keys allow) tag,
  canonical release manifest written at cut time, cold-build reproduction
  proof in the release checklist.

### B. Setup-portal UX (two independent field reports)

- **B1** Lift the 80-row browse cap in the station picker (progressive
  rendering plus an explicit "…and N more — type to search" affordance).
- **B2** Put the search box directly above its results (slot strip moves or
  sticks), so matches are visible on a phone without scrolling.
- **B3** Make the directory total obvious in the picker header.

### C. Catalog refresh (scout findings, 2026-07-23)

- **C1** Probe pipeline upgrades: follow up to three same-scheme redirects
  during QC; trust the measured content type over the directory's declared
  codec; tolerate a listed bitrate of 0 when the measured stream qualifies.
- **C2** Tiering fairness: tier from the best of three probes at different
  day hours — several regional public stations sit 0.03–0.04 below the B
  threshold from a single probe.
- **C3** New station candidates (each passes QC probe and a device test
  before shipping): Radio Silesia, Radio Jasna Góra, Radio Kraków, and
  Radio 357 via its plain-HTTP revma MP3 mount (token-issuing redirects —
  catalog stores the bare mount, never a tokenized URL).
- **C4** Refresh favicon set accordingly (PNG-only per A4).

### D. Open diagnoses (device windows; diagnose first, fix only if bounded)

- **D1** Logo fetches next to a live stream die after about two connections;
  boot-serial with the per-reason counters should name the layer.
- **D2** DRAM largest-free-block dip to ~5 KB during Bluetooth dialing.
- **D3** Pairing retry cadence (15 s) and accumulated input underruns across
  station switches on the Bluetooth route — observed, never audible; soak
  data decides whether any change is justified.

### E. Tooling debt

- **E1** `core2-onboarding-only` build lane: repair or explicitly retire.

### F. Non-goals for 0.2.2

No decoder changes, no TLS audio (0.3 territory), no AAC, no UI redesign, no
new features beyond catalog data and portal polish. Anything touching frozen
surfaces beyond the A-items listed above is out of scope by default.

## Execution path

- **Phase 0 — rails first (done with this plan):** frozen surface extended to
  Wi-Fi/logo/station files; plan committed.
- **Phase 1 — host-only work:** B and C items plus their tests; full gate
  green; no frozen files touched.
- **Phase 2 — frozen-surface fixes:** each A-item lands as an isolated
  commit with its own lock rewrite, a stated reason, and an independent
  second-agent review before merge.
- **Phase 3 — release engineering:** A5/A6; document the new determinism
  baseline.
- **Phase 4 — hardware gate (owner windows):** factory-fresh flash matrix
  on every Core2 revision available at gate time (v1.0 and v1.1 today; the
  incoming v1.3 joins the moment it arrives), nine-station smoke plus
  console-added stations (including the 357
  candidate), full logo fetch pass, Bluetooth reconnect cycles, Wi-Fi
  recovery, a 60-minute soak (closing the long-open B1), a battery-duration re-confirmation on the release image (first owner
  measurement landed 2026-07-23: ~2.5–3 h at 140–190 mA), and a rehearsed rollback
  flash to 0.2.1.
- **Phase 5 — publish:** separate owner GO; 0.2.1 remains served alongside.
  Bump `release/claims.json` at the cut — the `check:doc-currency` gate then
  fails every living doc still telling the old release's story until the
  documentation sweep is complete.

**Stop rule:** any regression signal on a sacred surface during Phase 4 stops
the release; roll back to 0.2.1, root-cause with at most three fix attempts,
and only then retry the gate.

## Definition of done

0.2.2 ships only when all hold: full host gate green; CI firmware compile
green; two cold builds reproduce the release hash; every touched frozen file
has its reviewed lock entry; the Phase-4 device matrix is recorded with both
hardware revisions covered; release notes list every known limitation that
remains; `release/claims.json` is bumped and the `check:doc-currency` gate
is green; the rollback path to 0.2.1 is proven, not assumed.
