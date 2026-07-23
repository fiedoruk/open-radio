# 107 — Publiczne wydanie 0.1

[English version](107-public-release-0-1.en.md)

**Cel:** kanoniczny zapis pierwszego publicznego wydania binarnego
**Dotyczy:** artefaktu `open-radio-0-1.bin` i odpowiadających mu źródeł
**Nie autoryzuje:** zapisu urządzenia, kolejnego wydania, deklaracji przejścia
H4 ani twierdzenia o przetestowaniu binarki publicznej na sprzęcie

Dokument opisuje stan faktyczny po publikacji z 2026-07-18 i weryfikacji
pochodzenia z 2026-07-21. Zastępuje wcześniejsze zapisy mówiące, że publiczne
wydanie pozostaje zablokowane do osobnej kwalifikacji — publikacja już nastąpiła.

## Co zostało opublikowane

| Pozycja | Wartość |
|---|---|
| Artefakt | `open-radio-0-1.bin` |
| URL | `https://fiedoruk.pl/os/open-radio-0-1.bin` |
| Rozmiar | 2 316 112 B |
| SHA-256 | `a075693cbc401ebadfc222befc53b899d17e9df564d6277c28d51f434f77b671` |
| Postać | merged full-flash od `0x0` (dio/40m/16MB) |
| Lane | `core2-public-candidate` — MP3-only, bez logotypów nadawców |
| Źródło | tag `open-radio-0-1` → `87aad39` |
| Opublikowano | 2026-07-18 ~23:30 CEST |

Publiczny lane różni się od obrazu właściciela wyłącznie usunięciem logo-packa
nadawców (delta 202 688 B) i zastąpieniem go placeholderami literowymi. Nie
zmienia toru audio, endpointów, koegzystencji Wi-Fi/BT ani polityki A2DP/SBC.

Wykonane pod kierunkiem właściciela, po śróddziennym przekazaniu zadania
między agentami inżynierskimi projektu. Zlecenie i ustalenia licencyjne: wewnętrzny raport inżynierski (poza repo).

## Składniki obrazu

| Offset | Plik | Rozmiar | SHA-256 |
|---|---|---|---|
| `0x1000` | `bootloader.bin` | 17 536 B | `a23f2db3a09e9df581a397ade210cce2224b593f8ae563a28f75b5b9795f30b3` |
| `0x8000` | `partitions.bin` | 3 072 B | `bd0f7954aca2ef7d925ee21aaa1f3dc8822d1d6ce5cbbd26a135e5886bfff6ce` |
| `0xe000` | `boot_app0.bin` | 8 192 B | `f94c5d786a7a8fab06ac5d10e33bf37711a6697636dc037559ea19cc410a17f0` |
| `0x10000` | `firmware.bin` | 2 250 576 B | `26f9ea276d4b099947aa4209a8b6e5ae84c2ae0eee8c5ba1ab7d433547040786` |

## Dowód pochodzenia (2026-07-21)

Artefakty buildu przetrwały w katalogu `.pio`, który jest ulotny — każde
kolejne `pio run` by je nadpisało. Zostały zarchiwizowane do
`output/firmware/public-0-1/` razem z `MANIFEST.json`.

Obraz odtworzono lokalnie ze składników według powyższej mapy offsetów
(dopełnienie `0xFF`) i porównano z plikiem **pobranym z serwera**. Wynik:
**bajtowo identyczny**, ta sama suma `a075693c…`. To wiąże opublikowany plik z
konkretnym drzewem źródeł.

Weryfikacja **nie** obejmuje deterministycznego rebuildu ze źródeł; ogniwo
`87aad39 → firmware.bin` opiera się na czystym drzewie roboczym, znaczniku
czasu buildu i zapisie wykonawcy, nie na powtórzonej kompilacji.

## Licencja i zobowiązanie

Binarka jest wydana jako **GPL-3.0-or-later**. Wymusza to graf zależności —
libmad i ESP8266Audio — więc licencja własnościowa dla całości była niemożliwa.
Przyjęte rozwiązanie: **written offer** udostępnienia odpowiadających źródeł na
żądanie (GPL §6b, formularz na `fiedoruk.pl`, 3 lata) plus ochrona nazwy
„Open Radio". Tekst: `https://fiedoruk.pl/os/LICENSE-0-1.txt` (PL+EN).

Zobowiązanie biegnie **od chwili publikacji**. Materiał do jego wykonania:

- `dist/open-radio-0-1-corresponding-source.tar.gz` — 460 plików, zawiera
  `scripts/build-firmware-public.sh`, `platformio.ini`, manifesty z pinami,
  `LICENSES.md` i `THIRD-PARTY-NOTICES.md`,
- suma kontrolna obok, w pliku `.sha256`,
- kopia zapasowa całej historii na prywatnym `origin` wraz z tagiem.

## Czego nie zweryfikowano

1. **Smoke na sprzęcie** — binarka publiczna nigdy nie została fizycznie
   uruchomiona. Kostka właściciela chodzi na obrazie `659e56c…`, nie na tym.
2. **Deterministyczny rebuild** ze źródeł `87aad39`.
3. `release/rc1-candidate.json` nadal deklaruje `published: false`,
   `hardwareValidated: false` i historyczny `evidenceFirmwareSha256`.
4. H4, endurance dwu- i ośmiogodzinna, PMU/powerbank/SD pozostają odroczone i
   **nie wolno ich przedstawiać jako zaliczonych**.

## Zasięg

Licznik pobrań (`os/count.php`) 2026-07-21: **88** pobrań artefaktu. Strona
udostępnia też flashowanie z przeglądarki przez esp-web-tools, więc próg wejścia
jest niski, a odbiorcy nie są znani z nazwy.

Konsekwencja praktyczna: każda kolejna zmiana artefaktu publicznego jest
operacją T3-high wobec istniejącej bazy instalacji, a nie zmianą prywatną.
