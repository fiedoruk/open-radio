# 108 — Usunięcie zapisywania utworów

[English version](108-remove-favorites.en.md)

**Cel:** zapis decyzji o usunięciu funkcji zapisywania granego utworu
**Dotyczy:** kontraktu UI, renderera, bliźniaka parity i trwałości w NVS
**Nie autoryzuje:** zapisu urządzenia, zmian w torze audio ani wydania

## Co zniknęło

Trzy ekrany — `Favorites`, `FavoriteDetail` oraz `TrackActions` — wraz z obiema
ścieżkami zapisu: długim przytrzymaniem tytułu i tapnięciem otwierającym ekran
akcji. Zniknęły też: warstwa ulubionych w `UiController`, wartości w enumach
`Screen` i `TouchAction`, siedem pól snapshotu renderera, trzy funkcje rysujące,
jedenaście flag CLI renderera, dwanaście parametrów symulatora, marker
`favorite-save` w zbieraniu dowodów oraz `PreferencesFavoriteRepository` razem
z 6224-bajtowym blobem NVS.

Obraz publiczny zmalał z 2 250 576 do **2 244 848 bajtów** — o 5728 bajtów.

## Dlaczego

Funkcja nie działała od lipca, a ekran gubił się przy dotyku w tym obszarze.
Jej naprawa wymagałaby ruszenia pętli audio — dotyk jest z nią sprzężony przez
budżet dekodera, co zmierzono w lipcu, gdy potrójny budżet wydłużył przebiegi
pętli i zepsuł reakcję ekranu. Wydanie 0.2 zamraża tor audio, więc naprawa
kolidowałaby z jego główną bramką. Usunięcie kasuje błąd razem z funkcją i
zmniejsza powierzchnię przed rozbudową katalogu.

## Co zostało

Tytuł utworu z metadanych ICY jest nadal wyświetlany — zmieniło się tylko to, że
nie da się go zapisać. Bufor tytułu dostał własną stałą `kNowPlayingTitleBytes`,
bo wcześniej dzielił deklarację z ulubionymi i zniknąłby razem z nimi.

Długie przytrzymanie ekranu nadal go wybudza.

## Dwie rzeczy, które się przesunęły

**`confirmDelete` zostało.** To wspólny mechanizm dwustopniowego potwierdzenia,
z którego korzysta też bezpieczny reset urządzenia. Usunięcie go sprawiłoby, że
**jedno dotknięcie kasowałoby konfigurację** zamiast dwóch.

**Bezpieczny reset przesunął się z indeksu 5 na 4 w siatce ustawień** (numeracja
kafli `index = row*2 + column`), czyli z prawej kolumny do lewej, bo zniknął
kafel Ulubionych przed nim. Przycisk sprzętowy C na ekranie Stacje rzutował na
tapnięcie w hitbox Ulubionych; teraz nie ma tam nic i ekran się nie zmienia.

## Stary blob w NVS

Klucze `fav_a` i `fav_b` zostają na urządzeniach, które je zapisały. Nic ich już
nie czyta i **to wydanie nie kasuje niczyich danych**. Format nigdy nie miał
migracji — nieznany nagłówek zawsze oznaczał ciche wyzerowanie listy.

## Bramka

`npm run check`: 35 bramek, 207 testów, zero błędów. Build publiczny: `SUCCESS`.
Bilans zmian: około 900 usuniętych linii wobec około 120 dodanych.
