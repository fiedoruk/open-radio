import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createAutonomyLayer} from "../autonomy/autonomy-layer.mjs";
import {createMemoryServiceCache, runBoundedService} from "../autonomy/bounded-service.mjs";
import {buildWeatherUrl, parseWeather} from "../weather/open-meteo-adapter.mjs";
import {parseIpLocation} from "../location/ip-location-adapter.mjs";

const ipPayload = {
  success: true,
  city: "Białystok",
  country_code: "PL",
  latitude: 53.1325,
  longitude: 23.1688,
  timezone: {id: "Europe/Warsaw"}
};

const weatherPayload = {
  timezone: "Europe/Warsaw",
  current: {temperature_2m: 18.6, weather_code: 61},
  hourly: {
    time: ["2026-07-14T10:00", "2026-07-14T11:00", "2026-07-14T12:00"],
    precipitation_probability: [20, 72, 40]
  }
};

const response = payload => ({ok: true, status: 200, json: async () => structuredClone(payload)});

test("S19 contract keeps every enrichment optional and bounded", async () => {
  const contract = JSON.parse(await readFile(new URL("../ui-contract/autonomy/autonomy-layer.v1.json", import.meta.url), "utf8"));
  assert.equal(contract.automaticStart, "AFTER_APPROVED_SECURED_WIFI_ONLINE");
  assert.equal(contract.manualInputRequired, false);
  assert.equal(contract.playbackDependency, false);
  assert.equal(contract.services.weather.freshForSeconds, 1200);
  assert.equal(contract.failurePolicy.projectBackend, false);
  assert.equal(contract.failurePolicy.analytics, false);
});

test("IP provider response becomes a bounded automatic location fact", () => {
  assert.deepEqual(parseIpLocation(ipPayload, 1000), {
    source: "IP_GEOLOCATION",
    latitude: 53.1325,
    longitude: 23.1688,
    accuracyMeters: 25000,
    locality: "Białystok",
    countryCode: "PL",
    timezone: "Europe/Warsaw",
    observedAtEpochSeconds: 1000
  });
  assert.throws(() => parseIpLocation({...ipPayload, latitude: 100}, 1000), /latitude/);
});

test("weather adapter requests only the compact forecast and raises precipitation warning", () => {
  const url = new URL(buildWeatherUrl({latitude: 53.13, longitude: 23.17}));
  assert.equal(url.origin + url.pathname, "https://api.open-meteo.com/v1/forecast");
  assert.equal(url.searchParams.get("forecast_hours"), "6");
  assert.equal(url.searchParams.get("current"), "temperature_2m,weather_code");
  assert.deepEqual(parseWeather(weatherPayload, 1000), {
    temperatureC: 19,
    weatherCode: 61,
    precipitationProbability: 72,
    precipitationInMinutes: 60,
    warning: "PRECIPITATION_SOON",
    timezone: "Europe/Warsaw",
    observedAtEpochSeconds: 1000
  });
});

test("bounded service prefers fresh cache and falls back to stale cache", async () => {
  const cache = createMemoryServiceCache([["demo", {fetchedAtEpochSeconds: 900, data: {value: 1}}]]);
  let calls = 0;
  const fresh = await runBoundedService({serviceId: "demo", cacheKey: "demo", cache, nowEpochSeconds: 1000, freshForSeconds: 200, maximumStaleSeconds: 1000, execute: async () => { calls += 1; }});
  assert.equal(fresh.status, "FRESH_CACHE");
  assert.equal(calls, 0);
  const stale = await runBoundedService({serviceId: "demo", cacheKey: "demo", cache, nowEpochSeconds: 1200, freshForSeconds: 200, maximumStaleSeconds: 1000, maximumAttempts: 2, backoffSeconds: [0], sleep: async () => {}, execute: async () => { throw Object.assign(new Error("offline"), {code: "OFFLINE"}); }});
  assert.equal(stale.status, "STALE_CACHE");
  assert.equal(stale.errorCode, "OFFLINE");
  assert.equal(stale.attempts, 2);
});

test("autonomy layer resolves location weather time and global suggestions", async () => {
  const requested = [];
  const fetchImpl = async url => {
    requested.push(String(url));
    return String(url).startsWith("https://ipwho.is/") ? response(ipPayload) : response(weatherPayload);
  };
  const layer = createAutonomyLayer({fetchImpl, syncTimeImpl: async request => request.server === "pool.ntp.org", now: () => 1000, sleep: async () => {}});
  const result = await layer.run({approvedWifiProfileRef: "wifi:home"});
  assert.equal(result.status, "READY");
  assert.equal(result.location.status, "LIVE");
  assert.equal(result.weather.data.warning, "PRECIPITATION_SOON");
  assert.equal(result.time.status, "SYNCHRONIZED");
  assert.deepEqual(result.suggestions, {
    locale: "pl",
    countryCode: "PL",
    timezone: "Europe/Warsaw",
    stationRegion: "Białystok",
    weatherCoordinates: {latitude: 53.1325, longitude: 23.1688}
  });
  assert.equal(requested.length, 2);
});

test("provider outage never throws and never blocks radio state", async () => {
  const layer = createAutonomyLayer({fetchImpl: async () => { throw Object.assign(new Error("offline"), {code: "OFFLINE"}); }, now: () => 1000, sleep: async () => {}});
  const result = await layer.run({approvedWifiProfileRef: "wifi:home"});
  assert.equal(result.status, "DEGRADED");
  assert.equal(result.location.status, "UNAVAILABLE");
  assert.equal(result.weather.status, "SKIPPED_NO_LOCATION");
  assert.equal(result.time.status, "NOT_IMPLEMENTED");
  assert.equal(result.suggestions, null);
});

test("cached service results prevent repeated provider traffic", async () => {
  let calls = 0;
  const fetchImpl = async url => {
    calls += 1;
    return String(url).startsWith("https://ipwho.is/") ? response(ipPayload) : response(weatherPayload);
  };
  const layer = createAutonomyLayer({fetchImpl, now: () => 1000, sleep: async () => {}});
  await layer.run({approvedWifiProfileRef: "wifi:home"});
  const cached = await layer.run({approvedWifiProfileRef: "wifi:home"});
  assert.equal(cached.location.status, "FRESH_CACHE");
  assert.equal(cached.weather.status, "FRESH_CACHE");
  assert.equal(calls, 2);
});
