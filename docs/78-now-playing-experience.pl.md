# 78 — Ekran grania i research tylnej obudowy

[English version](78-now-playing-experience.en.md)

## Decyzja

GUI Lab pokazuje teraz dwa ekrany grania i trzy kierunki wygaszacza. Wariant 1
zachowuje dotychczasową ekspozycję stacji, ale zastępuje zbyt duży komunikat o
stabilności użytecznym tytułem audycji lub utworu. Wariant 2 jest minimalistyczny:
stacja, lokalny zegar, opcjonalna pogoda i mała karta opadów. S17 nie zmienia
logiki odtwarzania ani persystencji.

## Tytuł utworu

Podstawowym źródłem jest opcjonalne pole ICY `StreamTitle` udostępniane przez
klienta strumienia. Wejście ma limit, znaki sterujące są usuwane, a stare dane
odrzucane. Gdy stacja nie wysyła poprawnego tytułu, ekran wraca do nazwy stacji
i stanu odtwarzania; nie obiecujemy metadanych dla każdej stacji. Dowód z
implementacji referencyjnej: <https://github.com/earlephilhower/ESP8266Audio>.

## Pogoda i prywatność

Pogoda jest opcjonalna i nigdy nie blokuje startu ani grania. Lokalizacja rusza
automatycznie po zatwierdzonym zabezpieczonym Wi-Fi: preferowany jest zapis dla
tej sieci, następnie dostępna lokalizacja urządzenia onboardingowego,
zatwierdzone pozycjonowanie Wi-Fi, geolokalizacja IP bez klucza i domyślna
wartość kraju. Ręczna korekta zawsze wygrywa, ale nie jest wymagana. Open-Meteo
w zastosowaniu niekomercyjnym nie wymaga konta ani klucza API; radio pobiera
tylko temperaturę, kod WMO i prawdopodobieństwo opadów, trzyma ostatni dobry
wynik, stosuje backoff i ukrywa stary widget. Atrybucja trafia do About Pro.
Źródła:
<https://open-meteo.com/en/docs> i <https://open-meteo.com/en/license>.

## Uniwersalny model krajów

GUI przyjmuje znormalizowane fakty lokalizacyjne i pogodowe, a nie polską
odpowiedź konkretnego dostawcy. Automatyczna lokalizacja proponuje kraj, strefę
czasową, język i region stacji. Pakiet kraju dostarcza teksty, jednostki i
bezpieczne fallbacki. Odtwarzanie, resolver i recovery nie zależą od endpointu
lokalizacji ani pogody.

## Priorytet widgetów

Zawsze: stacja, bieżący tytuł gdy dostępny i wyjście dźwięku. W wariancie
minimalnym: lokalny zegar RTC, opcjonalna temperatura i opady wkrótce. Tylko gdy
wymagają reakcji: recovery Wi-Fi, fallback Bluetooth i niski poziom baterii.
Na pierwsze wydanie odrzucamy nagłówki, kalendarz, dashboard jakości powietrza i
zdalne loga stacji. Najlepszym kolejnym widgetem radiowym jest wyłącznik czasowy,
ale nie wchodzi do S17.

## Wygaszacze reagujące na audio

S19 dodaje trwałe ustawienia Ekranu: wygaszacz WŁ./WYŁ., tryb Pulse/Bars/Orbit,
start od 30 sekund do dziesięciu minut oraz niezależne wyłączenie ekranu po 15,
30 albo 60 minutach. Domyślnie Pulse uruchamia się po dwóch minutach, a ekran
wyłącza po 30 minutach. Wyłączenie dotyczy tylko panelu i podświetlenia; audio i
recovery działają dalej, a każdy dotyk budzi ekran.

Dry-run oferuje Pulse, Bars i Orbit. GUI Lab używa jasno oznaczonego sygnału
syntetycznego. Firmware ma używać ograniczonego odczepu analizy PCM, rysować
maksymalnie 16 fps, pomijać klatki pod obciążeniem audio i wychodzić po każdym
dotknięciu. Pulse i Orbit wymagają tylko amplitudy; wielopasmowy Bars pozostaje
bramką wydajności na sprzęcie. Wszystkie tryby mają status `NOT_MEASURED`.

## Shortlista tylnej obudowy

Pierwszy wybór to oryginalny spód bateryjny Core2 albo oficjalny M5GO Bottom2,
bo zachowuje projekt baterii, IMU i mikrofonu. Oficjalne repozytorium sprzętowe
M5Stack zawiera pliki `Core2_Base.stl` i `Core2_v1.1_Base.stl` dla konkretnych
rewizji, na których można oprzeć naszą minimalistyczną skorupę:
<https://github.com/m5stack/M5_Hardware>. Społecznościowy „Simple M5Stack Back
Cover” jest wizualnie minimalistyczny, ale pozostaje kandydatem bez potwierdzenia
pasowania — nie zalecamy druku przed poznaniem rewizji Core2:
<https://cults3d.com/en/3d-model/gadget/simple-m5stack-back-cover>.

## Bramka sprzętowa

Po dostawie identyfikujemy rewizję Core2, fotografujemy i mierzymy odsłonięty
tył, potwierdzamy wymagania baterii/IMU/mikrofonu, a następnie sprawdzamy śruby,
dostęp do USB-C i SD, wentylację głośnika, odstęp od anteny i temperaturę przy
ciągłym zasilaniu. Dopiero wtedy wybieramy oficjalny spód, adaptujemy oficjalny
CAD albo kwalifikujemy model społecznościowy.
