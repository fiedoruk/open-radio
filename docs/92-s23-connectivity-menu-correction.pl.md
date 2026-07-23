# S23 — korekta menu łączności

## Werdykt — wdrożone

Przeglądarka nie ma dostępu do radia Wi-Fi ani Bluetooth Classic A2DP w Core2,
więc discovery RF pozostaje symulowane. S23 zamyka rzeczywiste luki w połączeniu
GUI z runtime bez udawania, że symulacja RF jest walidacją fizycznego sprzętu.

## Wprowadzone korekty

- CTA połączonego Wi-Fi przełącza lokalny portal `OpenRadio-Setup`. Tryb AP+STA
  zachowuje bieżące połączenie z zatwierdzoną siecią i dźwięk; portalu nie można
  wyłączyć, gdy urządzenie nie ma połączenia stacyjnego.
- Aktywny ekran portalu pokazuje `OpenRadio-Setup`, wygenerowany lokalny kod
  WPA2 oraz akcję zamknięcia. Dane dostępowe nie trafiają do logów ani Gita.
- Trasy portalu przyjmują klientów tylko przez interfejs punktu dostępowego
  Core2; klient istniejącej sieci LAN otrzymuje `403`. Nieudany start AP nie
  jest pokazywany jako aktywny i można go ponowić.
- Nowe dane Wi-Fi pozostają w ulotnej pamięci oczekującej, dopóki ESP32 nie
  potwierdzi połączenia. Dopiero wtedy wszystkie profile są zapisywane jako
  jeden ograniczony blob NVS z sumą kontrolną. Błędny profil jest pomijany, aby
  urządzenie mogło odzyskać połączenie przez inną znaną sieć.
- Drugie wysłanie formularza jest odrzucane podczas trwającej próby połączenia.
  Błąd zapisu NVS pozostawia onboarding otwarty zamiast restartować urządzenie
  z konfiguracją, która nie potrafi się ponownie połączyć.
- Bluetooth używa jednego modelu bezczynny/skanowanie/znaleziono/łączenie/
  połączono/błąd w JavaScript, kontrolerze C++ i rendererze RGB565.
- Ponowny skan użytkownika prawidłowo zatrzymuje przypiętą wersję implementacji
  A2DP, natychmiast wybiera lokalny głośnik i ponownie uruchamia wyszukiwanie.
  Po przekroczeniu czasu skan można ponowić.
- Ograniczona kolejka FreeRTOS o jednym wpisie przenosi nazwę wybranego
  kandydata z zadania callback Bluetooth do pętli właściciela UI.
- Nazwa głośnika i flaga zapamiętania są zapisywane dopiero po callbacku
  połączenia. Stany znaleziono, łączenie i błąd niczego nie zapisują.
- Limit czasu obejmuje wyszukiwanie oraz próbę połączenia po znalezieniu;
  opóźniony timer UI nie może nadpisać stanu już połączonego.
- Brakująca lub nieprawidłowa tożsamość zapamiętanego głośnika jest naprawiana
  do stanu bezczynnego; firmware i emulator nie zapamiętują połączenia bez nazwy
  urządzenia.
- Symulacja RF przeglądarki ma etykietę `RF demo` poza framebufferem urządzenia
  i deterministyczne przejścia bez udawania dostępu do radia hosta.

## Weryfikacja

- Skupione testy łączności/GUI: PASS.
- Parity kontrolera JS/C++: 8 scenariuszy i 61 snapshotów, PASS.
- Testy host firmware: 4 + 27 + 24 + 18 + 17 + 10 przypadków/wektorów, PASS.
- Renderer: 17 przypadków, 28 ekranów i 112 wariantów motyw/język, PASS.
- Deterministyczny firmware: dwa zgodne buildy, PASS.
- `firmware.bin`: 2 281 136 bajtów; SHA-256
  Historyczny hash S23: `664762412ebbf840a7cb9051defcc216d1e8e82d8b473f5e4cd3c75296de6a3c`.
  Finalny kandydat operacyjny jest zapisany w `release/rc1-candidate.json`.
- Statyczny RAM: 116 260 bajtów z 4 521 984; flash aplikacji: 2 274 557
  bajtów z 6 553 600.
- GitHub Actions: wymagane dla wypchniętego commita S23.

## Granica

Ta korekta software nie obejmuje prawdziwego hasła Wi-Fi, parowania Bluetooth,
dostępu szeregowego, flashowania, publikacji ani deklaracji kompatybilności.
Fizyczny dotyk, współistnienie RF i reconnect pozostają pomiarami H1–H3.
