---
title: use-everywhere is up
date: 2026-07-11T18:00:00Z
repos: [use-everywhere]
authors: [jonatan-kruszewski]
tags: [release, infra]
version: use-everywhere@0.1.0
---

State and messages that exist in every tab, window and worker — the first cut is on npm.
`@use-everywhere/core` owns the bus, and `use-everywhere` wraps it in React hooks.

It arrived with the parts that are painful to add later: CI on every push, CodeQL, coverage
gates, and licenses.
