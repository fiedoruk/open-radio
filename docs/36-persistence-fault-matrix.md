# 36 — Persistence fault matrix

| Scenario | New slot state | Boot result | Required behavior |
|---|---|---|---|
| successful commit | complete + `COMMITTED` | new slot | promote generation 2 |
| loss before write | untouched/empty | previous slot | preserve generation 1 |
| loss during payload | partial + uncommitted | previous slot | reject new slot |
| loss before marker | complete + uncommitted | previous slot | reject new slot |
| checksum corruption | committed, bad CRC32 | previous slot | `CHECKSUM_MISMATCH` |
| malformed JSON with valid CRC32 | committed, unparsable | previous slot | `PAYLOAD_PARSE_ERROR` |
| valid legacy v1 | committed | same slot | migrate in memory to v2 |
| unsupported future v3 | committed | safe mode | no guessed migration |
| both slots empty | empty | safe mode | local recovery only |

Generated evidence is stored in
`ui-contract/fixtures/persistence-traces.json`. A readable summary is produced by
`npm run simulate:persistence` and stored in
`output/persistence/s5-summary.txt` during loop QC.

## Negative guarantees

- an uncommitted slot never wins,
- a higher generation never overrides failed validation,
- migration never mutates the input fixture,
- an invalid draft never writes any slot,
- trace output never contains payload text or credential references,
- boot and write tests use no wall-clock wait, internet or physical filesystem race.
