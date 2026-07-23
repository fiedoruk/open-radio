# 20 — Kontrakt łączności i kompatybilności

## Wi-Fi

`Samoczynne łączenie z sieciami` oznacza automatyczny wybór spośród sieci,
które właściciel wcześniej zatwierdził i zapisał lokalnie.

Urządzenie nie może samo zdobyć hasła do nowej sieci, zaakceptować regulaminu
captive portalu ani bezpiecznie założyć, że otwarta sieć jest godna zaufania.
Dlatego kontrakt obejmuje:

- maksymalnie osiem zapamiętanych profili,
- automatyczny scan i wybór najlepszego profilu,
- powrót do innego znanego Wi-Fi po utracie bieżącego,
- lokalny portal onboardingowy bez konta i aplikacji,
- jasny stan `CONFIG_REQUIRED`, gdy żadna znana sieć nie jest dostępna,
- brak automatycznego łączenia z siecią otwartą/nieznaną.

## Bluetooth

Core2 działa jako Bluetooth Classic A2DP Source. Głośnik musi działać jako A2DP
Sink i przyjąć SBC. Firmware nie wymaga:

- aplikacji producenta,
- logowania,
- kodeka aptX, AAC lub LDAC,
- AVRCP,
- absolute volume,
- multipoint.

## Publiczna obietnica

Dozwolone:

> Works with standards-compliant Bluetooth Classic A2DP speakers supporting SBC.

Niedozwolone:

> Works with every Bluetooth speaker now and forever.

Pierwsza obietnica jest testowalna. Druga obejmowałaby przyszłe urządzenia
LE Audio-only, błędy producentów, niestandardowe pairing flows i profile, których
ESP32-D0WDQ6-V3 sprzętowo nie implementuje.

## Strategia maksymalizacji zgodności

1. SBC jako jedyny wymagany kodek wyjściowy.
2. Audio działa bez kanału sterowania AVRCP.
3. Pairing przez standardowe discover/connect i zapamiętany adres urządzenia.
4. Ograniczony czas łączenia i zawsze dostępny local-speaker fallback.
5. Community compatibility matrix z dokładnym modelem, firmware głośnika,
   wynikiem pairing, reconnect, power-cycle, volume i 24 h soak.
6. Minimum pięć klas przed stabilnym release: tani głośnik, JBL-class portable,
   domowy smart speaker z A2DP, słuchawki oraz car-audio.
7. Każdy workaround producenta musi być izolowany i opcjonalny; nie może psuć
   standardowej ścieżki.

## Znane granice

- jednocześnie jeden A2DP Sink,
- Wi-Fi i Bluetooth współdzielą radio 2.4 GHz,
- głośnik musi być włączony i dostępny,
- first pairing wymaga wejścia głośnika w discoverable mode,
- model LE Audio-only bez Classic A2DP nie jest kompatybilny,
- przyszła zmiana standardu nie może zostać dodana bez zgodnego hardware.

Dokumentacja techniczna Espressif potwierdza tryb A2DP Source, łączenie do A2DP
Sink i aktualne wsparcie kodeka SBC. To jest fundament kontraktu, nie marketing.
