# Support

[Polska wersja](SUPPORT.pl.md)

Public releases 0.1, 0.2 and the current 0.2.1 are live and hardware-validated on the reference
device; official binaries come only from `fiedoruk.pl/os/`. The issue tracker
arrives with the public repository launch — until then, reports travel through
the channels below.

## Supported reports

- Bluetooth results use `community/schemas/bluetooth-compatibility-result.schema.json`.
- Station results use `community/schemas/station-playback-result.schema.json`.
- Sanitized callback traces use `community/schemas/callback-replay-packet.schema.json`.

Run `npm run validate:community` before sharing a report. Do not include free
text, Wi-Fi credentials, SSIDs, endpoint URLs, Bluetooth addresses, serial
logs, device identity, listening history, PCM or third-party artwork.

## Boundaries

Security reports follow `SECURITY.md` and must use the future private contact.
Custom builds, unsupported codecs, LE Audio-only speakers and non-Core2 boards
remain outside the support contract. A community result applies only to the
declared firmware hash and capability class.
