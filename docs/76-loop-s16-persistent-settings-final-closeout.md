# 76 — Loop S16: persistent settings and final software-only closeout

## Scope

This final loop closes the accepted A2 GUI without creating another feature
track. Language, volume, brightness, theme and preferred station now use the
existing versioned device configuration and atomic A/B persistence model.

## Delivered

- DeviceConfig V2 carries bounded brightness and an explicit dark/light theme.
- Existing V2 payloads without those fields normalize to brightness `75` and
  dark theme; v1 migration and explicit future-v3 rejection remain intact.
- The simulator reducer and strict UiCommand/UiSnapshot schemas expose
  brightness and theme changes.
- The UI controller hydrates preferences and commits changes through a supplied
  settings store.
- GUI Lab uses a browser-backed A/B store; the visual settings survive reload
  without cloud, account, telemetry, remote asset or source editing.
- The C++ firmware DTO, validation and canonical payload include the same
  values for future NVS mapping.

## Evidence

- Focused Node suite: 48/48 pass.
- Firmware host suite: all contract, parity, hostile-input, runtime and ingress
  binaries pass.
- Browser QA: volume changed from 50% to 75%, survived reload and produced no
  console warning/error.
- Full source gate: 140/140 Node, 10/10 renderer and 90/90 firmware host cases.

## Boundary

No device, serial port, network credential, station artwork, firmware flash,
public release or hardware compatibility claim was used. Physical display,
touch, RGB565 appearance, local audio, A2DP/SBC, RF coexistence, power and soak
remain `NOT_MEASURED`.

## Result

This was the S16 closeout result. Owner-approved S17-S18 work and the current
`BUILD / SOFTWARE-ONLY` instruction supersede the repository-pause statement.
Host-testable work may continue, while physical actions still resume only from
`docs/75-hardware-arrival-handoff.en.md` or its Polish counterpart.
