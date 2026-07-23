import {readFile} from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fixture = JSON.parse(await readFile(new URL("ui-contract/fixtures/persistence-traces.json", root), "utf8"));
const header = ["SCENARIO", "WRITE", "BOOT", "SLOT", "GEN", "MIGRATED", "REJECTIONS"];
const rows = fixture.traces.map(item => [
  item.scenarioId,
  item.write?.phase || "-",
  item.boot.status,
  item.boot.selectedSlotId || "-",
  item.boot.selectedGeneration === null ? "-" : String(item.boot.selectedGeneration),
  item.boot.migratedFromVersion === null ? "-" : String(item.boot.migratedFromVersion),
  item.boot.rejections.map(rejection => `${rejection.slotId}:${rejection.reason}`).join(",") || "-"
]);
const widths = header.map((value, index) => Math.max(value.length, ...rows.map(row => row[index].length)));
const format = row => row.map((value, index) => value.padEnd(widths[index])).join("  ").trimEnd();
process.stdout.write(`${format(header)}\n${widths.map(width => "-".repeat(width)).join("  ")}\n`);
for (const row of rows) process.stdout.write(`${format(row)}\n`);
const counts = rows.reduce((summary, row) => ({...summary, [row[2]]: (summary[row[2]] || 0) + 1}), {});
process.stdout.write(`SUMMARY bootable=${counts.BOOTABLE || 0} safe_mode=${counts.SAFE_MODE || 0}\n`);
