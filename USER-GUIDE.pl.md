# Open Radio Core2 — instrukcja użytkownika

[English version](USER-GUIDE.md)

## Bieżące dowody sprzętowe

Aktualne publiczne wydanie 0.2.1 ma walidację sprzętową: smoke z dnia wydania
przeszedł na Core2 v1.0 właściciela, a zewnętrzny użytkownik niezależnie
zainstalował i potwierdził je na fabrycznie świeżym Core2 v1.1 — obie rewizje
sprzętu mają dowody z terenu. Czas na baterii, praca z powerbanku i długie
biegi endurance pozostają dla 0.2.1 niezmierzone — noty wydania wymieniają
wszystkie znane ograniczenia ([docs/116-release-0-2-1.pl.md](docs/116-release-0-2-1.pl.md)).

## Pierwszy start

1. Podłącz radio do zasilania USB-C.
2. Jeśli nie ma zapisanej zatwierdzonej sieci Wi-Fi, połącz telefon z tymczasową
   siecią `OpenRadio-Setup`, używając jednorazowego kodu WPA2 pokazanego na radiu.
   Portal lokalny powinien otworzyć się sam; jeśli nie, otwórz `192.168.4.1`.
3. Dodaj zabezpieczoną sieć Wi-Fi. Radio nigdy samo nie wybiera obcej lub otwartej sieci.
4. Najpierw uruchamia się głośnik wbudowany, aby dźwięk nie zależał od Bluetooth.
5. Radio łączy zapamiętany głośnik Bluetooth Classic A2DP/SBC. Jeśli nie ma
   zapamiętanego głośnika, automatycznie zaczyna standardowy skan urządzeń audio;
   lokalny ekran Bluetooth pozwala go powtórzyć.

Po konfiguracji telefon nie jest potrzebny, dopóki nie dodajesz nowej sieci.

## Codzienny ekran

Dolne przyciski przełączają na poprzednią stację, otwierają siatkę stacji i
przechodzą do następnej wspieranej stacji. Przycisk ustawień otwiera preferencje.

Dostępne są dwa układy ekranu głównego:

- **Pełny** eksponuje wygląd stacji i aktualny tytuł ICY, jeśli jest dostępny.
- **Minimalny** eksponuje zegar i celowo ogranicza informacje o stacji.

Wybór zapisuje się na urządzeniu. Brak metadanych nigdy nie zatrzymuje dźwięku —
odpowiednie pole przechodzi w fallback albo znika.

## Ustawienia

Ustawienia są podzielone na trzy czytelnie ponumerowane strony:

- **Szybkie:** status Wi-Fi, Bluetooth, głośność, jasność, motyw i język.
- **System:** lokalizacja/region, ekran, informacje o projekcie, diagnostyka,
  układ ekranu głównego i ponowne skanowanie Bluetooth.
- **Ekran:** wygaszacz ON/OFF, czas, tryb, ekran OFF ON/OFF, czas i podgląd.

Karty mają pojedyncze, ograniczone akcje. Wartości przechodzą przez krótką listę;
nie ma ukrytej konfiguracji tekstowej ani potrzeby edycji kodu.

## Szum lokalny

W Ustawieniach dotknij ikony koncentrycznych okręgów obok **X**, aby otworzyć
w pełni lokalny tryb Szum. Duży przycisk uruchamia i zatrzymuje dźwięk, a niżej
wybierasz Biały, Różowy lub Brązowy; przyciski A/C zmieniają kolor, natomiast B
lub **X** wraca do ostatniej stacji. Kostka zapisuje wybrany tryb i kolor,
wznawia Szum po restarcie oraz zachowuje to samo wyjście Bluetooth i fallback
na głośnik wbudowany bez uzależniania grania od Wi-Fi.

## Usypianie ekranu

Pulse, Bars, Orbit i Kiara są wygaszaczami wizualnymi. Włączają się po 30 sekundach do
10 minut. Ekran może wyłączyć się po 15, 30 albo 60 minutach. Audio, sieć i
recovery działają dalej. Dotyk budzi ekran i wraca do wybranego układu głównego.

## Recovery

- Brak Wi-Fi: radio ponawia znane sieci z ograniczonym backoffem.
- Zerwany stream: radio ponownie otwiera stream i obraca dostępne kandydaty.
  Stabilny dwell, scoring i kwarantanna per-endpoint nie są jeszcze wdrożone.
- Brak Bluetooth: audio przechodzi na głośnik wbudowany, a reconnect jest ograniczony.
- Uszkodzona konfiguracja: safe mode unika obcych sieci i proponuje lokalną naprawę.

## Prywatność

Nie ma konta, analityki ani backendu projektu. Dane Wi-Fi, identyfikatory znanych
sieci i diagnostyka pozostają na urządzeniu. Bieżący firmware używa opcjonalnej,
bezpośredniej synchronizacji czasu NTP. Planowane dodatki lokalizacji i pogody
nie istnieją w firmware urządzenia i nigdy nie mogą stać się zależnością grania.

## Znane ograniczenia

- Historyczne notki niżej o oblanym 60-minutowym biegu dotyczą starszego,
  przedwydaniowego obrazu labowego, nie wydanego 0.2.1.
- Wymuszone cykle recovery Wi-Fi/streamu/głośnika, zachowanie PMU/baterii/SD
  i dłuższe endurance pozostają dla 0.2.1 formalnie niezakwalifikowane.
- Wszystkie dziewięć bieżących stacji używa ścieżek MP3, ale dostępność
  endpointów może zmieniać się niezależnie od jakiegokolwiek wydania.
- Pełna lista znanych ograniczeń bieżącego wydania jest w
  [docs/116-release-0-2-1.pl.md](docs/116-release-0-2-1.pl.md).
- Oficjalne logotypy stacji nie są publicznie dołączone bez zgody.
- Głośniki wyłącznie Bluetooth LE Audio są poza kontraktem Core2.
- Aktualnym publicznym wydaniem jest 0.2.1; endurance i czas na baterii nie
  mają jeszcze formalnej kwalifikacji.

Aktualne dowody są w [STATUS.md](STATUS.md), a kolejność testów fizycznych w
[docs/75-hardware-arrival-handoff.pl.md](docs/75-hardware-arrival-handoff.pl.md).
