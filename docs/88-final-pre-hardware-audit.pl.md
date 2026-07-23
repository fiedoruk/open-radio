# 88 — Finalny audyt przed sprzętem

[English version](88-final-pre-hardware-audit.en.md)

**Data:** 2026-07-14

**Werdykt software:** `PASS WITH RISKS`

**Werdykt urządzenia fizycznego:** `BLOCKED UNTIL H0-H4 EVIDENCE`

## Co jest już realne

- Emulator pokazuje jeden nieskalowany framebuffer RGB565 320×240 generowany
  przez ten sam renderer C++, który jest linkowany do firmware. Używa
  wbudowanego atlasu OFL Inter 600; nie ma już serifowego fallbacku ani
  pobierania fontu w runtime.
- Pełny i minimalistyczny ekran główny zapisują się i realnie zmieniają. Usunięto
  stare dekoracyjne paski po lewej stronie kart. Metadata utworu, ulubione,
  cztery wygaszacze z Kiarą, jasny/ciemny motyw i ekran OFF pozostają lokalne.
- Aktywne hitboxy mają co najmniej 44 px. Gesty są ograniczone, a trzy wirtualne
  przyciski Core2 działają jako A poprzednia, B stacje/dom i C następna. JavaScript
  i C++ są zgodne w 7 scenariuszach i 53 snapshotach.
- Pusta pamięć uruchamia lokalny portal WPA2 `OpenRadio-Setup` z losowym kodem na
  każdy boot, pokazanym na ekranie urządzenia. Portal pokazuje sieci 2.4 GHz,
  odrzuca otwarte cele, zapisuje zatwierdzone dane tylko w NVS urządzenia i
  wybiera najsilniejszy dostępny zapamiętany profil z ograniczonym retry.
- RMF FM, Radio ZET, Złote Przeboje, Chillizet i RMF MAXX mają wykonywalne ścieżki
  MP3. Resolver RMF uwierzytelnia oficjalne API certyfikatem root CA. Udane
  endpointy runtime są cache'owane wyłącznie lokalnie jako last-known-good.
- Głośnik wbudowany jest pierwszym wyjściem. Skan A2DP startuje po decyzji
  użytkownika i akceptuje zapamiętaną nazwę albo modele Xiaomi Sound Pocket /
  MOZOS Outdoor-Xtreme. Utrata połączenia przełącza na wyjście lokalne.

## Geometria mockupu urządzenia

Na dostarczonym zdjęciu 1000×1000 zmierzono około 602×599 px dla zewnętrznego
frontu oraz 450×335 px dla aktywnego ekranu. Aktywny ekran zajmuje więc około
74,8% szerokości i 56,0% wysokości korpusu, co odpowiada panelowi 40,32×30,24 mm
320×240 w froncie Core2 54×54 mm. Emulator używa obudowy 429×429 px wokół
dokładnego canvasa 320×240, a trzy pola umieszcza przy około 25%, 50% i 75%
szerokości. To waliduje proporcje, nie fizyczne milimetry na dowolnym monitorze.

## Czego software nie udowodni

- Kalibracji FT6336U, czułości przy krawędziach szkła, jasności panelu, wyglądu
  RGB565, kątów widzenia i czytelności na fizycznym ekranie dwóch cali.
- Fragmentacji heapu, największego bloku, opóźnień PSRAM, high-water marków
  stosów, underrunów dekodera ani blokad schedulera podczas TLS i timeoutów.
- Coexistence Wi-Fi/A2DP, czasu reconnectu i zgodności SBC z oboma głośnikami
  ownera. Bluetooth LE Audio-only pozostaje poza zakresem.
- Integralności audio przez operatorski redirect HTTP MP3, endurance 60 minut / 8
  godzin, battery bridge, przerwy zasilania i recovery uszkodzonej konfiguracji.
- TOK FM: transport MP3 istnieje, ale parser oficjalnego playera nadal czeka.
  VOX FM, Radio ESKA i ESKA Impreska pozostają bez wsparcia HLS/HE-AAC.

## Pierwsza sesja sprzętowa

1. Uruchomić czystą bramkę hostową i zidentyfikować dokładny port oraz flash 16 MiB.
2. Po osobnej zgodzie ownera odczytać i zahashować pełny obraz fabryczny; nie
   kasować urządzenia.
3. Wgrać tylko pełny tor public-candidate i sprawdzić ekran, atlas Inter, transform
   dotyku, A/B/C, jasność, głośność oraz dźwięk z głośnika wbudowanego.
4. Połączyć się z `OpenRadio-Setup` kodem WPA2 z ekranu, dodać jedną zabezpieczoną
   sieć 2.4 GHz i udowodnić pierwszy dźwięk RMF FM, zapis po restarcie oraz
   recovery Wi-Fi/stream.
5. Sparować Xiaomi, potem MOZOS; udowodnić reconnect, lokalny fallback i powrót
   do Bluetooth bez podwójnego wyjścia.
6. Wykonać smoke 15 minut, obowiązkową bramkę 60 minut, potem soaki 2 i 8 godzin.
   Zapisać heap, stosy, underruny, retry, reset reason i zachowanie zasilania.

Szczegółowa bezpieczna procedura pozostaje w
`docs/75-hardware-arrival-handoff.pl.md`. Ten audyt software nie zezwala na
flash, release ani deklarację uniwersalnej zgodności.
