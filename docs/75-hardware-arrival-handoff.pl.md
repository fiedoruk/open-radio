# 75 — Handoff na dzień dostawy sprzętu

[English version](75-hardware-arrival-handoff.en.md)

**Status:** historyczne przekazanie sprzed dostawy; sprzęt już dotarł. Bieżącą
prawdę utrzymują `STATUS.md` i `CURRENT-MISSION.md`.

**Pierwotny warunek wznowienia fizycznego:** Tomasz ma M5Stack Core2 w ręku

**Twarda granica:** bez osobnej zgody ownera opisanej w
`docs/49-first-build-flash-rollback-proposal.md` nie uruchamiamy serialu, odczytu
fabrycznego ani flashowania

## Co przygotować

- M5Stack Core2, pewny kabel USB-C z transmisją danych i docelowy power bank.
- Xiaomi Sound Pocket `MDZ-37-DB` i MOZOS Outdoor-Xtreme; przed testem spisać z
  etykiety dokładny model/rewizję MOZOS.
- Mac z tym prywatnym repo i prywatnym miejscem na pełny obraz fabryczny 16 MiB
  oraz dowody.
- Jeden zatwierdzony profil Wi-Fi 2.4 GHz. Nigdy nie commitować haseł, MAC,
  BSSID, prywatnych endpointów ani obrazu fabrycznego.

## Bezpieczny start

```bash
# Uruchom w katalogu głównym repozytorium.
git pull --ff-only
npm run check
git status --short
```

Przerwać, jeśli host gate nie jest zielony albo drzewo nie jest czyste. Przed
podłączeniem urządzenia przeczytać `docs/48-hardware-arrival-validation-matrix.md`
i `docs/49-first-build-flash-rollback-proposal.md`.
Każda akcja serial/flash przechodzi przez `scripts/core2-device-action.sh`; nie
zastępujemy guardu doraźnymi komendami uploadu.

## H0 — identyfikacja i zabezpieczenie

Po osobnym potwierdzeniu T3 przez ownera:

```bash
export PORT=/dev/cu.usbserial-REPLACE_ME
export ESP32_ALLOW_DEVICE_ACTION=1
scripts/core2-device-action.sh preflight
scripts/core2-device-action.sh backup
```

1. Sprawdzić obudowę, etykietę płytki, kabel USB i port szeregowy.
2. Uruchomić przygotowane `pio device list`, `esptool chip_id` i
   `esptool flash_id`; przerwać przy każdej niejasności portu, układu lub flash
   16 MiB.
3. Przed pierwszym zapisem odczytać pełny obraz fabryczny `0x1000000`.
4. Potwierdzić dokładnie `16777216` bajtów i prywatnie zapisać SHA-256.
5. Sprawdzić komendę rollbacku dla tego samego portu i hasha backupu.

Nie kasować urządzenia. Nie flashować, dopóki dowody H0 i rollback nie są
jednoznaczne oraz Tomasz nie potwierdzi proponowanego zapisu.

## H1 — smoke płytki

Budować wyłącznie wybrany tor public-candidate, a przed flashem zapisać i
sprawdzić dokładny manifest obrazu oraz użyć rejestrowanej ścieżki `flash-image`.
Sprawdzić orientację
i clipping ekranu, rogi/środek/touch targety 44 px, kolory RGB565, jasny i ciemny
motyw, poziomy jasności, deterministyczny atlas Inter 600, wbudowany głośnik, battery
bridge oraz recovery konfiguracji A/B. Potwierdzić po restarcie język, głośność,
jasność, motyw i wybraną stację.

Po zaliczeniu H0 i potwierdzeniu zapisu przez Tomasza:

```bash
export CONFIRM_FLASH=YES
export IMAGE_PATH=/absolute/path/to/output/flashed/REVIEWED_SHA256.bin
export EXPECTED_SHA256=64-lowercase-reviewed-hex-characters
export IMAGE_PURPOSE=CURRENT_CANDIDATE
scripts/core2-device-action.sh flash-image
```

Bezpośrednie skróty `flash` i `flash-lab` są wyłączone. Sprawdzony obraz musi
już istnieć w `hardware/approved-app-images.json` z bieżącą powierzchnią
produktu i właściwym celem zapisu.

Powtarzalny reset, nieczytelny ekran, zły touch transform, brak fallbackowego
głośnika albo brak recovery znanej dobrej konfiguracji zatrzymuje sesję i
uruchamia przegląd rollbacku.

## H2 — radio lokalne i recovery

Połączyć się z tymczasową siecią `OpenRadio-Setup` losowym kodem WPA2 pokazanym
na urządzeniu, otworzyć lokalny captive portal i dodać jeden zatwierdzony
zabezpieczony profil 2.4 GHz. Odtworzyć RMF FM
przez głośnik wbudowany, sprawdzić zapis po restarcie i potwierdzić, że TOK FM
oraz trzy stacje HLS pozostają jawnymi stanami niewspieranymi. Najpierw zrobić
15-minutowy smoke, potem wymagane 60 minut z wymuszoną utratą streamu i Wi-Fi.
Urządzenie ma wrócić bez rebootu, nigdy nie dołączać do nieznanej/otwartej sieci
i pokazywać HLS jako niewspierany zamiast udawać odtwarzanie.

## H3 — głośniki Bluetooth

Na lokalnym ekranie Bluetooth uruchomić jawny skan. Najpierw test Xiaomi, potem
MOZOS jako Bluetooth Classic A2DP Sink/SBC. Zapisać
wynik parowania, reconnect z pamięci, czas reconnectu, wymuszone rozłączenie,
fallback na głośnik Core2, powrót do Bluetooth oraz coexistence Wi-Fi/A2DP.
AVRCP nie może być wymagane, a podwójny output nie może wystąpić. Publiczna
deklaracja pozostaje „zgodność oparta o standard A2DP”, nigdy „działa z każdym
głośnikiem”.

## H4 — endurance i zakończenie

Soak uruchamiać dopiero po zaliczeniu poprzedniego etapu: 60 minut lokalnie,
2 godziny Bluetooth z recovery Wi-Fi, 8 godzin z power bankiem i power cycle
głośnika, a 24 godziny dopiero dla kwalifikacji release candidate. Zbierać heap,
największy blok, PSRAM, stack high-water marks, underruny, queue overruns,
reconnecty i reset reason.

Na koniec sesji zaktualizować `hardware/speaker-qualification-matrix.json`,
pakiet dowodów hardware, `STATUS.md`, `CURRENT-MISSION.md` i registry portfolio.
Publiczny release pozostaje osobną bramką nawet po zaliczeniu H0–H4.

## Sukces pierwszej sesji

Pierwsza sesja fizyczna jest udana, gdy przejdą backup/rollback H0 i smoke H1
albo gdy precyzyjnie zapiszemy ograniczony blocker bez utraty obrazu fabrycznego.
H2–H4 mogą trwać w kolejnych sesjach; nie skracamy soak ladder tylko po to, by
uzyskać wynik release tego samego dnia.
