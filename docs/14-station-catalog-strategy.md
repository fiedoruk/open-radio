# 14 — Strategia katalogu stacji

## Zakres startowy

| Stacja | Operator/grupa | Rodzaj | Otwarte pytanie |
|---|---|---|---|
| RMF FM | Grupa RMF | ogólnopolska | bezpośredni stabilny endpoint |
| RMF MAXX | Grupa RMF | sieć/regionalna | region |
| Radio ZET | Eurozet | ogólnopolska | bezpośredni stabilny endpoint |
| Chillizet | Eurozet | stacja/marka muzyczna | potwierdzić, że to wskazany „chillout” |
| TOK FM | Agora | ogólnopolska | live bez części premium/podcastowej |
| Złote Przeboje | Agora | sieć/regionalna | region |
| VOX FM | Grupa ZPR Media | sieć | wariant/endpoint |
| Radio ESKA | Grupa ZPR Media | sieć/regionalna | region |
| ESKA Impreska | Grupa ZPR Media | kanał internetowy | format i trwałość endpointu |

Dokładny audyt transportów jest w `docs/17-station-audit-2026-07-13.md`.
Sześć stacji używa ścieżki MP3/ICY, a VOX FM, ESKA i ESKA Impreska wymagają
wspólnego modułu HLS/HE-AAC.

## Zasady przyjęcia endpointu

Endpoint trafia do `stable`, gdy:

1. pochodzi z publicznego playera/operatora albo jest bezpośrednio przez niego używany,
2. nie wymaga tokenu użytkownika, DRM ani obchodzenia zabezpieczeń,
3. działa bez proxy projektu,
4. format jest obsługiwany przez firmware,
5. przeszedł test na fizycznym Core2,
6. ma `source_page`, `checked_at`, kodek, bitrate i wynik testu,
7. nazwa `verified` oznacza tylko test techniczny, nie zgodę nadawcy.

## Warstwy katalogu

- `stable`: wbudowany snapshot po teście hardware.
- `community`: rekord po review, przed długim testem.
- `local`: prywatne stacje użytkownika, nigdy automatycznie wysyłane do repo.

## Zasada działania bez infrastruktury projektu

Urządzenie używa wbudowanego katalogu. Publiczne v1.0 ma objąć pełne 9/9,
ale wewnętrzny proof zaczyna od sześciu MP3. Firmware nie pobiera automatycznej
aktualizacji katalogu projektu. Zmiany adresu rozwiązuje w granicach wbudowanych
resolverów oficjalnych powierzchni nadawców:

- resolver -> zatwierdzony primary -> alternate -> last-known-good,
- transient CDN host nie jest utrwalany jako źródło kanoniczne,
- zły endpoint dostaje health score i czasową kwarantannę,
- audio nadal płynie bezpośrednio od operatora,
- nowy, nieobsługiwany kontrakt API wymaga ręcznego USB rescue albo kończy
  zgodność tej wersji urządzenia ze stacją.

## Znaki towarowe, motywy i treść

- Nazwy stacji służą tylko identyfikacji.
- Pełne własne motywy i palety są częścią UI od dnia zero.
- Oficjalne logotypy w publicznym buildzie wymagają udokumentowanej zgody.
- Prywatny `assets-local` nie wchodzi do repo ani otwartej licencji.
- Bez jingli, reklamowych assetów i sugerowania partnerstwa.
- Firmware łączy się bezpośrednio z publicznym streamem operatora.
- Projekt nie nagrywa, nie retransmituje i nie publikuje audio.
- Operator może zgłosić usunięcie lub korektę endpointu.

## Model rekordu

```json
{
  "id": "stable-station-id",
  "display_name": "Station name",
  "operator": "Operator",
  "country": "PL",
  "language": "pl",
  "region": null,
  "stream_url": "https://example.invalid/stream.mp3",
  "codec": "mp3",
  "sample_rate_hz": 44100,
  "bitrate_kbps": 128,
  "source_page": "https://example.invalid/player",
  "checked_at": "YYYY-MM-DD",
  "hardware_status": "untested"
}
```

URL w przykładzie jest celowo nieaktywny. Prawdziwe endpointy powstaną dopiero
po audycie operatora i testach technicznych.

Motyw stacji jest osobnym rekordem z obowiązkowym `artwork_rights`; szczegóły
opisuje `docs/21-station-art-direction.md`.
