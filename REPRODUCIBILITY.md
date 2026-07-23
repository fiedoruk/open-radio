# Reproducibility

[Polska wersja](REPRODUCIBILITY.pl.md)

Source archives are bit-for-bit reproducible, and the released 0.2.1 firmware
is reproducible byte-for-byte outside its provenance stamp when three build
parameters are honored (all measured 2026-07-23):

1. **Dependency pins, by name.** Every library in
   `firmware/manifests/dependencies.lock.json` must resolve exactly once;
   M5GFX is pinned as a *named* entry
   (`M5GFX=https://github.com/m5stack/M5GFX.git#ad9b814…`, content-identical
   to registry 0.2.25). `scripts/check-resolved-libdeps.mjs` fails the build
   on any drift or duplicate install.
2. **The build root path.** Two framework assert strings embed the absolute
   toolchain path, so an exact byte match requires the same build root (a
   future release will neutralize this with `-ffile-prefix-map`).
3. **The git commit stamp.** The build embeds `git rev-parse HEAD`; building
   the 0.2.1 sources from any other commit differs in exactly 104 bytes of
   provenance fields (app-descriptor ELF hash, the 40-character commit id,
   and the trailing image hash). With those fields excluded the images are
   byte-identical; building at the release tag itself yields full equality.

## Verify the candidate

```bash
npm run check
```

This validates contracts, generated-file ownership, Node/C++/renderer tests,
documentation parity, community privacy rules and two deterministic rehearsals
of both RC1 archives.

The ignored local outputs are:

- `dist/open-radio-core2-rc1-source.tar`,
- `dist/open-radio-core2-rc1-community-kit.tar`,
- `output/firmware/s11-rc1-evidence.json`.

The checked-in `release/rc1-source-lock.json` is the canonical source manifest.
Maintainers update it only after reviewing intended source changes:

```bash
npm run rehearse:rc1:write
npm run rehearse:rc1
```

## Replay contributor evidence

```bash
npm run validate:community
npm run replay:community -- community/fixtures/replay-good.json
```

The replay is local and performs no network, serial, Bluetooth, flash, account
or publication action. `STALE_FIRMWARE`, `SCHEMA_REJECTED` and
`PRIVACY_REJECTED` are bounded machine-readable failures.
