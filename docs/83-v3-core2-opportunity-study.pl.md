# 83 — Badanie możliwości Core2 dla V3

[English version](83-v3-core2-opportunity-study.en.md)

## Pytanie

Jaką dodatkową wartość można wyciągnąć z M5Stack Core2 przy średnim nakładzie,
nie zamieniając kostki radiowej w ogólną platformę aplikacji?

Oficjalna specyfikacja Core2 potwierdza dwurdzeniowy ESP32 240 MHz, 16 MB flash,
8 MB PSRAM, ekran dotykowy, RTC, sześcioosiowe IMU, silnik wibracyjny, mikrofon
PDM, slot TF, baterię i układ zarządzania energią. Badanie korzysta wyłącznie z
tych faktycznie wbudowanych możliwości.

## Rekomendowany pakiet V3

| Priorytet | Funkcja | Wartość | Nakład | Dopasowanie |
|---|---|---:|---:|---:|
| V3.1 | Sleep timer i zaplanowany alarm radiowy | bardzo wysoka | średni | idealne |
| V3.2 | Lokalny pilot telefonu na `radio.local` | wysoka | średni | idealne |
| V3.3 | Tryb nocny, polityka ekranu i alert opadów | wysoka | niski/średni | idealne |
| V3.4 | Gesty IMU: obrót wycisza, podniesienie budzi | średnia/wysoka | średni | dobre jako opt-in |
| V3.5 | Alarm awaryjny RTC i wibracją | średnia | niski/średni | dobre |
| V3.6 | Eksport diagnostyki i recovery pack na SD | średnia | średni | idealne |
| V3.7 | Trzy dolne skróty dotykowe | średnia | niski | idealne |
| V3.8 | Panel baterii i mostka zaniku zasilania | średnia | niski | idealne |

## Najlepszy zakres przy średnim nakładzie

Najmocniejsze V3 to nie więcej widgetów, lecz spójny pakiet radia nocnego i
kuchennego:

1. sleep timer jednym dotknięciem: 15, 30, 45, 60 i 90 minut,
2. maksymalnie trzy lokalne alarmy zapisane w urządzeniu,
3. łagodny wzrost głośności i fallback stacji,
4. wibracja i głośnik wbudowany, gdy Bluetooth jest niedostępny,
5. automatyczna jasność nocna i polityka wyłączenia ekranu z S19,
6. lokalny pilot telefonu do stacji, głośności, timera i alarmów,
7. obrót-wyciszenie i podniesienie-budzenie jako domyślnie wyłączone opcje IMU,
8. eksport oczyszczonej diagnostyki i ręcznej konfiguracji recovery na SD.

Pakiet wykorzystuje istniejący RTC, persistence, portal onboardingu, fallback
głośnika, resolver stacji i GUI ustawień. Powstaje jedno spójne urządzenie, a nie
zbiór przypadkowych funkcji.

## Przydatne, ale opcjonalne

- Mikrofon: wyłącznie lokalny self-test hardware i eksperyment klaśnięcia do
  wybudzenia. Bez nagrywania, wysyłania mowy i stałego asystenta głosowego.
- Karta TF: eksport konfiguracji, lokalne dzwonki i dowody recovery. Bez
  nagrywania ani cache audio stacji.
- Wibracja: cichy alarm, potwierdzenie problemu parowania i ostrzeżenie baterii.
- IMU: gesty opt-in dopiero po testach fałszywych aktywacji.

## Decyzja o assetach wygaszacza z kotem

Aktualna deterministyczna Kiara jest lekką, oryginalną grafiką proceduralną, a
nie fotorealistycznym assetem kota brytyjskiego krótkowłosego. Biblioteka
animacji w runtime nie jest potrzebna na Core2; ewentualny wariant o większej
liczbie detali powinien być małym, oryginalnym sprite sheetem konwertowanym
offline do klatek RGB565 compile-time.

- `crgimenes/neko` ma kod BSD-2-Clause, ale jawnie wykorzystuje sprite'y i
  dźwięki ze starszej linii Neko, więc sama licencja kodu nie daje wystarczającej
  proweniencji assetów dla tego projektu.
- `clawd-on-desk` odrzucamy, bo dołączone grafiki są wyłączone z licencji źródeł
  i pozostają all-rights-reserved.
- Pixelorama jest odpowiednim narzędziem autorskim na licencji MIT, ale nie
  źródłem gotowej do redystrybucji postaci brytyjskiego kota.

Rekomendacja: zachować proceduralną Kiarę jako domyślny wariant bez zależności,
a arkusz 6–8 klatek tworzyć dopiero wtedy, gdy test fizycznego panelu uzasadni
dodatkowy koszt flashu i animacji. Przed dołączeniem zapisać autora, licencję,
paletę, wymiary i sumę kontrolną źródła.

## Odrzucone z głównego produktu

- konto w chmurze, zdalny dashboard i projektowy backend powiadomień,
- ogólny tryb platformy Home Assistant/MQTT,
- widgety newsów, kalendarza i social,
- stale nasłuchujący asystent głosowy,
- nagrywanie i timeshift stacji,
- automatyczne OTA i zdalny sklep aplikacji,
- twierdzenia o jakości powietrza bez zewnętrznego skalibrowanego czujnika.

Te funkcje łamią granicę pojedynczego celu, dodają stałe utrzymanie, tworzą
oczekiwania prywatności albo wymagają hardware, którego Core2 nie ma.

## Rekomendowana kolejność

Po fizycznych bramkach H0-H3 realizujemy V3.1 sleep/alarm i V3.2 lokalny pilot w
jednym loopie produktowym. Gesty IMU dopiero po ośmiogodzinnym teście odtwarzania
i przerwie zasilania. Eksperymenty mikrofonu pozostają w prywatnej gałęzi do
pomiaru fałszywych aktywacji i zachowania prywatności.

## Źródła

- Oficjalna specyfikacja M5Stack Core2:
  <https://docs.m5stack.com/en/core/core2>
- Dokumentacja czasu systemowego i SNTP w ESP-IDF:
  <https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32/api-reference/system/system_time.html>
- Pola prognozy Open-Meteo używane przez ekran ambient:
  <https://open-meteo.com/en/docs>
- Implementacja Neko i ostrzeżenie o proweniencji assetów:
  <https://github.com/crgimenes/neko>
- Odrzucone all-rights-reserved grafiki desktop-pet:
  <https://github.com/rullerzhou-afk/clawd-on-desk>
- Narzędzie do pixel art na licencji MIT:
  <https://github.com/Orama-Interactive/Pixelorama>
