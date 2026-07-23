import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

import {LocationSources, selectBestLocation} from "../location/auto-location.mjs";

const contract = JSON.parse(await readFile(new URL("../ui-contract/location/auto-location.v1.json", import.meta.url)));
const services = JSON.parse(await readFile(new URL("../ui-contract/network/approved-public-services.v1.json", import.meta.url)));
const nowEpochSeconds = 2_000_000_000;
const candidate = (source, accuracyMeters, ageSeconds = 60) => ({
  source,
  latitude: 53.1325,
  longitude: 23.1688,
  accuracyMeters,
  resolvedAtEpochSeconds: nowEpochSeconds - ageSeconds
});

test("automatic location starts after approved Wi-Fi and defaults to keyless IP lookup", () => {
  assert.equal(contract.defaultMode, "AUTO_OPTIMIZE");
  assert.equal(contract.automaticStart, "AFTER_APPROVED_SECURED_WIFI_ONLINE");
  assert.equal(contract.continuousTracking, false);
  assert.equal(contract.ipProvider.authentication, "NONE");
  assert.equal(contract.sources.find(source => source.id === "IP_GEOLOCATION").defaultEnabled, true);
  assert.equal(contract.sources.find(source => source.id === "WIFI_POSITIONING").defaultEnabled, false);
});

test("manual correction and a fresh saved network location beat external estimates", () => {
  const automatic = selectBestLocation([
    candidate(LocationSources.IP_GEOLOCATION, 12000),
    candidate(LocationSources.SAVED_NETWORK_LOCATION, 800)
  ], {nowEpochSeconds});
  assert.equal(automatic.selected.source, LocationSources.SAVED_NETWORK_LOCATION);

  const corrected = selectBestLocation([
    automatic.selected,
    candidate(LocationSources.MANUAL_OVERRIDE, 50000, 9_000_000)
  ], {nowEpochSeconds});
  assert.equal(corrected.selected.source, LocationSources.MANUAL_OVERRIDE);
});

test("device and Wi-Fi positioning can improve IP geolocation without becoming required", () => {
  const deviceResult = selectBestLocation([
    candidate(LocationSources.IP_GEOLOCATION, 12000),
    candidate(LocationSources.ONBOARDING_DEVICE_GEOLOCATION, 40),
    candidate(LocationSources.WIFI_POSITIONING, 120)
  ], {nowEpochSeconds});
  assert.equal(deviceResult.selected.source, LocationSources.ONBOARDING_DEVICE_GEOLOCATION);

  const wifiResult = selectBestLocation([
    candidate(LocationSources.IP_GEOLOCATION, 12000),
    candidate(LocationSources.WIFI_POSITIONING, 120)
  ], {nowEpochSeconds});
  assert.equal(wifiResult.selected.source, LocationSources.WIFI_POSITIONING);
});

test("stale automatic results fall back safely and malformed candidates are ignored", () => {
  const result = selectBestLocation([
    candidate(LocationSources.IP_GEOLOCATION, 12000, contract.selection.maximumAgeSeconds + 1),
    {...candidate(LocationSources.WIFI_POSITIONING, 100), latitude: 200},
    candidate(LocationSources.COUNTRY_DEFAULT, 150000)
  ], {nowEpochSeconds, maximumAgeSeconds: contract.selection.maximumAgeSeconds});
  assert.equal(result.selected.source, LocationSources.COUNTRY_DEFAULT);
});

test("approved services are direct, optional and contain no project backend", () => {
  assert.equal(services.projectBackend, false);
  assert.ok(services.services.some(service => service.id === "time-sync"));
  assert.ok(!services.services.some(service => ["ip-location", "weather"].includes(service.id)));
  assert.equal(services.services.filter(service => service.id.startsWith("artwork-")).length, 0);
  assert.ok(services.services.every(service => service.requiredForPlayback === false));
  assert.ok(services.services.every(service => service.authentication === "NONE"));
  assert.equal(contract.dataEgress.analytics, false);
  assert.equal(contract.dataEgress.projectBackend, false);
  assert.equal(contract.diagnostics.exportExactCoordinates, false);
});
