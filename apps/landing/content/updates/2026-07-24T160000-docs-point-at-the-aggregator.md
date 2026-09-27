---
title: Every docs site points at the aggregator
date: 2026-07-24T16:00:00Z
repos: [journey, react-inputs, use-everywhere]
authors: [jonatan-kruszewski]
tags: [infra]
---

Each project used to deploy its own GitHub Pages site at its own URL. All three stopped, and
now take their `url` and `baseUrl` from the environment instead of hardcoding one.

The same build therefore works standalone at `/` and mounted at `/packages/<name>/`, which
is what let rxova.org host them without forking anything.
