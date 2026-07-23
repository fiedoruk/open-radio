# Skrypty

Aktywne bez hardware:

- `serve-simulator.mjs` — lokalny serwer emulatora,
- `validate-ui-contract.mjs` — viewport, katalog, motywy, PL/EN i fixtures,
- `validate-community-evidence.mjs` — ścisłe raporty Bluetooth/stacji/replay,
- `replay-community-trace.mjs` — lokalny replay oczyszczonych callbacków,
- `rehearse-rc1-source.mjs` — deterministyczny source lock i dwa archiwa RC1,
- `check-hardware-readiness.mjs` — bezoperacyjny audyt macierzy głośników,
  backupu/rollbacku, prywatnych artefaktów i opcjonalnej polityki SNTP,
- `check-docs-parity.mjs` — parytet publicznych par EN/PL.
- `capture-hardware-soak.mjs` — strzeżony, ograniczony czasowo capture wyłącznie
  dozwolonych i zredagowanych liczników H4 do ignorowanego `output/`; każdy
  wynik zapisuje SHA-256, rozmiar i lane lokalnej binarki przekazanej przez
  `--firmware-path` (domyślnie `core2-hardware-lab`).

Skrypty flash i serial pozostają za osobną bramką sprzętową.
