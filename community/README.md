# Community evidence

[Polska wersja](README.pl.md)

This directory defines privacy-safe evidence that can be validated and replayed
without hardware or network access.

## Formats

- Bluetooth compatibility records capability class and bounded outcomes.
- Station playback records the canonical station ID, declared codec and duration bucket.
- Callback replay accepts only compact runtime facts already supported by ingress.

No format accepts free text, credentials, addresses, endpoint URLs, serial logs,
PCM, listener identity or artwork. Run `npm run validate:community` before
sharing a JSON file.
