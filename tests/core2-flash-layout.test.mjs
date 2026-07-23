import assert from "node:assert/strict";
import {execFileSync, spawnSync} from "node:child_process";
import {mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url);
const validator = new URL("scripts/validate-core2-flash-layout.py", root);

const partitionRecords = [
  [1, 2, 0x9000, 0x5000, "nvs"],
  [1, 0, 0xe000, 0x2000, "otadata"],
  [0, 0x10, 0x10000, 0x640000, "app0"],
  [0, 0x11, 0x650000, 0x640000, "app1"],
  [1, 0x82, 0xc90000, 0x370000, "spiffs"]
];
const otaCrc = new Map([
  [1, 0x4743989a],
  [2, 0x55f63774]
]);

function partitionTable(overrides = {}) {
  const table = Buffer.alloc(0x1000, 0xff);
  partitionRecords.forEach((record, index) => {
    const [type, subtype, originalOffset, size, label] = record;
    const offset = overrides[label] ?? originalOffset;
    const cursor = index * 32;
    table.writeUInt16LE(0x50aa, cursor);
    table.writeUInt8(type, cursor + 2);
    table.writeUInt8(subtype, cursor + 3);
    table.writeUInt32LE(offset, cursor + 4);
    table.writeUInt32LE(size, cursor + 8);
    table.fill(0, cursor + 12, cursor + 28);
    table.write(label, cursor + 12, "ascii");
    table.writeUInt32LE(0, cursor + 28);
  });
  return table;
}

function otaData(sequence, crc = otaCrc.get(sequence)) {
  const data = Buffer.alloc(0x2000, 0xff);
  data.writeUInt32LE(sequence, 0);
  data.writeUInt32LE(0xffffffff, 24);
  data.writeUInt32LE(crc, 28);
  return data;
}

async function fixture(partitions, otadata) {
  const directory = await mkdtemp(join(tmpdir(), "open-radio-layout-"));
  const partitionPath = join(directory, "partitions.bin");
  const otaPath = join(directory, "otadata.bin");
  await writeFile(partitionPath, partitions);
  await writeFile(otaPath, otadata);
  return {directory, partitionPath, otaPath};
}

test("live flash layout accepts the exact app0 OTA geometry", async () => {
  const files = await fixture(partitionTable(), otaData(1));
  try {
    const output = execFileSync(
      "python3",
      [validator.pathname, files.partitionPath, files.otaPath,
       "--expected-active", "app0"],
      {encoding: "utf8"}
    );
    assert.match(output, /PASS flash-layout active=app0 ota_seq=1/);
  } finally {
    await rm(files.directory, {recursive: true, force: true});
  }
});

test("live flash layout rejects a different active slot", async () => {
  const files = await fixture(partitionTable(), otaData(2));
  try {
    const result = spawnSync(
      "python3",
      [validator.pathname, files.partitionPath, files.otaPath,
       "--expected-active", "app0"],
      {encoding: "utf8"}
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /ACTIVE_SLOT_MISMATCH:app1/);
  } finally {
    await rm(files.directory, {recursive: true, force: true});
  }
});

test("live flash layout rejects geometry drift and corrupt OTA data", async () => {
  const geometry = await fixture(partitionTable({app1: 0x660000}), otaData(1));
  const corruptOta = await fixture(partitionTable(), otaData(1, 0));
  try {
    const geometryResult = spawnSync(
      "python3",
      [validator.pathname, geometry.partitionPath, geometry.otaPath,
       "--expected-active", "app0"],
      {encoding: "utf8"}
    );
    assert.notEqual(geometryResult.status, 0);
    assert.match(geometryResult.stderr, /PARTITION_LAYOUT_MISMATCH:app1/);

    const otaResult = spawnSync(
      "python3",
      [validator.pathname, corruptOta.partitionPath, corruptOta.otaPath,
       "--expected-active", "app0"],
      {encoding: "utf8"}
    );
    assert.notEqual(otaResult.status, 0);
    assert.match(otaResult.stderr, /OTADATA_NO_VALID_ENTRY/);
  } finally {
    await rm(geometry.directory, {recursive: true, force: true});
    await rm(corruptOta.directory, {recursive: true, force: true});
  }
});
