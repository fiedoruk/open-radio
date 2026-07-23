# 113 — Wydanie 0.2

[English version](113-release-0-2.en.md)

**Cel:** kanoniczne zamknięcie publicznego wydania 0.2 (2026-07-22)
**Obejmuje:** co weszło, wady dnia wydania z dowodami, łańcuch artefaktów
i co pozostaje otwarte
**Nie autoryzuje:** dalszych zapisów na urządzeniu ani zmian artefaktów

## Co weszło

| | |
|---|---|
| Artefakt | `https://fiedoruk.pl/os/open-radio-0-2.bin` (2 447 808 B) |
| SHA-256 | `87384342c32c2c7e1edd6ffaeb193d34d75ae01e1abb4db5dd9f7abd0ca6db62` |
| Źródło | tag **`open-radio-0-2`** → `358b13d` (tor `core2-public-candidate`) |
| Licencja | GPL-3.0-or-later + written offer (`os/LICENSE-0-2.txt`) |
| Źródła pod offer | `dist/open-radio-0-2-corresponding-source.tar.gz` (+ `.sha256`) |
| Pochodzenie | `output/firmware/public-0-2/MANIFEST.json` |
| Instalacja | przeglądarka (esp-web-tools, dialog po polsku) albo esptool, pełny obraz od `0x0` |

0.2 względem 0.1: katalog 218 zmierzonych stacji jako dane z automatyczną
rotacją endpointów, logotypy stacji pobierane przez samo urządzenie,
konsola stacji w przeglądarce z kodem QR na kostce, jeden obraz dla
właściciela i klientów, bezpośredni reconnect Wi-Fi, start radia przed
wszystkim innym, picker dziewięciu kafli i powiększona karta statusu.
Pełna architektura: `docs/109`–`112`, `decisions/ADR-010`.

## Dzień wydania, uczciwie

Tag przesunął się dwa razy po pierwszym cięciu — oba razy przed szerszym
ogłoszeniem i oba razy przez wady udowodnione serialem:

1. **`reason=alloc`** — każde pobranie ikony prosiło o 256 KB ciągłej
   PSRAM; obok żywego strumienia fragmentacja odmawia tego po około dwóch
   pobraniach, na stałe. Naprawa: jeden bufor 96 KB alokowany w `begin()`,
   zanim bufory audio potną PSRAM.
2. **Redirecty i ciasne okna TLS** — favicony nadawców odpowiadają
   301/302, za którymi fetch nie podążał, a 2-sekundowe okna TLS dobijały
   wolniejsze fronty CDN. Naprawa: fetch na własnym zadaniu o niskim
   priorytecie na drugim rdzeniu, z szerokimi oknami i redirectami.
3. **`reason=decode`** — upscale w LovyanGFX odrzucał jedyną zdrową ikonę
   MNIEJSZĄ niż kafel 96 px (Meloradio, 57×57). Naprawa: dekodowanie
   natywne dla źródeł ≤256 px + to samo całkowitoliczbowe przepróbkowanie
   cover, którego używa renderer.

Finalny werdykt sprzętowy, złapany serialem na bicie wydania podczas
własnego przejścia właściciela: **dziewięć logotypów na dziewięć w jednym
passie**, start strumienia 1,2 s od inicjalizacji, zero underrunów wejścia,
głośnik Bluetooth połączony w 3,1 s.

Zamknięte tego dnia również: dwie minuty ciszy po boocie (jedyny profil
Wi-Fi maskował sam siebie po jednym timeoucie asocjacji — teraz: direct
connect bez skanu, ucięcie odrzuconej asocjacji po 6 s, druga szansa
przed maską); portal konfiguracyjny wygasający na niesprowizjonowanej
kostce bez drogi powrotu z ekranu (teraz: przed prowizjonowaniem nie
wygasa nigdy); sesja konsoli żyjąca po zamknięciu karty przeglądarki
(teraz: heartbeat strony, zamknięcie wyborem stacji i przyciskiem).

## Otwarte po wydaniu

- **Soak B1** (okna właściciela): długie granie z przełączaniem stacji na
  obrazie wydania, odczyt realnego sufitu z `input_bytes` i dwie rzeczy do
  obserwacji z logów dnia — zapas DRAM przy dzwonieniu Bluetooth
  (największy blok spadał do ~5 KB) oraz kadencja ponowień w oknie
  parowania.
- **Angielska strona instalatora** ma zaktualizowane odwołania do
  artefaktu, ale nie przebudowany układ wersji polskiej.
- Pliki `rc*-retired.bin.bak` odstawione w `os/` na serwerze.
- Tor `core2-onboarding-only` nie buduje się (zastane, poza ścieżką
  wydania).

## Odniesienia

- `docs/107` — wydanie 0.1 (wzorzec, za którym idzie to wydanie)
- `docs/109`–`112` — cztery fazy 0.2
- `decisions/ADR-010` — logotypy runtime i pozycja prawna
