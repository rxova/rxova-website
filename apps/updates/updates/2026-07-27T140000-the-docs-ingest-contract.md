---
title: The docs ingest contract
date: 2026-07-27T14:00:00Z
repos: [rxova-website, journey, use-everywhere, react-inputs]
authors: [jonatan-kruszewski]
tags: [infra]
---

rxova.org used to check out three repos and build their docs itself, which meant one
project's broken build took the whole site down with it.

Each repo now builds its own docs and ships them as a release asset; the site ingests the
artifact. A project either publishes something valid or the site keeps serving the last good
copy.
