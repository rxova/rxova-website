---
title: Clearing the audit backlog
date: 2026-07-26T14:00:00Z
repos: [journey, react-inputs, use-everywhere]
authors: [jonatan-kruszewski]
tags: [fix, infra]
---

`pnpm audit` is only useful if it is ever green. svgo was pinned to a vulnerable 3.3.3 by an
override, so it got unpinned; brace-expansion, js-yaml, webpack-dev-server and dompurify
were resolved behind it.

Dropping Docusaurus left sixteen overrides pointing at packages no longer in the tree, and
those went too — a stale override is a silent way to hold a dependency back.
