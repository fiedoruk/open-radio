# Open Radio Core2

<p align="center"><img src="brand/logo-a-signal-cube.svg" width="92" alt="Open Radio — logo signal cube"></p>

<p align="center">
  <a href="https://github.com/fiedoruk/open-radio/actions/workflows/ci.yml"><img src="https://github.com/fiedoruk/open-radio/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/wydanie-0.2.1-3db8f5" alt="Wydanie 0.2.1">
  <img src="https://img.shields.io/badge/licencja-GPL--3.0--or--later-blue" alt="GPL-3.0-or-later">
  <img src="https://img.shields.io/badge/platforma-M5Stack_Core2-orange" alt="M5Stack Core2">
  <img src="https://img.shields.io/badge/stacje-218_sprawdzonych-success" alt="218 sprawdzonych stacji">
  <img src="https://img.shields.io/badge/testy-238_·_38_bramek-success" alt="238 testów, 38 bramek">
</p>

<p align="center"><a href="https://fiedoruk.pl/open-radio.html"><img src="https://fiedoruk.pl/assets/img/or/core2-1.jpg" width="740" alt="Open Radio grające na prawdziwej kostce M5Stack Core2"></a></p>

<p align="center">
  <img src="https://fiedoruk.pl/assets/img/or/screen-1.png" height="150" alt="Ekran odtwarzania">
  <img src="https://fiedoruk.pl/assets/img/or/screen-2.png" height="150" alt="Wybór stacji">
  <img src="https://fiedoruk.pl/assets/img/or/screen-3.png" height="150" alt="Ustawienia">
  <img src="https://fiedoruk.pl/assets/img/or/screen-4.png" height="150" alt="Karta statusu">
</p>

<p align="center"><b><a href="https://fiedoruk.pl/open-radio-install.html">⚡ Zainstaluj z przeglądarki</a></b> · <a href="https://fiedoruk.pl/os/open-radio-0-2-1.bin">Pobierz 0.2.1</a> · <a href="docs/116-release-0-2-1.pl.md">Noty wydania</a> · <a href="https://fiedoruk.pl/open-radio-stacje.html">218 stacji</a></p>

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

Kostka ma dziewięć slotów na stacje i **tę dziewiątkę wybierasz sam z
wbudowanego katalogu 218 polskich stacji** — każda sprawdzona realnym
połączeniem i zmierzona pod obciążeniem — przy pierwszym uruchomieniu oraz w
dowolnej chwili później przez konsolę w telefonie (QR). Pełny katalog:
[fiedoruk.pl/open-radio-stacje](https://fiedoruk.pl/open-radio-stacje.html).

Fabryczna dziewiątka (gra, dopóki nie ułożysz własnej): RMF FM, Radio ZET,
TOK FM, Antyradio, Radio ESKA, RMF MAXX, Radio Plus, Złote Przeboje i
Meloradio.

Każda pozycja katalogu ma ścieżkę MP3 w publicznym torze źródłowym.
Prywatny tor hardware-lab może zachować fallback AAC do diagnostyki, ale AAC i
HLS pozostają poza publiczną binarką do osobnej bramki prawnej, transportowej i
zasobowej. Projekt nie proxy'uje, nie retransmituje i nie nagrywa stacji ani nie
sugeruje ich poparcia.

## Docelowy sprzęt

- M5Stack Core2 z ESP32-D0WDQ6-V3 — zwalidowany w terenie na rewizjach
  sprzętu v1.0 (AXP192) i v1.1 (AXP2101) tym samym obrazem; każda nowa
  rewizja Core2 wchodzi do macierzy testów wydania, gdy tylko jest dostępna
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

Zmierzone na linii wydania (0.2.1):

- smoke z dnia wydania na Core2 v1.0 właściciela i niezależna instalacja
  z terenu na fabrycznie świeżym v1.1 — obie rewizje sprzętu pokryte,
- wszystkie dziewięć logotypów stacji pobranych w jednym passie, pierwszy
  dźwięk ≈1,2 s od sieci, zapamiętany głośnik wraca w ≈3,1 s, zero
  underrunów na starcie,
- bateria, pomiar właściciela: około 2,5 godziny typowego grania, przy
  sprzyjających warunkach blisko trzech (pobór ~140 mA, w szczytach
  ~190 mA; przyciemnienie ekranu zmienia niewiele),
- Xiaomi Sound Pocket pozostaje referencyjnym głośnikiem Classic A2DP/SBC.

Wcześniejsze zapisy laboratoryjne — w tym oblany przedwydaniowy bieg
60 minut — są zachowane jako datowana historia w [STATUS.md](STATUS.md).

Na linii wydania pozostają otwarte:

- wymuszone cykle recovery (Wi-Fi, stream, głośnik) i długi soak endurance,
  wraz z zachowaniem SD i powerbanku,
- zgodność z kolejnymi głośnikami Bluetooth Classic A2DP/SBC,
- zapas DRAM podczas wybierania Bluetooth (dip ~5 KB pod obserwacją),
- limit przeglądania i układ wyszukiwarki w portalu — zaplanowane na 0.2.2
  ([docs/117](docs/117-0-2-2-maintenance-plan.pl.md)),
- dopasowanie obudowy.

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
