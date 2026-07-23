# 21 — Kierunek wizualny stacji i logotypy

## Cel

Od pierwszego działającego UI każda stacja ma rozpoznawalny, pełny ekran:

- podstawowy i akcentowy kolor,
- kontrastowy wariant day/night,
- typograficzną kartę stacji,
- pole artwork/logo,
- własny prosty motyw ruchu lub tekstury,
- spójne stany loading, playing, fallback i error.

Silnik motywów jest częścią stabilnego kontraktu, nie późniejszym dodatkiem.

## Trzy warstwy assetów

### 1. `assets/original`

Oryginalne karty, typografia, ikony i abstrakcyjne motywy stworzone dla projektu.
Mogą być publicznie dystrybuowane na `CC BY-SA 4.0` po zatwierdzeniu licencji.

### 2. `assets-local`

Prywatny pakiet Tomasza używany na jego egzemplarzu. Katalog jest ignorowany
przez Git i nie wchodzi do publicznego firmware/release. Może zawierać pliki,
do których Tomasz ma prawo użycia w prywatnym PoC.

### 3. `assets/authorized-third-party`

Publiczne oficjalne logotypy trafiają tutaj wyłącznie z dokumentem zgody,
źródłem, zakresem użycia i informacją, że nie są objęte licencją projektu.

## Dlaczego licencja projektu nie wystarcza

Możemy licencjonować tylko elementy, do których mamy prawa. GPL ani Creative
Commons nie dają prawa do otwarcia logotypu nadawcy, którego projekt nie stworzył.
Publiczne repo musi więc wyraźnie oznaczać cudze materiały albo ich nie zawierać.

## Rekomendacja dla viralu

Publicznie tworzymy własny, atrakcyjny język graficzny inspirowany charakterem
stacji, ale nie kopiujemy chronionych logotypów ani ich brand booków. Dzięki temu:

- demo jest efektowne od dnia zero,
- cała otwarta warstwa wizualna może być legalnie forkowana,
- nazwisko Tomasza pozostaje przy oryginalnym systemie designu,
- community może tworzyć własne pakiety i skórki,
- oficjalny pack może zostać dodany później po zgodach, bez przebudowy UI.

## Dane motywu

```json
{
  "station_id": "example",
  "display_name": "Example",
  "primary": "#101820",
  "accent": "#F2AA4C",
  "foreground": "#FFFFFF",
  "artwork": "original/example-card.png",
  "artwork_rights": "project-original"
}
```

Pole `artwork_rights` jest obowiązkowe. Build publiczny odrzuca asset o statusie
`local-only`, `unknown` albo bez manifestu praw.
