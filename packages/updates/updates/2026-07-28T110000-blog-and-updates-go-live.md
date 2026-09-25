---
title: The blog and this feed go live
date: 2026-07-28T11:00:00Z
repos: [rxova-website, brand]
authors: [jonatan-kruszewski]
tags: [feature]
version: '@rxova/brand@0.5.0'
---

`/blog` and `/updates` are built in the brand repo and mounted on rxova.org as two more
sources, through the same ingest path the project docs use.

Both now sit under one shared layout with a real menu, and the components rxova.org had
duplicated were deleted in favour of the ones `@rxova/brand` already exports.
