# Open Radio Core2

> Wydane publicznie jako **Open Radio** — aktualnym wydaniem jest **0.2.1**
> (2026-07-22, zwalidowane sprzętowo w terenie na obu rewizjach Core2);
> 0.1 i 0.2 pozostają do pobrania jako wydania historyczne.
> Oficjalne binarki pochodzą wyłącznie z [fiedoruk.pl/open-radio](https://fiedoruk.pl/open-radio.html).
> Noty wydania i znane ograniczenia: [docs/116-release-0-2-1.pl.md](docs/116-release-0-2-1.pl.md).

Open Radio powstaje z pomocą AI, pod ludzkim kierunkiem i na odpowiedzialność
autora: każde publiczne wydanie bronią wykonywalne testy, dokładne sumy
kontrolne artefaktów, udokumentowane dowody sprzętowe i jawna lista znanych
ograniczeń.

Open Radio Core2 to otwartoźródłowa, niezawodna kostka radia internetowego dla
M5Stack Core2. Odtwarza polskie stacje przez Wi-Fi na zapamiętanym głośniku
Bluetooth, a głośnik wbudowany jest automatycznym wyjściem awaryjnym.

[English version](README.md)

## Obietnica produktu

Włączasz i gra. Codzienne słuchanie nie wymaga konta, telefonu, chmury projektu
ani rutynowej aktualizacji. Telefon jest potrzebny tylko przy dodawaniu nowej
sieci Wi-Fi przez lokalny portal urządzenia.

Radio ma:

- pamiętać zatwierdzone sieci Wi-Fi i wybierać dostępną,
- łączyć ostatni głośnik Bluetooth,
- uruchamiać ostatnią działającą stację,
- przechodzić na głośnik wbudowany,
- odzyskiwać Wi-Fi i stream bez restartu,
- wyjaśniać problemy prostym, praktycznym językiem,
- zachowywać ostatni dobry katalog i konfigurację na urządzeniu.

Nie łączy się samoczynnie z obcymi ani otwartymi sieciami. Nie ma telemetrii,
konta, automatycznego OTA, nagrywania, backendu projektu ani rutynowych zdalnych
aktualizacji katalogu. Bieżący firmware urządzenia używa tylko opcjonalnej,
bezpośredniej synchronizacji czasu NTP. Każde przyszłe pobranie przybliżonej
lokalizacji lub pogody musi być ograniczone i nigdy nie może stać się zależnością
bootu ani grania.

## Co oznacza „Core2”

Core2 to docelowy model sprzętu: **M5Stack Core2**. Jest technicznym
doprecyzowaniem, nie musi być finalną marką dla użytkownika. Pozostawienie go w
nazwie roboczej uczciwie wskazuje granicę sprzętową do czasu wyboru nazwy.

## Bluetooth — uczciwa obietnica

Testowalny kontrakt to zgodność ze standardem Bluetooth Classic A2DP Sink i
kodekiem SBC. Granie nie wymaga AVRCP ani funkcji producenta. Głośniki wyłącznie
Bluetooth LE Audio są poza możliwościami oryginalnego ESP32. Nie będzie
deklaracji uniwersalnej zgodności przed fizycznymi testami.

## Bieżący zakres stacji

RMF FM, Radio ZET, TOK FM, Antyradio, Radio ESKA, RMF MAXX, Radio Plus,
Złote Przeboje i Meloradio.

Wszystkie dziewięć pozycji katalogu ma ścieżki MP3 w publicznym torze źródłowym.
Prywatny tor hardware-lab może zachować fallback AAC do diagnostyki, ale AAC i
HLS pozostają poza publiczną binarką do osobnej bramki prawnej, transportowej i
zasobowej. Projekt nie proxy'uje, nie retransmituje i nie nagrywa stacji ani nie
sugeruje ich poparcia.

## Docelowy sprzęt

- M5Stack Core2 z ESP32-D0WDQ6-V3
- 16 MB flash i 8 MB PSRAM
- ekran dotykowy 320×240
- wbudowany głośnik I2S i bateria
- stałe zasilanie USB-C z powerbanku
- wyjście Bluetooth Classic A2DP Source

## Aktualny stan

**Publiczne wydanie 0.2.1 działa na prawdziwych urządzeniach: smoke z dnia
wydania przeszedł na Core2 v1.0 właściciela, a zewnętrzny użytkownik
niezależnie zainstalował i potwierdził je na fabrycznie świeżym Core2 v1.1.
Historyczna notka niżej o oblanym 60-minutowym biegu dotyczy starszego,
przedwydaniowego obrazu labowego, nie 0.2.1; formalna kwalifikacja endurance
0.2.1 pozostaje otwarta.**

Gotowe teraz:

- dokładne podglądy GUI 320×240 w motywie jasnym i ciemnym,
- pełny i minimalistyczny ekran grania,
- lokalne ustawienia, wygaszacze i ekran OFF,
- lokalny onboarding Wi-Fi z wieloma zabezpieczonymi profilami i ograniczonym recovery,
- wykonywalne resolvery MP3 dla wszystkich dziewięciu bieżących stacji,
- routing na głośnik wbudowany i automatyczne, niezależne od modelu wyszukiwanie
  urządzeń renderujących audio przez Bluetooth Classic, z jednym zatwierdzonym
  peerem zapamiętanym po adresie przez ograniczony flow parowania/połączenia,
- do ośmiu automatycznie wybieranych zatwierdzonych profili Wi-Fi oraz
  dwuetapowy pełny reset danych lokalnych,
- testy hostowe renderera, zapisu i kontraktów firmware,
- powtarzalne źródła firmware, chroniony restore dokładnego obrazu i zbieranie
  dowodów sprzętowych.

Dotychczas zmierzono:

- odtwarzanie Classic A2DP/SBC na Xiaomi Sound Pocket;
- skupione 600 sekund RMF na poprawionym obrazie z jednym rzeczywistym restartem
  streamu, bez wstrzykniętej ciszy BT i z czystym końcowym oknem odsłuchu;
- wcześniejszy smoke dziewięciu stacji, w którym każda odzyskała granie, ale
  zapisane nierówności nie przenoszą werdyktu H4 na poprawiony obraz;
- pełny capture 60 minut zakończony FAIL przez panic recovery A2DP i późniejszy,
  odrębny zmierzony brak dekodowanego PCM. Capture nie dowodzi, że oba faile są
  przyczynowo niezależne; automatyczne napełnienie kolejek nie zmienia wyniku
  próby na PASS.

Na poprawionym obrazie pozostają otwarte:

- wymuszony fallback lokalny, recovery Wi-Fi i trzy cykle reconnect Bluetooth,
- bezpieczeństwo pull-watchdog/fallback/reconnect A2DP, pełna kwalifikacja
  przełączania dziewięciu stacji oraz endurance,
- zgodność z kolejnymi głośnikami Bluetooth Classic A2DP/SBC,
- PMU/bateria, SD i ciągłe granie przez 8 godzin,
- usunięcie blokujących operacji sieciowych z pętli właściciela, uzasadniony
  budżet DRAM i dopasowanie obudowy.

Publiczny tor MP3-only jest torem wydanym: 0.2.1 odtwarza się bajt-w-bajt poza
stemplem pochodzenia przy zachowaniu udokumentowanych parametrów builda
(patrz [REPRODUCIBILITY.pl.md](REPRODUCIBILITY.pl.md)). Punkty endurance wyżej
pozostają otwarte i są uczciwie wymienione w notach wydania.

Szczegółowe dowody techniczne są w [STATUS.md](STATUS.md).

## Podgląd oprogramowania

W katalogu repozytorium uruchom:

```bash
npm run simulator
```

Otwórz `http://127.0.0.1:4173/gui-lab/`, aby uruchomić kanoniczny emulator
urządzenia. Ma jeden widoczny canvas 320×240, bez zakładek renderera i bez
sterowania powiększeniem. Każdy widoczny piksel urządzenia pochodzi z tego samego
renderera C++ RGB565, który jest linkowany do targetu Core2, łącznie z wbudowanym
atlasem Inter 600 i kompilowanymi maskami ikon. 26 ekranów tworzy 104
deterministyczne warianty PL/EN oraz Light A/Dark B.

Canvas dowodzi logicznego framebufferu i flow interakcji, ale nie fizycznego
rozmiaru dwóch cali, koloru IPS, jasności, kalibracji dotyku ani czytelności na
urządzeniu. To nadal pomiary sprzętowe. Osobne symulatory recovery i onboardingu
pozostają narzędziami inżynierskimi poza emulatorem urządzenia. Szczegóły zawiera
[poprawiony audyt zgodności pikselowej emulatora](docs/86-emulator-pixel-parity-audit.pl.md).

## Instrukcja użytkownika

Przeczytaj [USER-GUIDE.pl.md](USER-GUIDE.pl.md): pierwszy start, codzienne
sterowanie, ustawienia ekranu, recovery, prywatność i znane ograniczenia.

## Rozwój i walidacja

```bash
npm run check
```

Pełna bramka hostowa sprawdza kontrakty, pliki generowane, parytet dokumentacji,
deterministyczny renderer, firmware host i powtarzalność źródeł. Backup, flash,
kasowanie i monitor urządzenia nie są częścią tej komendy.

## Najważniejsza dokumentacja

- [USER-GUIDE.pl.md](USER-GUIDE.pl.md) — flow i sterowanie użytkownika
- [CONTRIBUTING.pl.md](CONTRIBUTING.pl.md) — zasady współpracy
- [STATUS.md](STATUS.md) — zmierzony stan i otwarte ryzyka
- [docs/66-pixel-perfect-gui-system.pl.md](docs/66-pixel-perfect-gui-system.pl.md) — kontrakt GUI
- [docs/75-hardware-arrival-handoff.pl.md](docs/75-hardware-arrival-handoff.pl.md) — pierwsza sesja fizyczna
- [docs/86-emulator-pixel-parity-audit.pl.md](docs/86-emulator-pixel-parity-audit.pl.md) — dokładna skala podglądu i granice zgodności z firmware
- [docs/88-final-pre-hardware-audit.pl.md](docs/88-final-pre-hardware-audit.pl.md) — finalny werdykt software i checklista dnia sprzętu
- [docs/85-novice-ux-public-readiness-audit.pl.md](docs/85-novice-ux-public-readiness-audit.pl.md) — audyt UX nowych użytkowników i gotowości publicznej

Historyczne raporty loopów pozostają w `docs/` jako dowody inżynieryjne, a nie
zalecany punkt startowy dla użytkownika.

## Autorstwo i licencja

Founder i pierwotny autor: **Tomasz Fiedoruk — [fiedoruk.pl](https://fiedoruk.pl)**.

Kod jest na `GPL-3.0-or-later`, oryginalna dokumentacja i grafiki na
`CC BY-SA 4.0`, a dane katalogowe na `CC0-1.0`. Oficjalne logotypy stacji nie są
dołączane bez udokumentowanej zgody. Publiczne wydania firmware (0.1, 0.2 i
aktualne 0.2.1) pochodzą z `fiedoruk.pl/os/`; archiwum odpowiadających źródeł
aktualnego wydania jest opublikowane obok binarki, a każde wydanie ma
prowieniencję w manifeście wydania.
