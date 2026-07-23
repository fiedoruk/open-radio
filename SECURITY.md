# Security policy

## Current state

Public firmware releases 0.1, 0.2 and the current 0.2.1 are live; official
binaries come only from `fiedoruk.pl/os/`. There is no OTA channel — a fixed
release can only reach devices through a manual reflash, so severity
assessments must assume affected devices stay on their installed version.

## Please report

- credential exposure,
- unsafe Wi-Fi onboarding,
- remote code execution,
- malicious or hijacked station-resolver responses,
- manual USB rescue image/rollback bypass if that path is accepted,
- memory corruption reachable from network input,
- privacy or unexpected telemetry issues.

Do not include Wi-Fi passwords, private MAC addresses or personal listening
data in a public issue. Report privately: once the public repository is live,
use GitHub private vulnerability reporting (Security Advisories); until then,
use the contact published at [fiedoruk.pl](https://fiedoruk.pl).

## Persistence boundary

Public configuration fixtures contain only opaque `wifi:*` and `bt:*`
references. They must never contain SSIDs, passwords, Bluetooth addresses,
tokens, precise location or resolved stream URLs. CRC32 is used only for
accidental corruption detection; it does not protect secrets. Firmware keeps
actual credentials in device-local NVS and redacts them from diagnostics. The
DIY first-bring-up profile does not enable secure boot or flash encryption:
credentials are not confidential against physical flash access. Keep the
device and private factory backup trusted and wipe the device before transfer
or service. Any irreversible eFuse hardening requires a separate post-H0 owner
gate and recovery design.

## Local onboarding boundary

The host portal in `network-onboarding/` is dependency-free and uses synthetic
networks outside the device. On Core2 it calls only same-origin device routes.
The embedded portal uses a per-boot 48-bit WPA2 access code, a separate per-boot
64-bit request token and AP-interface client binding. It has no remote request,
query-string credential transport or browser-storage write. Physical captive-
portal behavior and RF recovery remain hardware tests documented in
`docs/42-local-onboarding-privacy-contract.md`.
