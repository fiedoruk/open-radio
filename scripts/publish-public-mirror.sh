#!/usr/bin/env bash
# The only sanctioned path for updating the public mirror. Pushes exactly the
# refs allowed by release/public-mirror-policy.json (main + open-radio-* tags),
# never force-pushes, and refuses to run before the full host gate and the
# public-tree guard pass. Owner gate: both confirmation variables must be set
# on the command line, in the style of core2-device-action.sh.
set -euo pipefail

die() { printf 'REFUSED: %s\n' "$1" >&2; exit 1; }

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

[[ "${ALLOW_PUBLIC_PUSH:-}" == "1" ]] || die "set ALLOW_PUBLIC_PUSH=1 to allow pushing to the public mirror"
[[ "${CONFIRM_PUBLISH:-}" == "YES" ]] || die "set CONFIRM_PUBLISH=YES to confirm this owner-approved publication"

remote_name="$(node -p 'JSON.parse(require("fs").readFileSync("release/public-mirror-policy.json","utf8")).remoteName')"
remote_url="$(node -p 'JSON.parse(require("fs").readFileSync("release/public-mirror-policy.json","utf8")).repositoryUrl')"

branch="$(git rev-parse --abbrev-ref HEAD)"
[[ "$branch" == "main" ]] || die "publish from main only (currently on $branch) — the gate must validate exactly what ships"
[[ -z "$(git status --porcelain)" ]] || die "working tree is not clean"

if git remote get-url "$remote_name" >/dev/null 2>&1; then
  actual_url="$(git remote get-url "$remote_name")"
  [[ "$actual_url" == "$remote_url" ]] || die "remote '$remote_name' points at $actual_url, policy says $remote_url"
else
  git remote add "$remote_name" "$remote_url"
  printf 'added remote %s -> %s\n' "$remote_name" "$remote_url"
fi

printf '== full host gate (includes the public-tree guard)\n'
npm run check

command -v gitleaks >/dev/null 2>&1 || die "gitleaks is required; a skipped history scan must never reach a public push"
printf '== gitleaks history scan\n'
gitleaks git . --no-banner --redact

# Only tags whose commits are reachable from main may ship: an unreachable
# tag would drag its entire private ancestry into the public object store.
tags=()
skipped=()
while IFS= read -r tag; do
  if git merge-base --is-ancestor "$tag^{commit}" main; then
    tags+=("refs/tags/$tag")
  else
    skipped+=("$tag")
  fi
done < <(git tag -l 'open-radio-*')
if ((${#skipped[@]})); then
  printf 'SKIP (not reachable from main): %s\n' "${skipped[*]}" >&2
fi

printf '== pushing main and %d release tag(s) to %s (atomic)\n' "${#tags[@]}" "$remote_name"
git push --atomic "$remote_name" main "${tags[@]}"

printf '== remote verification (fail-closed)\n'
remote_state="$(git ls-remote "$remote_name")"
verify_ref() {
  local ref="$1" local_oid="$2" remote_oid
  remote_oid="$(printf '%s\n' "$remote_state" | awk -v r="$ref" '$2 == r {print $1}')"
  [[ "$remote_oid" == "$local_oid" ]] || die "remote $ref is ${remote_oid:-absent}, local is $local_oid"
  printf 'OK %s %s\n' "$ref" "$local_oid"
}
verify_ref refs/heads/main "$(git rev-parse main)"
for tag_ref in "${tags[@]}"; do
  verify_ref "$tag_ref" "$(git rev-parse "$tag_ref")"
done
printf 'DONE — every pushed ref matches its local object id.\n'
