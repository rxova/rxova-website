---
title: rxova.org goes up as an aggregator
date: 2026-07-24T10:00:00Z
repos: [rxova-website]
authors: [jonatan-kruszewski]
tags: [feature, infra]
---

One origin, several projects. An Astro landing sits at `/`, and each project's docs are
built in its own repo and mounted as a static tree under `/packages/<name>/`.

That keeps every project owning its own docs while readers only ever learn one domain. It
also means every cross-project link has to be absolute, which is the first thing the shared
chrome had to get right.
