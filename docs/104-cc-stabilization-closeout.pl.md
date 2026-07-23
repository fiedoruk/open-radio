# 104 — Zamknięcie stabilizacji CC i bieżąca prawda bazowa (2026-07-17)

English version: [104-cc-stabilization-closeout.en.md](104-cc-stabilization-closeout.en.md)

**Ten dokument zastępuje instrukcje wznowienia i modele rezerw audio z
docs/99, docs/100 i docs/103.** Każdy wcześniejszy dokument, który podaje
rezerwę fallbacku 147 456 ramek, cel standby „siedem ósmych ringu", bramkę
retry na pełne 262 144 ramki albo kandydatów `729444cc`/`0d62d10b`/`0c673848`
jako „bieżących", opisuje stan zastąpiony. Gdy dokumentacja i kod się różnią,
wygrywają komentarze w `public_audio_pipeline.hpp` i `main.cpp`.

## Stan zaakceptowany przez właściciela

- Linia kandydatów urządzenia: `88561ba7` (zaakceptowany baseline) i następcy
  na tym samym modelu rezerw, lane `core2-hardware-lab`; każdy flashowany
  obraz jest archiwizowany w `output/flashed/<sha256>.bin`.
- Historyczny LKG `729444cc…` (odzyskany ze snapshotu APFS po utracie —
  wewnętrzny zapis odzyskania binarki) to artefakt awaryjny ze STAREJ ery
  progów, nie punkt powrotu pierwszego wyboru.
- Podstawa werdyktu: capture `output/hardware-soaks/2026-07-17T*` — zero
  lokalnych zagłodzeń, zero watchdogów poza realnym padem baterii głośnika,
  powrót po cyklu głośnika do mediów w 20,8 s, odsłuchy właściciela.

## Fizyka, którą musi respektować każda przyszła zmiana

Po burście CDN live-stream dostarcza dokładnie 1× czasu rzeczywistego, więc
podczas grania `decoded + kolejka BT` nigdy nie przekroczy równowagi burstu
(~98 304 ramek zmierzone; zależne od stacji). Głębokie bufory sprzed
2026-07-17 finansował monolityczny decode-slurp, który zamrażał pętlę
właściciela (martwy dotyk). Konsekwencje, utrwalone w kodzie:

| Mechanizm | Wartość | Gdzie |
|---|---|---|
| Budżet dekodera na przebieg pętli | 8 192 ramki | `DecoderQueueOutput::ConsumeSample` |
| Podłoga rezerwy lokalnego fallbacku | 44 100 ramek (1 s) | `kBluetoothFallbackReserveFrames` |
| Cel standby (przed mediami) | 88 200 ramek (2 s) | `kBluetoothStandbyReadyFrames` |
| Bramka retry (decoded) | 44 100 ramek (1 s) | `kBluetoothRetryDecodedReserveFrames` |
| Kadencja recovery | losowe 8–20 s (jitter ZAMIERZONY) | `kBluetoothRecoveryMin/MaxDelayMs` |
| Watchdog brudnego dialu | 6 500 ms, lokalny fallback, await stack | `kBluetoothDirtyAttemptAbortMs` |
| Ciemność page-scanu na czas dialu | connectable(false) przy każdym dialu | override `set_scan_mode_connectable_default` |

Root-cause zamknięte 2026-07-17: monolityczny decode-refill (śmierć dotyku),
stale-page-timeout ubijający sesje wygrane przez inbound ~5,13 s po starcie
dialu oraz bramki rezerw ustawione ponad równowagą burstu (dial odraczany
minutami). Szczegóły: wewnętrzne raporty inżynierskie (poza repo) oraz
komentarze w kodzie — są samowystarczalne.

## Również bieżące

- „Teraz gra → Zapisz" działa na każdej stacji: tytuł jest seedowany nazwą
  stacji przy selekcji, prawdziwy ICY StreamTitle go nadpisuje.
- Picker stacji ma kafle w kolorach marek z kwadratowym slotem logo; lane
  hardware-lab może wbudować pieczony multi-size pack logotypów
  (`OPEN_RADIO_HAS_LOGO_PACK`); lane publiczny zostaje przy placeholderach
  z inicjałem i `bundled_artwork=0`.
- Boot drukuje `boot build_sha=` (powtarzany z każdym raportem okresowym)
  i `boot reset_reason=` — oba na allowliście capture.
- Wyszukiwanie głośnika akceptuje po Class-of-Device (RENDERING|AUDIO) w
  jawnym skanie użytkownika; allowlisty nazw modeli nie ma.
- Feature pobierania artworku stacji usunięty w S26 na polecenie
  właściciela; zastępuje go pieczony logo-pack powyżej.

## Obowiązujące reguły procesu

Jedna zmiana → pełna bramka → flash (auto-archiwum) → capture 300 s z
max-loop < 1,5 s poza zmianami stacji, zero zagłodzeń, zero watchdogów,
odsłuch właściciela. Zero nowych funkcji do zamknięcia H4. Hook archiwizacji
i katalog LKG są nietykalne.
