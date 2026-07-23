# 110 — Choosing the nine

[Wersja polska](110-choosing-the-nine.pl.md)

**Purpose:** record how the installer chooses stations in release 0.2
**Covers:** the first-run portal, the embedded directory, the NVS slots
**Does not authorise:** device writes or a release

## Why the choice comes before Wi-Fi

In AP+STA mode the ESP32 moves its soft access point onto the router's channel
the moment the station interface associates — and drops every client. The phone
loses the network regardless of whether the server survives. Everything that
needs the phone therefore has to happen **before** the cube receives the
password. The portal's order is forced by physics, not chosen: stations first,
Wi-Fi last.

## Two paths

The portal opens on "Which stations should it play?". **The ready-made nine**
is one tap — the slots stay factory and setup proceeds straight to Wi-Fi.
**I will choose** opens a list of 290 stations with a search box and a strip of
nine slots mirroring the cube's face. Tapping a station takes the first free
slot; tapping it again frees it. Nine is the whole product — there is no
"add more".

## Where the list comes from and why it is compiled in

The directory (`ui-contract/catalog/pl-directory.v1.json`) starts from a
radio-browser sweep, but **every entry answered our own raw-socket probe** — a
third party's measurement does not enter the product as our guarantee. As of
2026-07-21: 290 stations, 393 endpoints, 76 stations with alternates. The list
is compiled in because the access point has, by definition, no internet — a
live catalog is not an option at the moment the choice is made.

Names are cleaned of community artefacts (trailing bitrates, the "-om" suffix,
pipe-separated slogans), and a bare trailing number is only treated as a
bitrate when it is a value encoders actually emit — Radio 357 and Radio 90 are
station names.

## One QC for both paths

A station chosen from the directory rotates through its verified endpoints on
**the same wheel** the curated nine use, and counts an exhausted lap the same
way. Quality of service does not depend on which path put a station into a
slot.

## The device contract

`GET /api/directory` returns indices, names and endpoint counts — **never
URLs**: the device already holds those and the portal posts back numbers.
`POST /api/slots` takes nine indices (−1 = keep the factory station) and
rejects the layout **whole** on any error — a half-applied layout is a cube
whose screen lies about what it plays. The screen refreshes immediately through
a callback, not after a reboot. Persistent state is nine int16 values in NVS
(`slots1`) plus a format-version byte; an unknown version means "absent", not
migration — the worst case is a cube playing its factory nine, which is a
working radio.

## What a directory pick does not give you

Logos. A directory station gets a monogram cut from the first meaningful word
of its name ("Radio" alone identifies nothing in a Polish directory). Fetching
artwork needs the internet and the cube as an intermediary — that is console
scope, after Wi-Fi, together with the relay. A full reset (the settings button)
also clears the slots: `nvs_flash_erase()` wipes the whole partition and the
cube boots as new.

## Gate

`npm run check`: 36 gates, 232 tests, no failures. Both paths walked in a
browser at a 320 px viewport with no horizontal overflow at any step.
