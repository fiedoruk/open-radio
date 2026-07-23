# 68 — Loop S13: brand, global GUI and themed renderer

> Superseded by S15 for typography and logo selection: Signal Cube A2 is
> canonical and the product uses built-in typography only.

**Date:** 2026-07-14

**Mode:** software-only

**Boundary:** no font piracy, no remote assets, no runtime catalog update, no
firmware flash, public release or hardware claim

## Goal

Turn the GUI Lab into a branded and internationally reusable visual contract,
then move the parts that can be legally and deterministically compiled into the
shared RGB565 renderer.

## Delivered

- built-in-only typography with no runtime font download,
- Signal Cube A2 as the canonical mark with positive, negative, mono and micro
  variants,
- Dark B default and complete Light A alternative,
- embedded country-pack schema, Polish launch pack and generic build-time
  template,
- About Pro, diagnostics and market-pack GUI paths,
- generated light/dark RGB565 tokens and six Tabler 24×24 masks,
- focused `qa:gui` closure command and broader repository gate coverage.

## Exit condition

- browser GUI paths pass semantic and visual QA,
- renderer generation, native tests and deterministic hash pass,
- public EN/PL documentation stays in parity,
- full repository check and `git diff --check` pass,
- max Simplify Gate records remaining license and hardware risks.

H1 remains the next physical program after hardware arrival. No external font
or atlas is part of that program.
