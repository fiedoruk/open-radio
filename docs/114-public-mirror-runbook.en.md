# 114 — Public mirror runbook

[Wersja polska](114-public-mirror-runbook.pl.md)

The decision record is `decisions/ADR-011-public-repository-launch.md`. This
runbook is the operating procedure: how the public repository is launched,
how every future update reaches it, and which invariants guard the tree.

## Model

The private repository stays the workshop: all working branches, experiments
and evidence. The public repository is the canonical upstream and receives
exactly two kinds of refs — the `main` branch and `open-radio-*` release
tags — pushed with preserved commit hashes, so release provenance recorded
in manifests can be verified by anyone. Policy lives as data in
`release/public-mirror-policy.json`.

## One-time launch checklist (owner)

1. Create an empty repository matching `repositoryUrl` in the policy file
   (adjust the field first if the name differs; the name is the owner's
   call).
2. On GitHub: enable private vulnerability reporting (Security Advisories);
   decide whether Issues start enabled and with which templates.
3. From a clean `main` with a green gate, run:
   `ALLOW_PUBLIC_PUSH=1 CONFIRM_PUBLISH=YES npm run publish:mirror`
4. Compare the hashes the script prints against `git ls-remote` output —
   they must match.
5. Link the repository from the project pages next to the written offer.

## Release flow for every future update

1. Work happens on private branches; nothing there is public.
2. Merge to `main` only when the change is meant to become public.
3. `npm run check` must be green — it includes the public-tree guard, so a
   tree that would leak a forbidden path or content cannot pass.
4. Publish with the same command as the launch:
   `ALLOW_PUBLIC_PUSH=1 CONFIRM_PUBLISH=YES npm run publish:mirror`
5. The script re-runs the full gate, runs a gitleaks history scan when
   available, pushes only the allowed refs and prints remote verification.

## Standing tree-guard rules

- Never public: `assets-local/` (broadcaster artwork sources), `raport-*`
  files, the local root `CLAUDE.md`, env files, private keys, absolute
  private workspace paths. The guard fails the whole gate if any of these
  become tracked.
- Only `main` and `open-radio-*` tags leave the workshop; the publish script
  refuses other refs by construction and never force-pushes.
- The public remote must use the policy name and URL; a mismatch aborts.
- Publishing from a branch other than `main` or with a dirty tree aborts:
  the gate must validate exactly the bytes that ship.

## External contributions

Mirror-first posture per ADR-011: pull requests are not merged by default,
because accepted outside copyright would constrain the dual-licensing option
from ADR-003. A substantial contribution triggers an explicit owner decision
(merge with DCO, rewrite, or decline) — recorded, not improvised.

## Incident response

If something reaches the public history that should not have: treat it as
published (forks and mirrors may already hold it). Rotate any exposed
credential immediately — removal from history is not recovery. Rewriting
public history breaks the hash-provenance chain and is an owner-level
decision of last resort; the default response is a fix-forward commit plus a
documented advisory.
