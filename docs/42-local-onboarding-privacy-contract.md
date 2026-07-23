# 42 — Local onboarding and privacy contract

## User promise

Initial setup is local, bilingual and minimal. Wi-Fi is the only blocking
question. The first station starts on the Core2 speaker while location, region
and timezone configure automatically; Bluetooth remains optional.

The executable prototype is served at:

```text
http://127.0.0.1:4173/network-onboarding/
```

It uses synthetic network labels and does not configure the host operating
system or a real router.

## Flow

1. Show 2.4 GHz scan results.
2. A remembered secured network starts first sound without asking for its secret again.
3. A new secured network requests a credential locally.
4. Open, captive-portal and unknown-security networks stop at an explicit blocked state.
5. A valid credential length advances directly to `FIRST_SOUND`.
6. Approximate location starts automatically while audio is already playing;
   the user may disable it or correct it later.
7. Bluetooth can be deferred or the local speaker retained.
8. Completion promises autonomous reuse only after the device adapter has committed a known-good profile.

## Secret handling

- the state machine receives only credential length, never credential text,
- the browser field has no form action and no query-string transport,
- the field is cleared before the state transition,
- device builds use `fetch` only for same-origin `/api/networks` and
  `/api/config-form`; no remote fetch, XHR, beacon or browser-storage write exists,
- the configuration POST requires a separate per-boot request token obtained
  from the AP-local network response,
- fixtures, screenshots, traces and audit output contain no credential,
- Browser QC uses an explicitly synthetic test value only.

Firmware uses device-local NVS, redacts diagnostics and avoids copying secrets
into public application state. The first DIY image does not claim confidentiality
against physical flash access; secure-boot or flash-encryption eFuses remain a
separate irreversible post-H0 decision.

## Direct public lookups

The portal itself remains local and performs no external request. After the
Core2 joins an approved network, the device adapter may directly call the
approved IP-location, weather and time services listed in
`NETWORK-ENDPOINTS.md`. Those providers necessarily see the request IP; weather
also receives coordinates. No request passes through project infrastructure,
and no SSID, password, Bluetooth identity or listening history is uploaded.

## Browser QC — 2026-07-13

- viewport: `390x844`,
- PL open-network block: PASS,
- EN captive-portal block: PASS,
- EN new secured network through first sound and completion: PASS,
- PL remembered secured network starts first sound without credential input: PASS,
- password retained after submit: `false`,
- localStorage/sessionStorage keys: none,
- URL search/hash: empty,
- console: `0 errors / 0 warnings`,
- visual inspection: readable, no overlap, primary actions visible.

Evidence:

- `output/playwright/s6-open-network-blocked-390.png`,
- `output/playwright/s6-captive-blocked-en-390.png`,
- `output/playwright/s6-first-sound-en-390.png`,
- `output/playwright/s6-complete-en-390.png`,
- `output/playwright/s6-remembered-first-sound-pl-390.png`.

## Deferred device work

SoftAP creation, local DNS redirection, AP-interface binding, per-boot request
token and NVS credential storage are implemented and compile-checked. Phone
captive-portal behavior, power-loss resume, physical touch handoff and physical
RF behavior must still be proven on Core2. The production portal must not depend
on internet access, an account, a cloud certificate or a project backend.
