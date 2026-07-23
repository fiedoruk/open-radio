import {readdir, readFile} from "node:fs/promises";
import {pathToFileURL} from "node:url";

const root = new URL("../", import.meta.url);

const readText = relative => readFile(new URL(relative, root), "utf8");
const readJson = async relative => JSON.parse(await readText(relative));

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255);
  const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function contrastRatio(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function collectBoxes(value, path = "screens", boxes = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectBoxes(item, `${path}[${index}]`, boxes));
    return boxes;
  }
  if (!value || typeof value !== "object") return boxes;
  if (["x", "y", "width", "height"].every(key => Number.isInteger(value[key]))) boxes.push({path, ...value});
  for (const [key, child] of Object.entries(value)) collectBoxes(child, `${path}.${key}`, boxes);
  return boxes;
}

export async function validateGuiContract() {
  const [contract, nowPlayingExperience, autoLocation, autonomyLayer, approvedServices, catalog, stationCatalog, identities, appInfo, catalogPack, brand, sprite, iconReadme, iconLicense, guiHtml, guiApp, deviceFlow, guiCss, rgbPreview, logoA, logoANegative, logoAMono, logoAMicro, brandBoardHtml, brandBoardCss] = await Promise.all([
    readJson("ui-contract/gui/core2-pixel-system.v1.json"),
    readJson("ui-contract/gui/now-playing-experience.v1.json"),
    readJson("ui-contract/location/auto-location.v1.json"),
    readJson("ui-contract/autonomy/autonomy-layer.v1.json"),
    readJson("ui-contract/network/approved-public-services.v1.json"),
    readJson("ui-contract/catalog/stations.pl.json"),
    readJson("ui-contract/catalog/station-catalog.v1.json"),
    readJson("ui-contract/gui/station-identities.v1.json"),
    readJson("ui-contract/app/app-info.v1.json"),
    readJson("ui-contract/catalog/packs/pl-PL.v1.json"),
    readJson("brand/brand-concepts.v1.json"),
    readText("ui-contract/icons/tabler-core2.svg"),
    readText("ui-contract/icons/README.md"),
    readText("ui-contract/icons/TABLER-LICENSE.txt"),
    readText("gui-lab/index.html"),
    readText("gui-lab/app.mjs"),
    readText("gui-lab/device-flow.mjs"),
    readText("gui-lab/styles.css"),
    readText("gui-lab/rgb565-preview.mjs"),
    readText("brand/logo-a-signal-cube.svg"),
    readText("brand/logo-a-signal-cube-negative.svg"),
    readText("brand/logo-a-signal-cube-mono.svg"),
    readText("brand/logo-a-signal-cube-micro.svg"),
    readText("gui-lab/brand-a.html"),
    readText("gui-lab/brand-a.css")
  ]);
  const errors = [];
  const logos = [logoA];
  const logoAVariants = [logoANegative, logoAMono, logoAMicro];
  const {width, height} = contract.target;

  if (width !== 320 || height !== 240) errors.push("target viewport must be 320x240");
  if (contract.grid.unit !== 2) errors.push("base grid must be 2 pixels");
  if (contract.grid.minimumTouch < 44) errors.push("minimum touch target must be at least 44 pixels");
  if (contract.defaultTheme !== "dark") errors.push("dark theme B must be the default");
  if (JSON.stringify(contract.availableThemes) !== JSON.stringify(["dark", "light"])) errors.push("available theme order must be dark, light");
  if (contract.typography.fontPlan !== "bundled-offline-generated-atlas") errors.push("typography must use the bundled generated atlas");
  if (contract.typography.browserFamily !== "none-framebuffer-only" || contract.typography.firmwareFamily !== "Inter 600") errors.push("device typography must come only from the Inter framebuffer atlas");
  if (contract.typography.runtimeDownload !== false || contract.typography.license !== "OFL-1.1" || contract.typography.externalLicenseRequired !== true) errors.push("bundled font license and offline policy are incomplete");
  if (contract.typography.coverage !== "ASCII_LATIN1_LATIN_EXTENDED_A_SELECTED_PUNCTUATION" || contract.typography.unsupportedScriptPolicy !== "VISIBLE_FALLBACK_FUTURE_BUDGETED_ATLAS_PACK") errors.push("font coverage and unsupported-script policy must be explicit");
  if (JSON.stringify(contract.settingsPolicy.pages) !== JSON.stringify(["quick", "system", "display"])) errors.push("settings must expose quick, system and display pages");
  if (JSON.stringify(contract.settingsPolicy.quickActions) !== JSON.stringify(["wifi", "bluetooth", "volume", "brightness", "theme", "language"])) errors.push("quick settings action order is invalid");
  if (JSON.stringify(contract.settingsPolicy.systemActions) !== JSON.stringify(["now-playing-variant", "wifi-networks", "about", "diagnostics", "bluetooth-repair"])) errors.push("system settings action order is invalid");
  if (JSON.stringify(contract.settingsPolicy.boundedPercentValues) !== JSON.stringify([25, 50, 75, 100])) errors.push("volume and brightness values must stay bounded");
  if (JSON.stringify(contract.settingsPolicy.displayActions) !== JSON.stringify(["screensaver-enabled", "screensaver-delay", "screensaver-mode", "display-off-enabled", "display-off-delay", "preview"])) errors.push("display settings action order is invalid");
  if (JSON.stringify(contract.settingsPolicy.screensaverDelaySeconds) !== JSON.stringify([30, 60, 120, 300, 600]) || JSON.stringify(contract.settingsPolicy.displayOffDelaySeconds) !== JSON.stringify([900, 1800, 3600])) errors.push("display timer values must stay bounded");
  if (contract.settingsPolicy.localOnly !== true || contract.settingsPolicy.sourceEditRequired !== false || contract.settingsPolicy.cloudRequired !== false) errors.push("settings must stay local and source-edit free");
  if (JSON.stringify(nowPlayingExperience.variants) !== JSON.stringify(["editorial", "glance"]) || nowPlayingExperience.defaultVariant !== "editorial") errors.push("now-playing variants are invalid");
  if (nowPlayingExperience.metadata.source !== "ICY_STREAM_TITLE" || nowPlayingExperience.metadata.optional !== true || nowPlayingExperience.metadata.maxInputBytes > 192) errors.push("ICY metadata policy is invalid");
  if (nowPlayingExperience.weather.optional !== true || nowPlayingExperience.weather.locationSource !== "AUTO_OPTIMIZE" || nowPlayingExperience.weather.failureMode !== "HIDE_WIDGET_KEEP_RADIO_PLAYING") errors.push("optional weather policy is invalid");
  if (nowPlayingExperience.weather.locationContract !== "ui-contract/location/auto-location.v1.json") errors.push("weather location contract is missing");
  if (autoLocation.defaultMode !== "AUTO_OPTIMIZE" || autoLocation.automaticStart !== "AFTER_APPROVED_SECURED_WIFI_ONLINE" || autoLocation.continuousTracking !== false) errors.push("automatic location defaults are invalid");
  if (autoLocation.ipProvider.authentication !== "NONE" || autoLocation.sources.find(source => source.id === "IP_GEOLOCATION")?.defaultEnabled !== true) errors.push("keyless IP geolocation must be enabled by default");
  if (autoLocation.dataEgress.projectBackend !== false || autoLocation.dataEgress.analytics !== false) errors.push("automatic location must not add a project backend or analytics");
  if (autonomyLayer.manualInputRequired !== false || autonomyLayer.playbackDependency !== false || autonomyLayer.services.weather.freshForSeconds !== 1200 || autonomyLayer.failurePolicy.projectBackend !== false || autonomyLayer.failurePolicy.analytics !== false) errors.push("S19 autonomy layer contract is invalid");
  // device-console is the cube's OWN mDNS name (open-radio.local), not an
  // external service; it is listed so the surface gate can pin the literal.
  const expectedPublicServices = ["time-sync", "device-console"];
  if (approvedServices.projectBackend !== false || JSON.stringify(approvedServices.services.map(service => service.id)) !== JSON.stringify(expectedPublicServices)) errors.push("approved public service manifest is invalid");
  if (approvedServices.services.some(service => service.requiredForPlayback !== false || service.authentication !== "NONE")) errors.push("public enhancement services must stay optional and keyless");
  if (JSON.stringify(nowPlayingExperience.screensaver.modes) !== JSON.stringify(["pulse", "bars", "orbit", "cat"]) || nowPlayingExperience.screensaver.maximumFramesPerSecond > 12 || nowPlayingExperience.screensaver.hardwareStatus !== "NOT_MEASURED") errors.push("screensaver performance policy is invalid");
  if (nowPlayingExperience.screensaver.defaultEnabled !== true || nowPlayingExperience.screensaver.defaultActivationDelaySeconds !== 120 || nowPlayingExperience.screensaver.displayOffEnabled !== true || nowPlayingExperience.screensaver.defaultDisplayOffDelaySeconds !== 1800 || nowPlayingExperience.screensaver.displayOffScope !== "BACKLIGHT_AND_PANEL_ONLY_AUDIO_CONTINUES") errors.push("screensaver defaults are invalid");

  const boxes = collectBoxes(contract.screens);
  for (const box of boxes) {
    if (box.x < 0 || box.y < 0 || box.x + box.width > width || box.y + box.height > height) errors.push(`${box.path} exceeds viewport`);
    for (const key of ["x", "y", "width", "height"]) {
      if (!box.path.includes("Visual") && box[key] % contract.grid.unit !== 0) errors.push(`${box.path}.${key} is off the ${contract.grid.unit}px grid`);
    }
  }

  const interactivePaths = [
    "screens.nowPlaying.settings", "screens.nowPlaying.previous", "screens.nowPlaying.stations", "screens.nowPlaying.next",
    "screens.nowPlayingGlance.settings", "screens.nowPlayingGlance.previous", "screens.nowPlayingGlance.stations", "screens.nowPlayingGlance.next",
    "screens.screensaver.dismiss",
    "screens.stations.close", ...contract.screens.stations.cards.map((_, index) => `screens.stations.cards[${index}]`),
    "screens.settings.page", "screens.settings.close", ...contract.screens.settings.cards.map((_, index) => `screens.settings.cards[${index}]`),
    "screens.recovery.primary", "screens.onboarding.secondary", "screens.onboarding.primary",
    "screens.bluetoothPairing.close", ...contract.screens.bluetoothPairing.cards.map((_, index) => `screens.bluetoothPairing.cards[${index}]`),
    "screens.bluetoothPairing.primary",
    "screens.diagnostics.close", "screens.diagnostics.primary",
    "screens.about.close", "screens.about.primary", "screens.market.close", "screens.market.primary"
  ];
  for (const box of boxes.filter(candidate => interactivePaths.includes(candidate.path))) {
    if (box.width < contract.grid.minimumTouch || box.height < contract.grid.minimumTouch) errors.push(`${box.path} is smaller than the touch minimum`);
  }

  for (const [themeName, theme] of Object.entries(contract.themes)) {
    for (const backgroundName of ["canvas", "surface", "raised"]) {
      for (const foregroundName of ["text", "muted"]) {
        if (contrastRatio(theme[foregroundName], theme[backgroundName]) < 4.5) errors.push(`${themeName}.${foregroundName} fails on ${backgroundName}`);
      }
    }
    for (const semanticName of ["success", "warning", "danger"]) {
      if (contrastRatio(theme.canvas, theme[semanticName]) < 4.5) errors.push(`${themeName}.canvas fails on ${semanticName}`);
    }
    if (contrastRatio(theme.onBrand, theme.brand) < 4.5) errors.push(`${themeName}.onBrand fails on brand`);
  }

  const catalogIds = catalog.stations.map(station => station.id);
  const identityIds = identities.stations.map(station => station.id);
  if (JSON.stringify(catalogIds) !== JSON.stringify(identityIds)) errors.push("station identities do not match catalog order");
  if (identities.runtimeFetch !== "DISABLED" || identities.officialArtworkPolicy !== "disabled-project-original-identity-only") errors.push("station artwork runtime must stay disabled");
  for (const identity of identities.stations) {
    if (contrastRatio(identity.onAccent, identity.accent) < 4.5) errors.push(`${identity.id} accent contrast is below 4.5:1`);
    const artwork = identity.officialArtwork;
    if (artwork.status !== "NOT_BUNDLED" || artwork.permission !== "NOT_REQUESTED_BY_APP" || artwork.sourceUrl !== null || artwork.sha256 !== null) errors.push(`${identity.id} official artwork policy is incomplete`);
  }

  if (catalogPack.countryCode !== stationCatalog.stations[0]?.country || JSON.stringify(stationCatalog.stations.map(station => station.id)) !== JSON.stringify(identityIds)) errors.push("launch catalog pack does not match the canonical catalog");
  if (catalogPack.runtimeInstall !== false || catalogPack.remoteUpdate !== false) errors.push("catalog packs must stay embedded and offline");
  if (appInfo.telemetry !== false) errors.push("About Pro must report telemetry disabled");
  if (appInfo.hardwareStatus !== "NOT_MEASURED") errors.push("About Pro must not imply hardware validation");

  if (brand.typography?.strategy !== "BUNDLED_OFL_ATLAS" || brand.typography.family !== "Inter" || brand.typography.weight !== 600 || brand.typography.license !== "OFL-1.1" || brand.typography.runtimeDownload !== false) errors.push("brand manifest typography must pin the bundled Inter atlas");
  if (brand.interfacePalette?.primaryBlue !== "#3689FF" || brand.interfacePalette?.primaryBlueLight !== "#0B63CE") errors.push("Open Radio brand blue palette is invalid");
  if (brand.selectedLogo !== "signal-cube" || brand.concepts.length !== 1) errors.push("Signal Cube A2 must be the single canonical logo");
  const signalCube = brand.concepts.find(concept => concept.id === "signal-cube");
  if (!signalCube?.variants || signalCube.minimumSizePx !== 20 || signalCube.safeAreaUnits !== 16) errors.push("Signal Cube A2 variant and size policy is incomplete");
  for (const [index, logo] of logos.entries()) {
    if (!logo.includes("<svg") || !logo.includes('viewBox="0 0 160 160"')) errors.push(`logo concept ${index + 1} must be a self-contained 160x160 SVG`);
    if (/\b(?:src|href)=["']https?:\/\//.test(logo)) errors.push(`logo concept ${index + 1} must not request remote assets`);
  }
  for (const [index, logo] of logoAVariants.entries()) {
    const expectedViewBox = index === 2 ? 'viewBox="0 0 32 32"' : 'viewBox="0 0 160 160"';
    if (!logo.includes("<svg") || !logo.includes(expectedViewBox)) errors.push(`Signal Cube variant ${index + 1} has an invalid viewBox`);
    if (/\b(?:src|href)=["']https?:\/\//.test(logo)) errors.push(`Signal Cube variant ${index + 1} must not request remote assets`);
  }
  for (const asset of Object.values(signalCube?.variants || {})) if (!brandBoardHtml.includes(`../brand/${asset}`)) errors.push(`Signal Cube brand board is missing ${asset}`);
  if (!brandBoardHtml.includes("Signal Cube A2") || !brandBoardHtml.includes("Negative") || !brandBoardHtml.includes("Micro")) errors.push("Signal Cube A2 brand board is incomplete");
  if (!brandBoardCss.includes("grid-template-columns: repeat(4, 1fr)")) errors.push("Signal Cube A2 desktop comparison must show four variants side by side");
  for (const size of [32, 24, 20]) if (!brandBoardHtml.includes(`width="${size}" height="${size}"`)) errors.push(`Signal Cube A2 brand board is missing the ${size}px micro sample`);

  const expectedIcons = ["wifi", "bluetooth", "volume", "settings", "chevron-left", "chevron-right", "sun", "cloud", "cloud-rain", "umbrella", "moon", "alert-triangle", "shield-check", "refresh", "radio", "map-pin", "device-speaker", "info-circle", "x", "check", "menu-2"];
  for (const iconName of expectedIcons) if (!sprite.includes(`id="tabler-${iconName}"`)) errors.push(`missing Tabler icon ${iconName}`);
  if (!iconReadme.includes(contract.iconSource.version) || !iconReadme.includes(contract.iconSource.tagCommit)) errors.push("Tabler source pin is missing");
  if (!iconLicense.includes("MIT License")) errors.push("Tabler MIT license is missing");
  if ((guiHtml.match(/<canvas[^>]+width="320"[^>]+height="240"/g) || []).length !== 1) errors.push("device emulator must expose exactly one intrinsic 320x240 framebuffer canvas");
  for (const retired of ["data-render-mode", "data-preview-scale", "<svg", "RGB565 · urządzenie", "Firmware C++", "Projekt SVG"]) if (guiHtml.includes(retired)) errors.push(`device emulator contains retired lab UI: ${retired}`);
  if (!rgbPreview.includes("quantizeRgbaToRgb565") || !rgbPreview.includes("renderPpmAsRgb565") || !guiApp.includes("C++ → RGB565 · 320×240 · Inter 600")) errors.push("device emulator must expose the canonical RGB565 Inter framebuffer path");
  if (!guiCss.includes("width: 320px") || !guiCss.includes("height: 240px") || !guiCss.includes("image-rendering: pixelated")) errors.push("device emulator must remain exact 320x240 CSS pixels");
  if (/transform:\s*scale|zoom:|aspect-ratio/.test(guiCss)) errors.push("device emulator must not scale the framebuffer");
  if (guiCss.includes("@font-face")) errors.push("device emulator must not load a separate browser font over the framebuffer");
  if (/all[- ]round[- ]gothic/i.test(`${JSON.stringify(contract)}\n${JSON.stringify(brand)}\n${guiHtml}\n${guiApp}\n${guiCss}\n${brandBoardHtml}\n${brandBoardCss}`)) errors.push("retired custom font must not remain in active GUI assets");
  const deviceSource = `${guiApp}\n${deviceFlow}`;
  for (const behavior of ["activateQuick", "activateSystem", "activateDisplay", "changeStation", "pointerdown", "pointerup"]) if (!deviceSource.includes(behavior)) errors.push(`device behavior ${behavior} is missing`);
  for (const screen of ["now-playing-", "screensaver-", "display-off", "stations", "settings-quick", "settings-system", "settings-display"]) if (!deviceSource.includes(screen)) errors.push(`device screen ${screen} is missing`);
  if (/\b(?:src|href)=["']https?:\/\//.test(`${guiHtml}\n${guiApp}\n${guiCss}\n${brandBoardHtml}\n${brandBoardCss}\n${sprite}\n${logos.join("\n")}\n${logoAVariants.join("\n")}`)) errors.push("GUI Lab must not request remote assets");

  const repositoryEntries = await readdir(root, {recursive: true});
  const fontFiles = repositoryEntries.filter(path => /\.(?:otf|ttf|woff2?|eot)$/i.test(path)).sort();
  if (JSON.stringify(fontFiles) !== JSON.stringify(["third_party/fonts/inter/InterVariable.ttf"])) errors.push(`only the pinned Inter source font is allowed: ${fontFiles.join(", ")}`);

  return {valid: errors.length === 0, errors, boxes: boxes.length, stations: identities.stations.length, icons: expectedIcons.length, logos: logos.length, logoVariants: logoAVariants.length};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await validateGuiContract();
  if (!result.valid) throw new Error(result.errors.join("\n"));
  console.log(`PASS gui-contract boxes=${result.boxes} stations=${result.stations} icons=${result.icons} logos=${result.logos} logoVariants=${result.logoVariants}`);
}
