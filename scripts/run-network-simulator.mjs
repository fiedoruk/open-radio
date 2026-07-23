import {readFile} from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fixture = JSON.parse(await readFile(new URL("ui-contract/fixtures/network-traces.json", root), "utf8"));
const header = ["SCENARIO", "STATUS", "SELECTED", "RETRY_AT_MS", "STEPS"];
const rows = fixture.traces.map(item => [
  item.scenarioId,
  item.status,
  item.selectedProfileRef || "-",
  item.retryAtMs === null ? "-" : String(item.retryAtMs),
  String(item.trace.length)
]);
const widths = header.map((value, index) => Math.max(value.length, ...rows.map(row => row[index].length)));
const format = row => row.map((value, index) => value.padEnd(widths[index])).join("  ").trimEnd();
process.stdout.write(`${format(header)}\n${widths.map(width => "-".repeat(width)).join("  ")}\n`);
for (const row of rows) process.stdout.write(`${format(row)}\n`);
const counts = rows.reduce((summary, row) => ({...summary, [row[1]]: (summary[row[1]] || 0) + 1}), {});
process.stdout.write(`SUMMARY selected=${counts.SELECTED || 0} prompt=${counts.PROMPT_REQUIRED || 0} retry=${counts.RETRY_SCHEDULED || 0}\n`);
