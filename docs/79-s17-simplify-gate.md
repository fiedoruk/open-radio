# 79 — S17 Simplify Gate

> Superseded for location and privacy policy by the S18 autonomous
> configuration audit and S18 Simplify Gate. The original S17 result below is
> retained as historical evidence; its manual-locality restriction is no longer
> the active product contract.

SIMPLIFY GATE

Mode: max

Project: `the repository root`

Scope: two now-playing variants, optional weather contract, three audio-reactive screensaver demos, enclosure research and supporting GUI contracts.

Boundary: software-only browser prototype; no live station metadata, weather request, firmware flash, physical enclosure fit or public release.

Checks run: GUI contract validation, focused GUI suite, documentation parity, full repository check, native renderer tests and determinism, firmware host tests, 141 Node tests, RC1 source rehearsal, `git diff --check`, Browser render/interaction/overflow/PL-EN/console QA.

Checks not run: physical Core2 frame rate and audio contention, live ICY metadata variability, live Open-Meteo failure behavior, real enclosure fit and thermals, A2DP playback during visualizer load.

## Findings

P0: none.

P1: none.

P2: Bars needs a hardware performance gate; community rear-cover fit is unverified; live metadata and weather remain contracts rather than implemented network features.

P3: the owner still needs to choose whether Editorial or Glance is the default shown after boot.

## Result

Applied at S17: reused the pinned Tabler subset; bounded and sanitized optional metadata; coarse user-selected locality only; weather failure cannot block radio; screensavers cap the future firmware path at 16 fps and skip frames under audio pressure; reduced-motion fallback is present in GUI Lab. S18 replaces the manual-locality restriction with a bounded automatic location pipeline.

Deferred: firmware PCM analysis tap, live metadata and weather adapters, persisted screen selection, physical frame-rate measurement and enclosure qualification.

Regression risks: confined to GUI Lab and source-contract files; playback, persistence and firmware runtime code are unchanged.

Security/Snyk: no dependency was added and no remote asset is loaded. Snyk was not required for this static local UI change. Privacy rules are validated by contract tests.

Deploy-readiness: not a deployment. RC1 source lock is current and deterministic; hardware, release and publication gates remain closed.

Verdict: PASS WITH RISKS.

Rationale: the software-only visual scope is measured and green, while device performance, live providers and physical fit cannot be claimed before hardware.

Next required step: owner compares Radio 1, Radio 2, Pulse, Bars and Orbit in GUI Lab and chooses the default; selected behavior then moves to the firmware renderer before H1 hardware validation.
