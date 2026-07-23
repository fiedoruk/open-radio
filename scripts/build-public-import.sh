#!/usr/bin/env bash
# Builds the sanitized public-import tree (ADR-012 D1) from the current HEAD:
# the launch surface is 0.2.1-only, so the 0.3 candidate study and the local
# planning notes stay behind, and the parity list follows. The result is a
# fresh git repo with a single provenance-carrying root commit, gate-checked,
# leak-scanned and rehearsal-pushed to a local bare mirror. Publishing the
# rehearsed tree to GitHub stays a separate owner-gated action.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="${1:?usage: build-public-import.sh <output-dir>}"
[[ -e "$out" ]] && { echo "REFUSED: $out already exists" >&2; exit 1; }

mkdir -p "$out"
git -C "$root" archive HEAD | tar -x -C "$out"
rm -f "$out/docs/115-0-3-candidates.en.md" "$out/docs/115-0-3-candidates.pl.md"
rm -rf "$out/docs/superpowers"
node -e '
const fs = require("node:fs");
const p = process.argv[1];
const line = "  [\"docs/115-0-3-candidates.en.md\", \"docs/115-0-3-candidates.pl.md\"],\n";
const t = fs.readFileSync(p, "utf8");
if (!t.includes(line)) throw new Error("parity pair for docs/115 not found");
fs.writeFileSync(p, t.replace(line, ""));
' "$out/scripts/check-docs-parity.mjs"

cd "$out"
npm run rehearse:rc1:write >/dev/null

git init -q -b main
git add -A

# The sweep guards exactly the bytes that would ship: the git index. Local
# rehearsal artifacts (gitignored dist/) never publish, so they are outside
# the surface. Two files legitimately carry the hunted byte patterns and are
# excepted: this script names the paths it trims, and the guard policy names
# the pattern it forbids. Bracketed classes keep the regexes themselves from
# matching this script's source when other guards scan it.
if git grep --cached -lE '[/]Users[/]|raport[-]claude|claude[.]ai[/]|docs[/]115|docs[/]superpowers' \
    -- ':!scripts/build-public-import.sh' ':!release/public-mirror-policy.json'; then
  echo "REFUSED: private markers above survived the export" >&2; exit 1
fi
git commit -q -m "Open Radio Core2 — public import at the 0.2.1 release state

Sanitized import per ADR-012 D1: a fresh public root carrying the current
tree. Release provenance: the shipped 0.2.1 binary was built from the
private code cut e4ec0c8d3e8a12407a983f6866e6be9750cfd6a8 (app SHA-256
98f0477a655cd42db42f6c806c059af9b8c33e6b0cd2eb6cd9b40d5fc1f44555, full
image 295ca3fdf9f9daf7a11ee979bc3371b2c79aaf48de5afe455668b72b23dc0546);
the canonical manifest is release/release-0-2-1.json and the exact
corresponding source ships next to the binary on fiedoruk.pl/os/."

npm run check
command -v gitleaks >/dev/null || { echo "REFUSED: gitleaks required" >&2; exit 1; }
gitleaks git . --no-banner --redact

bare="$(mktemp -d)/rehearsal-bare.git"
git init -q --bare "$bare"
git push -q --atomic "$bare" main
[[ "$(git rev-parse main)" == "$(git --git-dir="$bare" rev-parse main)" ]] || {
  echo "REFUSED: rehearsal OID mismatch" >&2; exit 1; }
rm -rf "$(dirname "$bare")"

printf 'PASS public-import root=%s files=%s\n' "$(git rev-parse HEAD)" "$(git ls-files | wc -l | tr -d ' ')"
