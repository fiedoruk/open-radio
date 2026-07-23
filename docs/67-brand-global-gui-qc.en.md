# 67 — Brand, global catalog and GUI quality gate

[Polska wersja](67-brand-global-gui-qc.pl.md)

## Scope

Poland remains the launch data pack, not a hard-coded product boundary. The UI,
resolver and pack schema must accept bounded country-specific station catalogs
without adding cloud services, runtime pack installation or automatic remote
updates.

## Built-in typography

The production renderer uses one bundled Inter 600 atlas. It is generated
offline from the checked-in OFL-licensed source and shared by the canonical
device emulator and firmware. There is no runtime font download or parser.

## Canonical logo

**Signal Cube A2** is the selected and only active product mark. It uses two
negative-space broadcast waves and a side beacon inside the appliance cube. The
system includes primary, negative, monochrome and 20-32 px micro variants with a
defined safe area. Alternative exploration marks are not part of the active UI.

## Settings flow

The device settings provide two local, touch-first pages. Quick settings expose
Wi-Fi, Bluetooth, volume, brightness, theme and language. System settings expose
region/catalog information, About Pro, diagnostics and local Wi-Fi/Bluetooth
repair paths. Every card performs an action; no routine option requires source
editing, a shell, an account or a cloud dashboard.

## Country packs

`catalog-pack.schema.json` defines country code, default and supported UI
locales, localized region labels, catalog/identity references, station limit and
offline policy. `pl-PL.v1.json` is the first embedded pack; the generic example
shows how maintainers can prepare another country at build time. Runtime
installation and remote update stay disabled.

## About Pro panel

The local About Pro screen exposes product/version, source-lock channel,
software-only hardware status, telemetry-off state, founder and website. It
links to local diagnostics rather than a cloud account or remote dashboard. The
market screen exposes the active pack, country, station count and UI locales.

## GUI and UX QC

`npm run qa:gui` is the focused closure gate: pixel geometry, touch targets,
contrast, local assets, built-in typography, the canonical A2 variants, settings
actions, station identity,
country pack validation, overflow and focused GUI/state/resolver tests. Browser
review additionally checks both themes, PL/EN, About Pro, market pack and
interactive paths at a real 320×240 viewport. Every GUI loop also runs the full
`npm run check`, `git diff --check` and a max Simplify Gate review.

## Firmware handoff

The host renderer now consumes generated Light A and Dark B RGB565 tokens,
defaults to Dark B and uses generated 24×24 Tabler masks. The bundled Inter
atlas is the final firmware typography path. H1 on physical Core2 remains
blocked until hardware arrives; the OFL text and source checksum are checked in.
