# 101 — Minimalny reset łączności i brandu

English version: [101-minimal-connectivity-and-brand-reset.en.md](101-minimal-connectivity-and-brand-reset.en.md)

**Data decyzji:** 2026-07-16
**Zakres:** implementacja public-candidate; fizyczny flash zapisano osobno w
raporcie 102

## Wynik

Następny kandydat usuwa modelowe reguły discovery Bluetooth i runtime
logotypów stacji. Przywraca użyteczne Ulubione, dodaje automatyczne wyszukanie
pierwszego głośnika, natychmiastową zmianę QR, pełne kasowanie danych lokalnych
oraz provisioning przyszłego hotspotu z tego samego telefonu. Istniejące
bufory, routing i progi reconnectu audio pozostają zamrożone.

## Głośniki Bluetooth

Po ustabilizowaniu Wi-Fi, lokalnego radia i buforów Bluetooth uruchamia się
automatycznie. Zapamiętany adres ma zawsze pierwszeństwo. Gdy nie ma
zapamiętanego urządzenia, kostka sama wyszukuje wyniki Bluetooth Classic
reklamujące audio/rendering w Class of Device, próbuje pierwszego zgodnego
wyniku i zapamiętuje adres dopiero po starcie mediów A2DP. Nieudane pierwsze
discovery jest ponawiane w ograniczonym interwale jednej minuty, a głośnik
lokalny gra pomiędzy próbami. Ręczny skan pozostaje wyłącznie akcją recovery lub
zmiany głośnika. Żadna ścieżka nie dopasowuje nazw Xiaomi, MOZOS ani Soundcore;
brak nazwy dostaje neutralną etykietę lokalną.

To discovery oparte na standardzie, nie obietnica uniwersalnej zgodności. Każdy
dokładny głośnik nadal wymaga fizycznej kwalifikacji A2DP/SBC, głośności,
fallbacku i reconnectu. Soundcore deklaruje dla Boom Go 3i kodeki SBC i AAC;
SBC czyni go właściwym kandydatem dla kontraktu ESP32. Oficjalna strona podaje
także 15 W, 24 h pracy oraz wyjście powerbanku 4800 mAh. Te deklaracje dostawcy
pozostają niezweryfikowane do testu dostarczonej sztuki.

## Ulubione

Główna część wiersza Ulubionych wybiera teraz stację zapisanej pozycji, czyści
starą metadaną, zapisuje wybór stacji i wraca do ekranu grania. Chevron nadal
otwiera szczegóły i dwuetapowe usuwanie. Zapis pozostaje lokalny, deduplikowany,
ograniczony do 32 pozycji i commitowany przez istniejące repozytorium A/B NVS.

## Zmiany Wi-Fi

Gdy portal konfiguracji jest aktywny, lewa akcja stopki zatrzymuje i ponownie
uruchamia lokalny AP, tworząc nowe losowe hasło WPA2, token CSRF i payload QR.
Prawa akcja zamyka go tylko wtedy, gdy radio jest już online.

Dla telefonu, który sam ma później zostać hotspotem:

1. Hotspot telefonu pozostaje wyłączony, a telefon łączy się z `OpenRadio-Setup`.
2. Użytkownik wybiera ręczne dodanie przyszłego hotspotu i wpisuje zabezpieczony SSID/hasło.
3. Radio trzyma dane tylko w RAM i pokazuje stan oczekiwania.
4. Telefon rozłącza się z AP konfiguracji i włącza własny hotspot.
5. Radio próbuje przez maksymalnie dwie minuty i zapisuje profil dopiero po
   rzeczywistym zabezpieczonym połączeniu.

Widoczne sieci otwarte nadal są odrzucane, a automatyczne połączenia pozostają
ograniczone do wcześniej zatwierdzonych, zabezpieczonych profili.

## Automatyczne zapamiętywanie i pełny reset lokalny

Radio przechowuje do ośmiu zatwierdzonych, zabezpieczonych profili Wi-Fi i samo
wybiera osiągalną znaną sieć. Zapamiętuje także adres rzeczywiście grającego
głośnika Bluetooth, Ulubione, ustawienia UI i ostatni działający stan stacji.

W ustawieniach systemowych jest destrukcyjna akcja `Wyczyść dane`. Pierwsze
dotknięcie uzbraja czerwone potwierdzenie, a drugie kasuje całą domyślną
partycję NVS przed restartem. Usuwa to konfigurację aplikacji, dane dostępowe
Wi-Fi, tożsamość i bonding Bluetooth, Ulubione oraz cache runtime; nie usuwa
firmware ani prywatnego backupu fabrycznego. Następny boot zaczyna lokalny
onboarding od czystego stanu.

## Lokalna tożsamość wizualna

Sieć grafik stacji, manifesty pobierania, dekodowanie, cache i akcje UI zostały
usunięte. Stacje używają tylko oryginalnych dla projektu monogramów, motywów
geometrycznych i lokalnych kolorów. Niebieski Open Radio jest globalnym kolorem
interakcji w obu motywach; kolory stacji pozostają tożsamością treści, a nie
globalnym chrome.

## Stan kwalifikacji

Kontrakty hostowe i build publicznego PlatformIO obejmują nowe źródło. Dokładna
binarka została wgrana strzeżoną ścieżką i przeszła krótki automatyczny smoke
od bootu do A2DP. Nadal potrzebne są cykle reconnect 3/3 i bramka 60 minut;
granice pomiaru zapisuje raport 102.

Dwa czyste buildy publiczne są identyczne bajt w bajt. SHA-256 firmware to
`ac3bda385a1300558463f1a31ddae1ddcadf062a95595fef80164aa85f583950`, a
binarka ma 2 232 656 bajtów. Retry połączenia używa ograniczonego jittera 8–20
sekund i nie uruchamia drugiego dialu źródła, zanim niższa warstwa A2DP nie
zamknie callbackiem poprzedniej próby. To dowód powtarzalności; bramki fizyczne
pozostają osobne.

Źródła pierwotne: [opis APSTA ESP-IDF](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/wifi-driver/overview.html), [API Classic GAP ESP-IDF](https://docs.espressif.com/projects/esp-idf/en/v4.4.8/esp32/api-reference/bluetooth/esp_gap_bt.html), [przykład źródła A2DP ESP-IDF](https://github.com/espressif/esp-idf/blob/master/examples/bluetooth/bluedroid/classic_bt/a2dp_source/README.md), [strona Soundcore Boom Go 3i](https://www.soundcore.com/pl/products/d5103-boom-go-3i-portable-speaker-for-powerful-sound) i [FAQ kodeków Soundcore](https://service.soundcore.com/article-description/What-Bluetooth-codecs-does-the-Boom-Go-3i-support).
