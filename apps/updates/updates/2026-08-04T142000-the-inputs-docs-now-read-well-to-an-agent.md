---
title: The inputs docs now read well to an agent
date: 2026-08-04T14:20:00Z
repos: [react-inputs]
authors: [jonatan-kruszewski]
tags: [docs, feature]
---

An agent asked to use one of these components fetched a whole Starlight page — nav,
sidebar, search index, live-example islands — to read a prop table. Every docs page is now
also served as raw markdown at `<route>.md`, which is the same content at a fraction of
the bytes and needs no HTML parsing.

`llms.txt` indexes the site for agents and `llms-full.txt` inlines the lot, under a size
budget so the build complains rather than an agent silently truncating it. `AGENTS.md`
covers the other case: working in the repo rather than reading the site.
