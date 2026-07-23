# Okładki aktualnie granego utworu

**Data decyzji:** 2026-07-15

**Stan:** wybrana architektura; implementacja lookup/cache jest osobnym torem
po ustabilizowaniu audio i HLS.

## Co już działa

Stacje MP3/ICY mogą przekazać `StreamTitle`. Firmware wyświetla ten tekst i
czyści go przy zmianie stacji, aby nie pokazywać starego tytułu. Sam
`StreamTitle` zwykle nie zawiera grafiki ani stabilnego identyfikatora utworu.

Eksperymentalna ESKA/HLS nie ma jeszcze parsera timed-ID3 ani adaptera pola
`EXT-X-ZPR`, więc na tym torze live tytuł i grafika nie są dziś dostępne.

## Realne źródła grafiki

1. **Metadane nadawcy.** Najlepsza trafność i możliwość otrzymania gotowego
   artwork URL, ale wymaga osobnego adaptera dla każdej rodziny stacji.
2. **MusicBrainz + Cover Art Archive.** Wyszukanie recording/release po
   `artist + title`, następnie miniatura front 250 px. Bez klucza dla odczytu,
   lecz wymagany jest identyfikujący User-Agent i limit najwyżej 1 request/s.
   Pokrycie oraz dopasowanie nie są stuprocentowe.
3. **ListenBrainz metadata lookup.** Dobre mapowanie tekstu na MBID, ale
   aktualny endpoint lookup wymaga tokenu użytkownika. Nie wkładamy wspólnego
   sekretu do firmware.
4. **Apple Search API.** Proste i ma dobre pokrycie, ale album art jest Promo
   Content objętym warunkami użycia w kontekście promowania sklepu. Nie jest
   rekomendowany jako podstawowy silnik samodzielnego radia.
5. **Spotify/Discogs/Last.fm.** Wymagają OAuth, klucza albo sekretu i tworzą
   niepotrzebny problem provisioningu. Nie są domyślną ścieżką urządzenia bez
   projektu chmurowego.

## Wybrany pipeline

`metadata nadawcy -> MusicBrainz/CAA -> logo stacji/monogram`

- lookup tylko po zmianie poprawnego `artist - title`;
- co najmniej 1 s między zapytaniami MusicBrainz;
- praca w tasku o niskim priorytecie poza dekoderem;
- odpowiedź JSON ograniczona rozmiarem i czasem;
- grafika maksymalnie 96 KiB, dekodowana do 128x128 RGB565 w PSRAM;
- lokalny LRU maksymalnie 16 okładek / 1 MiB;
- timeout, brak lub niepewne dopasowanie natychmiast pokazuje logo stacji;
- brak scrapowania Google/Spotify i brak backendu projektu;
- funkcja nie może zatrzymać ani zrestartować audio.

## Warunek wdrożenia

Najpierw zapisujemy rzeczywiste formaty `StreamTitle` z działających stacji i
mierzymy DRAM/PSRAM podczas HLS oraz pobierania logotypów. Dopiero potem
dodajemy lookup/cache, aby nie maskować obecnych problemów audio kolejnym
taskiem TLS. Prototyp MP3 to 1-2 skupione dni; adapter HLS metadata dochodzi po
ustabilizowaniu ESKI.

## Dokumentacja źródeł

- [MusicBrainz Web Service](https://musicbrainz.org/doc/MusicBrainz_API)
- [MusicBrainz Search](https://musicbrainz.org/doc/MusicBrainz_API/Search)
- [Cover Art Archive API](https://musicbrainz.org/doc/Cover_Art_Archive/API)
- [ListenBrainz metadata API](https://listenbrainz.readthedocs.io/en/latest/users/api/metadata.html)
- [Apple iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/)
