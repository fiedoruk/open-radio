# 22 — Kontrakt pierwszej konfiguracji

## Cel

Pierwsze uruchomienie ma zająć około dwóch minut i pytać wyłącznie o informacje,
których urządzenie nie może bezpiecznie zgadnąć. Wszystkie decyzje niezawodności
mają dobre wartości domyślne i nie są formularzem dla użytkownika.

## Zasada pierwszego dźwięku

Wi-Fi jest jedyną blokadą. Po jego zapisaniu radio natychmiast uruchamia pierwszą
stabilną stację na głośniku Core2. Miasto i Bluetooth są proponowane już podczas
grania, więc użytkownik słyszy efekt przed dalszą konfiguracją.

## Trzy pytania

### 1. Wi-Fi — wymagane

Core2 pokazuje lokalny onboarding AP/portal. Użytkownik wybiera sieć 2.4 GHz i
wpisuje hasło w przeglądarce, ponieważ pełna klawiatura na ekranie 320x240 byłaby
wolna i podatna na błędy.

Zapamiętana, zabezpieczona sieć używa prywatnego profilu urządzenia i nie pyta
ponownie o hasło. Otwarta, captive-portal lub nieznana sieć zatrzymuje się na
jawnym ekranie blokady; urządzenie nigdy nie dołącza do niej po cichu.

Ekran urządzenia pokazuje:

- nazwę tymczasowej sieci urządzenia,
- prosty adres lokalny,
- QR jako wygodny dodatek, nie jedyną drogę,
- stan `Połączono` po zapisaniu profilu.

### 2. Lokalizacja / region — automatyczne

Po pierwszym połączeniu radio automatycznie ustala przybliżone miasto, kraj,
strefę czasową i region stacji. Wynik służy też pogodzie i lokalnym wariantom
stacji. Nie jest analityką ani wymaganiem odtwarzania.

- domyślnie geolokalizacja IP bez konta i klucza,
- dokładniejsze źródło może automatycznie podmienić mniej dokładne,
- wynik zapisuje się lokalnie dla zatwierdzonego profilu Wi-Fi,
- ręczna korekta jest dostępna później, ale nie blokuje onboardingu,
- `Ogólnopolskie` pozostaje fallbackiem po błędzie usług zewnętrznych.

### 3. Głośnik Bluetooth — opcjonalne

- skan tylko urządzeń widocznych jako potencjalny A2DP Sink,
- duża lista nazwa + siła sygnału,
- wybór jednego głośnika,
- test dźwięku,
- opcja `Pomiń — użyj głośnika radia`.

## Czego nie pytamy

- język — domyślnie polski, angielski w ustawieniach,
- kraj — wynik lokalizacji, z Polską jako fallbackiem pakietu startowego,
- strefa czasowa — wynik lokalizacji, z `Europe/Warsaw` jako fallbackiem,
- stacja startowa — pierwsza stabilna ogólnopolska; później ostatnia działająca,
- czy używać local-speaker fallback — zawsze tak,
- czy ponawiać Wi-Fi/BT/stream — zawsze tak,
- czy wybrać stabilniejszy kodek — zawsze tak,
- czy przejść na ostatnią działającą stację — zawsze tak,
- czy wysyłać analitykę — nigdy; lokalne pomiary diagnostyczne są automatyczne,
- czy aktualizować firmware — brak automatycznego kanału,
- bitrate, bufory, DNS, timeouty i inne parametry techniczne.

## Późniejsze ustawienia

Użytkownik może zmienić język, miasto, sieci, głośnik, stację startową, głośność
i jasność. Reset konfiguracji wymaga długiego przytrzymania oraz potwierdzenia.

## Kryteria UX

- jedna główna decyzja na ekran,
- minimum 44x44 px dla podstawowych touch targets,
- przyciski `Wstecz` i `Dalej` w stałych miejscach,
- brak scrolla w podstawowych krokach,
- tekst PL/EN nie wychodzi poza 320x240,
- onboarding można bezpiecznie wznowić po utracie zasilania.

Wykonywalny hostowy portal PL/EN oraz jego granice prywatności opisuje
`docs/42-local-onboarding-privacy-contract.md`. Realny SoftAP, lokalny DNS i
power-loss resume pozostają testami firmware/hardware.
