# 41 — Network selection and recovery contract

## Purpose

The radio remembers at most eight approved Wi-Fi profiles and autonomously
selects a reachable one without exposing network identity in public fixtures,
diagnostics or generated traces. This host model is the firmware-facing policy;
it does not perform a real scan or store credentials.

## Data boundary

- remembered profiles use opaque references such as `wifi:home`,
- synthetic scan entries use opaque `scan:*` identifiers,
- public data contains no SSID, BSSID, password, URL, MAC address or location,
- the future device adapter resolves opaque references inside private local storage,
- profiles and scan results are schema-versioned and rejected on malformed input.

Schemas:

- `ui-contract/schemas/remembered-network-profile.schema.json`,
- `ui-contract/schemas/network-scan-result.schema.json`,
- `ui-contract/schemas/network-selection.schema.json`.

## Automatic selection

Only a profile that is all of the following can become an automatic candidate:

1. explicitly approved,
2. currently reachable,
3. secured with supported WPA2-PSK or WPA3-SAE,
4. not detected as a captive portal,
5. not under bounded quarantine.

Unknown, open, captive-portal and unapproved networks return
`PROMPT_REQUIRED`. They are never silently joined. When there is no candidate
and no user decision to request, the selector returns `RETRY_SCHEDULED`.

## Deterministic score

Candidate order uses only bounded local inputs:

```text
priority
+ health score
+ normalized RSSI
+ preferred-profile bonus
+ recent-success bonus
- consecutive-failure penalty
```

Ties are resolved by opaque profile reference. A success timestamp from the
future receives no bonus. This keeps host traces reproducible and prevents time
regression from changing policy silently.

## Recovery

- first timeout reduces health but does not immediately quarantine,
- repeated timeout applies bounded quarantine,
- authentication failure and captive detection apply the maximum immediate backoff,
- successful connection clears failure count and quarantine,
- after quarantine expires the preferred profile can win again,
- backoff levels are `5 s`, `30 s`, `120 s`, then at most `600 s`.

## Persistence integration

S6 stores only opaque `wifi:*` references through the S5 configuration model.
Actual SSID and credential storage belongs to the future device-local adapter.
A profile becomes known-good only after a successful connection and playable
audio; the host contract does not promote it merely because a form was submitted.

## Evidence and limits

`ui-contract/fixtures/network-traces.json` contains nine deterministic scenarios:
four selected, four requiring a prompt and one bounded retry. Real radio scans,
NVS encryption, DHCP/DNS behavior, RF coexistence and reconnect timing remain
hardware gates.
