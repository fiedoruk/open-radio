# Contributing

[Polska wersja](CONTRIBUTING.pl.md)

The project ships public firmware releases (0.1, 0.2, current 0.2.1) validated on real
hardware. Contributions are:

- software under GPL-3.0-or-later,
- original documentation/artwork under CC BY-SA 4.0,
- catalog data under CC0-1.0.

By contributing, you confirm that you have the right to submit the material
under the applicable project license.

## Principles

- Keep the reliable core small.
- Source code, identifiers and technical interfaces use English.
- Public user documentation maintains English and Polish parity.
- Do not add telemetry, cloud dependencies, automatic update channels or remote code execution.
- Do not add official station logos without a rights manifest and documented permission.
- Original station themes are welcome; private assets belong in ignored `assets-local/`.
- Do not add recordings, premium endpoints or unofficial stream proxies.
- Every station endpoint needs an official source page and verification date.

## Pull requests

1. Open or reference an issue/RFC for material changes.
2. Keep one concern per pull request.
3. Include focused tests and hardware evidence when applicable.
4. Update EN/PL user documentation together.
5. Sign commits with the DCO trailer: `Signed-off-by: Name <email>`.

Network, security, USB-rescue and stable-catalog changes require two reviews. Other
changes require one maintainer review.

## Station contributions

Provide the operator, official player, resolver source, codec, transport,
region, verification date and Core2 test result. `Verified` means technically
tested, not approved or endorsed by the broadcaster.

## Community evidence

Use only the bounded JSON formats in `community/schemas/`. Reports do not accept
free text, endpoint URLs, SSIDs, credentials, Bluetooth addresses, device
serials, listener identity, PCM or artwork.

Validate all examples and replay a sanitized callback packet locally:

```bash
npm run validate:community
npm run replay:community -- community/fixtures/replay-good.json
```

Attach only a validated JSON report. A `PASS` result is software evidence for
the declared firmware hash; it is not a general hardware-compatibility claim.
See `REPRODUCIBILITY.md` for the complete source-candidate workflow.
