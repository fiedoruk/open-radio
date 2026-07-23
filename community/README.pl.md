# Dowody społecznościowe

[English version](README.md)

Ten katalog definiuje bezpieczne prywatnościowo dowody, które można zwalidować
i odtworzyć bez sprzętu oraz dostępu do sieci.

## Formaty

- Zgodność Bluetooth zapisuje klasę możliwości i ograniczone wyniki.
- Odtwarzanie stacji zapisuje kanoniczne ID stacji, zadeklarowany kodek i przedział czasu.
- Replay callbacków przyjmuje wyłącznie zwarte fakty obsługiwane już przez ingress.

Żaden format nie przyjmuje swobodnego tekstu, danych logowania, adresów, URL-i
endpointów, logów serial, PCM, tożsamości słuchacza ani grafik. Przed
udostępnieniem JSON uruchom `npm run validate:community`.
