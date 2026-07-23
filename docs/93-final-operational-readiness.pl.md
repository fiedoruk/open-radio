# 93 — Finalna gotowość operacyjna

[English version](93-final-operational-readiness.en.md)

**Data:** 2026-07-15

**Snapshot historyczny:** bieżącą prawdę hardware-lab zapisano w
[docs/104](104-cc-stabilization-closeout.pl.md) i
[docs/105](105-final-gift-build-and-qc9-closeout.pl.md).

**Werdykt software:** `FINALNY OBRAZ WGRANY — HOST GATE PASS`

**Werdykt sprzętowy zapisany 2026-07-15:** `CZĘŚCIOWY PASS`

## Domknięte przed dostawą sprzętu

- Lokalny portal ma per-boot kod WPA2 o entropii 48 bitów, osobny per-boot token
  żądania i powiązanie klienta z interfejsem AP.
- Firmware przechowuje do ośmiu zatwierdzonych profili Wi-Fi i migruje starszy
  blob czteroprofilowy bez zgadywania ani utraty poprawnych wpisów.
- Zapamiętany głośnik Bluetooth jest wiązany z adresem urządzenia; sama nazwa
  nie wystarcza już do automatycznego reconnectu.
- Tor MP3 zatrzymuje nieobsługiwaną częstotliwość lub liczbę kanałów zamiast
  cicho odtwarzać w złym tempie. Bufor wejściowy 32 KiB jest alokowany raz,
  preferencyjnie w PSRAM, i używany ponownie po retry.
- Pełny build kończy się błędem kompilacji bez software coexistence Wi-Fi/BT.
- Późniejsza korekta właściciela podczas H1 tymczasowo przywróciła jedną jawną
  akcję pobierania logotypów. S26 usunęło ten runtime na polecenie właściciela;
  bieżący lane hardware-lab korzysta z build-time logo-packu opisanego w docs/104.
- Finalna korekta audio przygotowuje około 186 ms PCM między dekoderem i dwoma
  slotami M5, zachowuje niepełne bloki oraz raportuje głodzenie lokalnej
  kolejki bez identyfikatorów urządzenia i sieci.
- Adapter pogody opisany w tym datowanym snapshotcie został później usunięty z
  bieżącego firmware i UI na polecenie właściciela.
- Wspólny cache toolchainu pozostaje poza projektem, a lokalne `.venv/` jest
  ignorowane.

## Kontrolowana procedura finalna

Jedynym wejściem jest `scripts/core2-device-action.sh`. Skrypt wymaga
`ESP32_ALLOW_DEVICE_ACTION=1`, istniejącego potwierdzonego portu `/dev/cu.*` oraz
drugiego potwierdzenia przed flash lub rollbackiem. Odmawia nadpisania backupu
fabrycznego, sprawdza dokładne 16 MiB i SHA-256 oraz nie zawiera komendy erase.

Identyfikacja H0, prywatny backup fabryczny i sprawdzenie rollbacku przeszły.
Pełny host gate, jawny finalny flash i weryfikacja każdego segmentu też
przeszły; krótka zredagowana obserwacja boot nie pokazała panic ani reset loop.
Pozostaje inspekcja H1 właściciela. Dokładne komendy i warunki STOP są w
`docs/75-hardware-arrival-handoff.pl.md`.

## Jawne pozostałe bramki

- Ekran, touch i odtwarzanie lokalne mają częściowy dowód fizyczny; finalny test
  audio bez przerw oraz PMU/bateria i SD pozostają w H1.
- Live MP3, recovery Wi-Fi/stream i endurance 60 minut są H2.
- Interoperacyjność Xiaomi i MOZOS A2DP/SBC, reconnect po dokładnym adresie,
  lokalny fallback oraz RF coexistence są H3.
- Pomiary heap/PSRAM/stack/underrun i endurance 8 godzin są H4.
- Pierwszy bring-up DIY nie włącza nieodwracalnych eFuse secure boot/flash
  encryption. Nie deklarujemy poufności wobec fizycznego dostępu; hardening to
  osobna decyzja ownera po H0.
- Publiczny kontakt bezpieczeństwa i publiczny release pozostają osobnymi
  bramkami wydania i nie blokują prywatnego bring-up H0/H1.

## Decyzja operacyjna

Ten datowany dokument nie wyznacza bieżącej gotowości. Robią to docs/104 i
docs/105; żadna bieżąca bramka nie zależy od pogody ani pobierania logotypów
stacji w runtime.
