# Wydanie 0.2.1 — noty wydania i znane ograniczenia

[English version](116-release-0-2-1.en.md)

Open Radio 0.2.1 to aktualne publiczne wydanie: hotfix 0.2 z tego samego
wieczora (2026-07-22), który w kilka godzin naprawił dwa pierwsze zgłoszenia
z terenu.

## Co zmieniło 0.2.1

1. **Fabrycznie świeże urządzenia nie zapętlają się na starcie.** Przy
   pierwszym uruchomieniu system plików SPIFFS formatował się synchronicznie
   w `setup()` pod 30-sekundowym watchdogiem; wolniejsze kości flash nigdy
   nie kończyły. Format działa teraz na tle, na tasku logo — poza watchdogiem
   i poza torem audio — a nieudany format degraduje do monogramów zamiast
   blokować granie.
2. **Stacje dodane z konsoli nie kończą się błędem HTTP 400.** Część mountów
   katalogu niosła sufiks `#fragment`; sonda po cichu go ucinała, a
   urządzenie wysyłało go w żądaniu. Fragmenty są teraz zdejmowane na każdej
   warstwie (dane katalogu, generator, źródło strumienia, piny testowe), co
   leczy też sloty zapisane przez wcześniejsze wersje.

## Artefakt i pochodzenie

| | |
|---|---|
| Pobieranie | `https://fiedoruk.pl/os/open-radio-0-2-1.bin` (2 448 160 bajtów, offset flash `0x0`) |
| SHA-256 pełnego obrazu | `295ca3fdf9f9daf7a11ee979bc3371b2c79aaf48de5afe455668b72b23dc0546` |
| SHA-256 komponentu app | `98f0477a655cd42db42f6c806c059af9b8c33e6b0cd2eb6cd9b40d5fc1f44555` |
| Cięcie kodu | tag `open-radio-0-2-1` → commit `e4ec0c8d3e8a12407a983f6866e6be9750cfd6a8` |
| Manifest kanoniczny | `release/release-0-2-1.json` |
| Odpowiadające źródła | opublikowane obok binarki; patrz `REPRODUCIBILITY.pl.md` |

Tag jest niezmiennym **cięciem kodu**. Metadane wydania zapisane po tagu
(wpisy rejestru, notatki o potwierdzeniu z terenu, ten dokument) celowo żyją
w późniejszych commitach; manifest kanoniczny powyżej wiąże jedno z drugim.
Reprodukcję co do bajta i jej trzy wymagane parametry builda opisuje
`REPRODUCIBILITY.pl.md`.

## Dowody sprzętowe

- Smoke z dnia wydania na Core2 v1.0 właściciela: PASS (poświadczenie
  właściciela).
- Niezależne potwierdzenie z terenu: zewnętrzny użytkownik zainstalował
  0.2.1 z przeglądarki na fabrycznie świeżym Core2 v1.1 i zgłosił działanie
  (relacja osoby trzeciej zapisana przez właściciela). Obie rewizje sprzętu
  mają więc dowody z terenu.

## Znane ograniczenia

1. Wsparcie Bluetooth jest standardowe: Classic A2DP/SBC — nie uniwersalne.
   Głośniki wyłącznie LE-Audio są poza kontraktem sprzętowym Core2.
2. Czas na baterii zmierzony przez właściciela na urządzeniu (2026-07-23):
   około 2,5 godziny typowego grania, przy sprzyjających warunkach blisko
   trzech (pobór ~140 mA, w szczytach ~190 mA; przyciemnienie ekranu zmienia
   niewiele). Kwalifikacja endurance i długich biegów 0.2.1 pozostaje otwarta.
3. Strumienie stacji i endpointy nadawców mogą zmieniać się niezależnie od
   jakiegokolwiek wydania firmware.
4. Pobieranie logotypów stacji jest opcjonalne i w tym wydaniu tylko PNG;
   kilka pozycji katalogu wystawia ikony JPEG i spada na monogramy.
5. Znane ryzyka implementacyjne są zaplanowane na wydanie serwisowe 0.2.2
   bez ruszania 0.2.1: niesynchronizowana publikacja logo między rdzeniami
   (formalnie zachowanie niezdefiniowane; praktyczny skutek ograniczony do
   pominiętej klatki przez publikację write-once i osłony renderera),
   walidacja celu redirectów przy pobieraniu ikon, bezwarunkowy prefetch
   discovery RMF oraz osadzone w obrazie stringi ścieżek builda i fixtur.
6. Lista przeglądania w portalu wyboru stacji renderuje pierwszych 80
   wierszy; wyszukiwarka obejmuje cały katalog (licznik wierszy pokazuje
   prawdziwą sumę). Wydanie serwisowe zniesie limit przeglądania i przysunie
   wyszukiwarkę do jej wyników.
7. Brak OTA: aktualizacja to jawna lokalna operacja USB, a instalacja nowego
   wydania uruchamia konfigurację od nowa.
8. Zero kont, telemetrii i zaplecza projektu; pełne klasy ruchu wychodzącego
   wymienia `NETWORK-ENDPOINTS.md`.
