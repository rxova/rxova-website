---
title: Leader election, so exactly one tab does the work
date: 2026-07-12T09:00:00Z
repos: [use-everywhere]
authors: [jonatan-kruszewski]
tags: [feature]
version: use-everywhere@0.2.0
---

Shared state is the easy half. The hard half is that five open tabs will happily run the
same poll five times. Leader election picks one, and hands the role over when that tab
closes.

Persistence landed alongside it, opt-in rather than automatic, plus an observable debug seam
on the bus for anyone who needs to see what is actually crossing it.
