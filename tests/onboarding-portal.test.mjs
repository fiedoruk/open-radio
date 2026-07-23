import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = async name => readFile(new URL(`network-onboarding/${name}`, root), "utf8");

// This page is the entire first-run experience: an installer standing in a
// hallway with a phone, on a captive access point with no internet. Every
// assertion here corresponds to a failure measured in a real browser at a real
// phone width, not to a style preference.

test("the network row cannot be pushed wider than a narrow phone", async () => {
  const css = await read("styles.css");
  // Measured 2026-07-21 at a 320 px viewport: a grid item defaults to
  // min-width:auto, which resolves to min-content, so a row holding an
  // unbreakable 32-character SSID (Osiedlowa-Siec-24GHz-Goscie-0042 in the
  // fixtures) refused to shrink and scrolled the setup page sideways by 26 px.
  const row = css.match(/^\.network \{[^}]*\}/m)?.[0] ?? "";
  assert.match(row, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/, "the flexible column must be allowed to shrink");
  assert.match(row, /min-width:\s*0/, "the row itself must be allowed to shrink");
  assert.match(css, /\.network > span \{[^}]*min-width:\s*0/, "the text column must be allowed to shrink");
  assert.match(css, /\.network strong \{[^}]*overflow-wrap:\s*anywhere/, "an SSID has no spaces to break at");
});

test("page height follows the phone viewport rather than the URL bar", async () => {
  const css = await read("styles.css");
  const body = css.match(/^body \{[^}]*\}/m)?.[0] ?? "";
  // iOS Safari counts the collapsing URL bar into 100vh, so a 100vh page is
  // taller than the screen and shifts while scrolling. dvh follows the visible
  // viewport; the vh line stays first as the fallback for older engines.
  assert.match(body, /min-height:\s*100vh/, "keep the fallback for engines without dvh");
  assert.match(body, /min-height:\s*100dvh/, "modern engines must use the dynamic viewport");
  assert.ok(body.indexOf("100vh") < body.indexOf("100dvh"), "the fallback must come first or it wins");
});

test("edge-to-edge painting gives the safe area its insets back", async () => {
  const [html, css] = await Promise.all([read("index.html"), read("styles.css")]);
  const viewport = html.match(/<meta name="viewport" content="([^"]+)"/)?.[1] ?? "";
  assert.match(viewport, /viewport-fit=cover/, "paint under the notch");
  assert.match(viewport, /width=device-width/);
  assert.doesNotMatch(viewport, /user-scalable=no|maximum-scale/, "pinch zoom must stay available");
  // Having claimed the full screen, the shell owes back the top, bottom, left
  // and right insets, or content sits under the notch and the home indicator.
  for (const side of ["top", "bottom", "left", "right"]) {
    assert.match(css, new RegExp(`env\\(safe-area-inset-${side}\\)`), `${side} inset is unclaimed`);
  }
});

test("the browser chrome matches the page instead of framing it in grey", async () => {
  const [html, css] = await Promise.all([read("index.html"), read("styles.css")]);
  const themeColor = html.match(/<meta name="theme-color" content="([^"]+)"/)?.[1] ?? null;
  assert.ok(themeColor, "Android paints its address bar with this");
  assert.ok(css.includes(themeColor), `theme-color ${themeColor} does not appear in the stylesheet`);
});

test("typing a Wi-Fi password never zooms the page or fights autocorrect", async () => {
  const html = await read("index.html");
  const inputs = html.match(/<input [^>]*>/g) ?? [];
  assert.ok(inputs.length >= 2);
  for (const input of inputs) {
    // iOS zooms into any focused field under 16px; the sheet sets `font: inherit`
    // and never overrides the 16px root, so an explicit size here would be a
    // regression rather than a fix.
    assert.doesNotMatch(input, /font-size/, "input font-size belongs in the stylesheet, at 16px or above");
    assert.match(input, /autocapitalize="none"/);
    assert.match(input, /autocorrect="off"/);
    assert.match(input, /spellcheck="false"/);
    assert.match(input, /enterkeyhint="(go|next|done|send|search)"/, "the phone keyboard should name the next action");
  }
});

test("every control stays a comfortable tap target", async () => {
  const css = await read("styles.css");
  const button = css.match(/^button \{[^}]*\}/m)?.[0] ?? "";
  assert.match(button, /min-height:\s*44px/, "44px is the smallest reliable touch target");
});

test("the portal loads nothing from the network it is configuring", async () => {
  // The access point has no internet while this page is open, so any external
  // reference is a permanently broken one, not a slow one.
  for (const name of ["index.html", "styles.css", "app.mjs", "state-machine.mjs"]) {
    // No exception for XML namespace URIs, even though they are identifiers and
    // never fetched: check-firmware-surface.mjs cannot tell them apart from an
    // endpoint, so a portal that contains one fails the product gate anyway.
    // This test agreeing with that gate is worth more than being clever.
    const source = await read(name);
    assert.doesNotMatch(source, /https?:\/\/(?!127\.0\.0\.1)/, `${name} reaches outside the device`);
    assert.doesNotMatch(source, /@import\s+url|<link[^>]+href="\/\//, `${name} pulls a remote stylesheet`);
  }
});

test("the portal draws the cube's icons, not its own lookalikes", async () => {
  const [html, sprite] = await Promise.all([
    read("index.html"),
    readFile(new URL("ui-contract/icons/tabler-core2.svg", root), "utf8")
  ]);
  const inlined = [...html.matchAll(/<symbol id="([^"]+)"[\s\S]*?<\/symbol>/g)];
  assert.ok(inlined.length >= 4, "the portal should share the device icon set");
  const flatten = value => value.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
  for (const [markup, id] of inlined) {
    const start = sprite.indexOf(`<symbol id="${id}"`);
    assert.ok(start >= 0, `${id} is not in ui-contract/icons/tabler-core2.svg`);
    const canonical = sprite.slice(start, sprite.indexOf("</symbol>", start) + "</symbol>".length);
    // One icon set, two renderers. If the cube's sprite is edited and the
    // portal copy is not, the phone and the device stop looking like one
    // product, and nobody would notice until a photograph.
    assert.equal(flatten(markup), flatten(canonical), `${id} drifted from the device sprite`);
  }
  // Every inlined symbol has to be referenced, or it is dead weight in a flash
  // image we ship to other people. Some references are built at runtime, so the
  // script counts too.
  const app = await read("app.mjs");
  for (const [, id] of inlined) {
    assert.ok(html.includes(`href="#${id}"`) || app.includes(`"#${id}"`), `${id} is inlined but never used`);
  }
});

test("no text glyph stands in for an icon we already ship", async () => {
  const html = await read("index.html");
  const body = html.slice(html.indexOf("<body"));
  for (const glyph of ["✓", "●", "○", "←"]) {
    assert.ok(!body.includes(glyph), `${glyph} should be a sprite reference, not a character`);
  }
});

test("the portal's factory nine is the catalog's nine, name for name", async () => {
  const [app, catalog] = await Promise.all([
    read("app.mjs"),
    readFile(new URL("ui-contract/catalog/stations.pl.json", root), "utf8").then(JSON.parse)
  ]);
  const match = app.match(/defaultNineNames = \[([\s\S]*?)\]/);
  assert.ok(match, "portal must declare defaultNineNames");
  const declared = [...match[1].matchAll(/"([^"]+)"/g)].map(hit => hit[1]);
  // The pre-filled picker shows these names as the factory slots; if they
  // drift from the catalog, the installer is shown a nine that is not the
  // nine the cube will play.
  assert.deepEqual(declared, catalog.stations.map(station => station.name));
});
