# 31 — Station provenance refresh, 2026-07-13

## Scope

This refresh confirms public operator surfaces and resolver classes for the nine
launch stations. It is not permission from broadcasters, a guarantee of endpoint
stability or physical playback evidence.

## Evidence table

| Station | Official surface | Resolver evidence | Catalog decision |
|---|---|---|---|
| RMF FM | `https://www.rmfon.pl/stacja/rmf-fm` | live operator API probe returned MP3 and AAC pools | RMFON JSON primary; player reference alternate |
| RMF MAXX | `https://www.rmfon.pl/stacja/rmf-maxx` | live operator API probe returned MP3 and AAC pools | RMFON JSON primary; player reference alternate |
| Radio ZET | `https://player.radiozet.pl/` | live Eurozet station API exposed operator stream metadata | Eurozet JSON primary; player reference alternate |
| TOK FM | `https://www.tokfm.pl/` | official help confirms free live radio through site/app | player parser audit required; help page reference alternate |
| Złote Przeboje | `https://radio.zloteprzeboje.pl/radio-online-sluchaj-za-darmo` | live Tuba JSON probe identified Radio Złote Przeboje | Tuba JSON primary; player reference alternate |
| Chillizet | `https://player.chillizet.pl/` | official player and Eurozet station ecosystem confirmed | Eurozet JSON primary; player reference alternate |
| VOX FM | `https://player.voxfm.pl/` | official player and Grupa ZPR Media ownership confirmed | ZPR HLS parser audit required |
| Radio ESKA | `https://player.eska.pl/?stream_uid=radio_eska` | official ESKA player and regional online offering confirmed | ZPR HLS parser audit required |
| ESKA Impreska | `https://player.eska.pl/?stream_uid=eska_impreska` | official ESKA player lists Impreska as an online channel | ZPR HLS parser audit required |

## Deliberately excluded data

- transient `rmfstream` hosts returned by RMF API,
- current StreamTheWorld/CDN redirects returned by Eurozet,
- stream query parameters and advertising metadata,
- direct HLS segment/CDN hosts,
- official logos and broadcaster artwork,
- TOK FM Premium or any authenticated variant.

## Current proof level

- public operator surfaces: confirmed on 2026-07-13,
- known resolver APIs: live-probed where documented in the catalog,
- transport classes: software model only,
- decoder: MP3 planned, HLS/HE-AAC pending,
- physical Core2 playback: untested,
- legal permission or endorsement: not claimed.
