# 108 — Removing saved tracks

[Wersja polska](108-remove-favorites.pl.md)

**Purpose:** record the decision to delete the save-current-track feature
**Covers:** the UI contract, the renderer, the parity twin and NVS persistence
**Does not authorise:** device writes, audio-path changes or a release

## What went

Three screens — `Favorites`, `FavoriteDetail` and `TrackActions` — together with
both save paths: a long press on the title and the tap that opened the action
screen. Also gone: the favorites layer in `UiController`, the values in the
`Screen` and `TouchAction` enums, seven renderer snapshot fields, three drawing
functions, eleven renderer CLI flags, twelve simulator parameters, the
`favorite-save` marker in evidence collection, and
`PreferencesFavoriteRepository` with its 6224-byte NVS blob.

The public image shrank from 2,250,576 to **2,244,848 bytes**, a 5,728-byte drop.

## Why

The feature had been broken since July and the screen misbehaved on touch in
that area. Fixing it would have meant touching the audio loop, because touch is
coupled to it through the decoder budget — measured in July, when tripling that
budget lengthened loop runs and broke the screen's responsiveness. Release 0.2
freezes the audio surface, so a fix would have collided with its main gate.
Deleting the feature removes the bug with it and shrinks the surface before the
catalog work adds to it.

## What stayed

The now-playing title from ICY metadata is still displayed; only saving it is
gone. The title buffer received its own `kNowPlayingTitleBytes` constant, since
it previously shared a declaration with favorites and would have disappeared
alongside them.

A long press still wakes the display.

## Two things moved

**`confirmDelete` stayed.** It is a shared two-step confirmation that the secure
device reset also uses. Removing it would have let **a single touch erase the
configuration** instead of two.

**The secure reset moved from settings index 5 to 4** (tiles are numbered
`index = row*2 + column`), which puts it in the left column, because the
favorites tile ahead of it disappeared. Hardware button C on the stations screen
projected onto a tap inside the favorites hitbox; there is nothing there now and
the screen no longer changes.

## The old NVS blob

The `fav_a` and `fav_b` keys remain on devices that wrote them. Nothing reads
them any more and **this release erases nobody's storage**. The format never had
a migration: an unknown header always meant silently clearing the list.

## Gate

`npm run check`: 35 gates, 207 tests, no failures. Public build: `SUCCESS`.
Net change: roughly 900 lines removed against roughly 120 added.
