# Hygiene Checks Reference

This document describes every check `agent-hygiene-linter` performs, its finding codes, and how scoring works.

## Scoring model

Each finding is bucketed as **good**, **warning**, or **fix now**.

| Bucket  | Point deduction per finding |
| ------- | --------------------------- |
| good    | 0                           |
| warning | 8                           |
| fix now | 18                          |

Final score = `max(0, 100 - sum of deductions)`.

## Checks

### README (`readme-present` / `readme-missing`)

Looks for `README.md` at the repo root. Missing README is a **fix now** (−18).

### Agent instructions (`agent-doc-present` / `agent-doc-missing`)

Looks for `AGENTS.md` or `CLAUDE.md` at root. These files tell AI agents the house rules — which commands to run, what conventions apply. Missing is **fix now** (−18).

### Docs directory (`docs-shape-present` / `docs-shape-missing`)

Walks `docs/` up to one level deep for any `.md` file. An empty or absent `docs/` is a **warning** (−8).

### Changelog (`changelog-present` / `changelog-missing`)

Looks for `CHANGELOG.md` at root or `docs/changelog.md`. Missing is a **warning** (−8).

### Package scripts (`package-scripts-good` / `package-scripts-missing` / `package-json-missing`)

Reads `package.json` and checks for `build`, `test`, `lint`, `ci`. If three or more are present: **good**. Fewer than three: **warning** (−8). No `package.json`: **warning** (−8).

### Commit style (`commit-style-good` / `commit-style-mixed` / `commit-style-weak` / `commit-history-missing`)

Reads the last 25 commit subjects via `git log`. Computes the fraction that match the [Conventional Commits](https://www.conventionalcommits.org/) pattern.

| Ratio          | Bucket        |
| -------------- | ------------- |
| ≥ 0.7          | good          |
| 0.4 – 0.69     | warning (−8)  |
| < 0.4          | fix now (−18) |
| No git history | warning (−8)  |

### Entrypoint (`entrypoint-present` / `entrypoint-missing`)

Looks for `src/index.ts`, `index.ts`, or `main.ts`. Missing is a **warning** (−8).
