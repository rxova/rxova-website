---
title: journey 1.0 takes shape on main
date: 2026-09-16T08:00:00Z
repos: [journey]
authors: [jonatan-kruszewski]
tags: [feature, breaking]
links:
  - label: Repository
    href: https://github.com/rxova/journey
---

The API journey will ship as 1.0 is on `main`. It replaces the single journey machine with two
builders:

- `createLinearJourney` for step-by-step flows;
- `createGraphJourney` for flows that branch.

Around them:

- `analyzeStructure` checks a definition without starting a runtime.
- The analytics, replay and execution-paths plugins move under `@rxova/journey-core/plugins`.
- An immer connector sits under `./connectors/immer`.
- There are Vite examples for both builders and every plugin.

It is not on npm yet: the `rc` tag is still `1.0.0-rc.3`, on the old API. Expect a breaking
release candidate next.
