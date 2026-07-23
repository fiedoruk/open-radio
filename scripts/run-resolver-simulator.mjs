import {readFile} from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fixture = JSON.parse(await readFile(new URL("ui-contract/fixtures/resolver-traces.json", root), "utf8"));
const header = ["STATION", "STATUS", "SELECTED", "STEPS", "RETRY_AT_MS"];
const rows = fixture.traces.map(item => [
  item.stationId,
  item.status,
  item.selectedCandidateId || "-",
  String(item.trace.length),
  item.retryAtMs === null ? "-" : String(item.retryAtMs)
]);
const widths = header.map((value, index) => Math.max(value.length, ...rows.map(row => row[index].length)));
const format = row => row.map((value, index) => value.padEnd(widths[index])).join("  ").trimEnd();
process.stdout.write(`${format(header)}\n${widths.map(width => "-".repeat(width)).join("  ")}\n`);
for (const row of rows) process.stdout.write(`${format(row)}\n`);
const counts = rows.reduce((summary, row) => ({...summary, [row[1]]: (summary[row[1]] || 0) + 1}), {});
process.stdout.write(`SUMMARY playing=${counts.PLAYING || 0} retry=${counts.RETRY_SCHEDULED || 0} unsupported=${counts.UNSUPPORTED || 0}\n`);
