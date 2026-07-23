# Testy

Testy software-only uruchamiają się bez Core2:

```bash
npm run check
```

Obecny zakres:

- dokładny kontrakt viewportu 320x240,
- dziewięć unikalnych motywów stacji,
- parytet kluczy PL/EN,
- przejścia onboardingu,
- recovery Wi-Fi,
- fallback Bluetooth,
- automatyczna stacja awaryjna i powrót,
- granice głośności.
- JSON Schema i runtime rejection dla snapshotów oraz komend,
- 24 kombinacje system state × PL/EN × BT/local,
- wszystkie data-driven hitboxy i minimalny target 44 px,
- 62 kontrole overflow dla 10 slotów tekstowych.
- kontrakt 320x240 RGB565 i generator stałych C++,
- 6 przypadków native: packing, clipping, guardy, invalid input, determinism
  oraz realne glify ASCII i polskiego `Ł/ł`,
- dwa niezależne czyste buildy z identycznym hashem oraz PPM.
- schema katalogu 9 stacji i 18 kandydatów resolvera,
- dziewięć pozycji `MP3_ICY` zgodnych z bieżącym firmware Core2,
- timeout, 404, quarantine, bounded backoff i last-known-good,
- 9 deterministycznych trace bez URL endpointów: 5 playing, 1 retry, 3 unsupported.
- wersjonowane config schema v1/v2 i jawne odrzucenie przyszłej v3,
- deterministyczny CRC32 oraz canonical JSON,
- atomowy zapis A/B w czterech punktach przerwania,
- fallback po checksum/JSON corruption i migracja bez mutacji wejścia,
- 9 trace persistence: 7 bootable i 2 safe mode, bez payloadów i sekretów,
- schema profili/skanów oraz do ośmiu opaque `wifi:*` references,
- scoring, quarantine, auth/captive backoff i powrót preferowanej sieci,
- 9 trace sieci: 4 selected, 4 prompt i 1 bounded retry, bez identity/credentials,
- lokalny onboarding PL/EN, first-sound przed city/BT i blokady open/captive,
- brak zdalnych requestów, form action oraz zapisu do browser storage.
- trzy ścisłe formaty community evidence bez free text i prywatnych pól,
- valid Classic A2DP, LE Audio-only out-of-scope i bounded stream retry,
- callback replay z bounded summary oraz odrzucenie stale/schema/privacy,
- deterministyczny source lock, dwa archiwa RC1 i automatyczny parytet EN/PL.
- uczciwy boot firmware bez syntetycznych sukcesów usług, linkowanie wspólnego
  renderera oraz brak zależności NTP,
- automatyczny, bezpieczny gate H0 bez serial/network/device I/O.

Pełny gate obejmuje 120 testów Node, 6 testów native renderera i 90 przypadków
firmware host. Pięć wariantów Core2 jest sprawdzanych osobnym buildem.

Plan hardware znajduje się w `docs/08-validation-plan.md`. Testy sprzętowe muszą
zapisywać board/revision, toolchain, port, firmware hash i wynik bez sekretów.
