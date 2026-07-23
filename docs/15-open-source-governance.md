# 15 — Open source, autorstwo i governance

## Model projektu

Na początku projekt jest `maintainer-led`:

- Tomasz Fiedoruk jest founderem i finalnym ownerem roadmapy, releasów, bezpieczeństwa i marki.
- Codex przygotowuje implementację, dokumentację, review i powtarzalne gate'y.
- Decyzje architektoniczne trafiają do ADR.
- Contributor może awansować do reviewera/maintenera przez udokumentowaną pracę.
- Zwykły PR wymaga jednego review; sieć, OTA, security i katalog `stable` wymagają dwóch.

## Rekomendowany model licencyjny

Najprostszy tor Arduino korzysta z bibliotek audio, których część jest GPL-3.0
lub ma złożone licencje kodeków. Dlatego nie możemy obiecać permissive firmware
przed zamknięciem dependency audit.

### A) GPL-3.0-or-later — rekomendacja

- pasuje do celu „społeczność rozwija i udostępnia poprawki”,
- pozwala użyć najprostszego obecnego stosu GPL,
- dystrybuowane modyfikacje muszą zachować źródła i prawa użytkownika,
- może ograniczyć zamknięte wdrożenia komercyjne.

### B) Apache-2.0

- niski próg adopcji i jawna licencja patentowa,
- `NOTICE` utrwala autorstwo,
- forki mogą być zamknięte,
- wymaga dobrania lub napisania zgodnego, permissive toru dekodera/audio.

**Bieżąca rekomendacja:** GPL-3.0-or-later, bo łączy prostotę użycia działających
komponentów z share-backiem dystrybuowanych forków. Apache-2.0 lepiej maksymalizuje
adopcję firm, ale pozwala zamknąć ulepszenia i może wymusić trudniejszy tor audio.

Brak celu sprzedażowego nie jest powodem do `NonCommercial`. Taki warunek
utrudnia makerom, warsztatom, mediom i dystrybucjom korzystanie z projektu i nie
jest typowym open source. GPL pozwala także na użycie komercyjne, ale zachowuje
prawa odbiorców do kodu źródłowego dystrybuowanego firmware.

## Pozostałe licencje

- Dokumentacja i oryginalne grafiki: CC BY-SA 4.0.
- Dane katalogu stacji: CC0-1.0.
- Nazwa/logo projektu: poza licencjami kodu i danych, opisane w `TRADEMARKS.md`.
- Zależności: pełny `THIRD-PARTY-NOTICES.md` i wersjonowany manifest/SBOM.

## Trwałe autorstwo

- copyright notices: `Copyright 2026 Tomasz Fiedoruk`.
- `AUTHORS.md`: founder oraz kontrybutorzy.
- `CITATION.cff`: cytowanie repozytorium.
- ekran `About / O projekcie`: autor, repo, wersja i licencja.
- Git i changelog zachowują autorstwo zmian.
- Nie wymagamy stałego splash screenu ani logo w forkach; wymagane są warunki
  właściwej licencji i brak sugerowania poparcia forka przez Tomasza.

## Contributions

- DCO `Signed-off-by`, bez ciężkiego CLA na początku.
- Małe PR-y i jawne kryteria akceptacji.
- Katalog stacji ma osobny formularz i test techniczny.
- Każdy nowy endpoint podaje źródło, datę i format.
- Brak automatycznego wykonywania kodu pochodzącego z katalogu.

## Prywatność

- Zero analityki i telemetrii wychodzącej w MVP; lokalne metryki diagnostyczne
  są dozwolone i potrzebne do autonomicznego recovery.
- Brak kont, identyfikatora urządzenia i historii słuchania.
- SSID, MAC głośnika i dokładne logi nie opuszczają urządzenia automatycznie;
  lokalny panel Pro może je pokazać właścicielowi.
- Każdy endpoint sieciowy trafia do `NETWORK-ENDPOINTS.md`.
- Przyszła telemetria wyłącznie opt-in przez osobny ADR.

## Publiczne pliki przed pierwszym release

```text
LICENSE
NOTICE
AUTHORS.md
CITATION.cff
CONTRIBUTING.md
CONTRIBUTING.pl.md
GOVERNANCE.md
CODE_OF_CONDUCT.md
SECURITY.md
SUPPORT.md
PRIVACY.md
TRADEMARKS.md
NETWORK-ENDPOINTS.md
THIRD-PARTY-NOTICES.md
```
