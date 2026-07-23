# CURRENT MISSION — Open Radio Core2

**Updated:** 2026-07-22

**Maintainer:** Tomasz Fiedoruk

**State:** `RELEASE 0.2.1 PUBLIC / MAINTENANCE`

## Mission

Keep one reliable, open internet-radio cube on M5Stack Core2 in the hands of
real listeners. The product promise is unchanged: turn it on and it plays —
Polish stations over Wi-Fi through a remembered Bluetooth Classic A2DP/SBC
speaker, with the built-in speaker as automatic fallback, no account, no
cloud, no telemetry, no OTA.

## Current state

Release 0.2.1 is public (`fiedoruk.pl/os/`, tag `open-radio-0-2-1`) — a
same-evening hotfix over 0.2 for two field reports (factory boot loop while
the logo filesystem formatted; console stations rejected over URL
fragments), hardware-validated before publication. `STATUS.md` holds the
measured summary; `docs/113` is the 0.2 closeout, the changelog carries
0.2.1.

The reference device runs the hotfix image (`98f0477a…`, surface
`release-0-2-1-v20`). Rollback layers stay pinned in
`hardware/approved-app-images.json`: the audio LKG (`44e97929…`), the prior
surface checkpoint (`3e7a0cbd…`) and the verified private 16 MiB full-flash
backup.

## Active lane

1. **B1 endurance soak** on the release image, in the owner's window:
   long-run station switching, real bitrate-ceiling reading, and the three
   watch items from `STATUS.md` (DRAM during Bluetooth dialing, 15 s pairing
   cadence, Bluetooth-route input underruns).
2. **Public repository launch** — prepared and owner-gated: decision in
   `decisions/ADR-011`, procedure and standing tree-guard QC in `docs/114`
   plus `release/public-mirror-policy.json`.
3. **0.3 candidates** stay parked until the owner opens them: TLS audio
   (unlocks TLS-only broadcasters such as Radio 357 and Radio Nowy Świat) and
   catalog-refresh probe admission for unknown bitrates.

## Standing gates

- Every public-artifact change is a separate owner-approved gate with backup,
  rollback and smoke evidence.
- Device flash, serial-port access and hardware claims require the explicit
  owner device gate (`scripts/core2-device-action.sh`).
- The full host gate `npm run check` must pass before any commit lands.
