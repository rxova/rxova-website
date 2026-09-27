---
title: overlock is open source
date: 2026-09-10T12:35:00Z
repos: [overlock]
authors: [jonatan-kruszewski]
tags: [release]
links:
  - label: Source
    href: https://github.com/rxova/overlock
  - label: npm
    href: https://www.npmjs.com/package/overlock
---

I open-sourced overlock, a CLI that catches changes that make tests pass by weakening them: an
`it.skip`, an assertion loosened to `toBeDefined()`, a coverage threshold lowered. It was built for
coding agents, which will happily take that route to a green suite.

Run it with `npx overlock`, or as a Claude Code Stop hook, an MCP server or a GitHub Action. Thirteen
rules, no network calls, zero runtime dependencies.
