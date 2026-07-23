# Novice UX and public-readiness audit

[Polska wersja](85-novice-ux-public-readiness-audit.pl.md)

## Scope

The audit treats the browser preview and repository front page as if they were
opened by people with no project history. It covers daily controls, onboarding,
settings, failure recovery, terminology, public claims and visible development
artifacts. It does not substitute for physical Core2 validation.

## Method

Two independent novice perspectives were used: a non-technical radio owner and
a first-time DIY builder arriving from GitHub. Their black-box walkthroughs were
combined with source review, 320×240 visual inspection, automated overflow and
contrast checks, persistence tests and firmware-host contract tests.

## Findings corrected

- **P1:** closing diagnostics could return to safe mode even after a healthy entry.
- **P1:** Full/Minimal home layout selection existed only in the lab and was not persisted.
- **P1:** an unsupported HLS station could appear as normally playing on a home layout.
- **P2:** Wi-Fi settings could restart onboarding without first showing status or intent.
- **P2:** settings page navigation was an unlabeled icon with no visible destination.
- **P2:** the onboarding language action left the flow instead of changing language in place.
- **P2:** the location card opened an internal “market pack” view with developer terminology.
- **P2:** the logic simulator skipped an explicit first-sound confirmation and used a hidden settings target.
- **P2:** repeated city and speaker controls could overlap, while canvas actions lacked keyboard focus.
- **P2:** the README led with the older logic simulator and a long internal milestone ledger.
- **P3:** `CORE2`, codec names and build-state labels leaked into daily UI where user language was clearer.

## Public hygiene

The recommended GitHub path is now README → browser landing page → GUI preview
or user guide. Internal milestone identifiers remain only in engineering evidence.
Public claims distinguish software simulation, source reproducibility and physical
proof. Personal workspace paths and agent-memory files are not public guidance.

## Remaining risks

Touch feel, panel contrast, animation frame rate, TLS memory, audio contention,
RF coexistence, speaker interoperability, power behavior, enclosure fit and
endurance remain unmeasured until hardware arrives. The final product name and
public security contact also remain release-gated decisions.

## Verdict

`PASS WITH RISKS` for the software-only UX and repository front door. No known
novice-flow trap remains in the audited browser path. Physical usability and all
hardware claims remain explicitly unapproved.
