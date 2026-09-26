---
title: The use-everywhere demo is linked from rxova.org
date: 2026-08-08T11:00:00Z
repos: [rxova-website, use-everywhere]
authors: [jonatan-kruszewski]
tags: [docs]
links:
  - label: Try it in two tabs
    href: https://rxova.github.io/use-everywhere/
---

Every explanation of this library ends with "open a second tab and watch", and until now
there was nothing to open unless you cloned the repo. There is now, and rxova.org links it —
so a reader meets the thing before the install line rather than after.

Ten pages behind a sidebar, each one a live thing you operate with the code that is running
printed above it. The order is how someone meets the library rather than how the API is
organised: shared state first, then the two questions it immediately provokes — what happens
when two tabs write the same key, and what happens when the value is a count rather than a
fact — then persistence and the coordination primitives, then the parts that matter once it
is load-bearing: namespaces, transports, devtools. The demonstrations are the claims that
are hard to believe without seeing them. Two counters side by side running the same race,
one losing concurrent increments and one that cannot. A version clock table showing which
write won and who made it. A sign-out that reaches four tabs in the same millisecond.

It sits on its own origin rather than under `/packages/use-everywhere/` with the docs, which
is deliberate. The docs are composed into rxova.org under a base path; this has to be opened
in two tabs, so it wants an origin, and GitHub Pages gives it one. Routing is hash-based for
the same reason — on Pages a path route is a 404 until you add a `404.html` that impersonates
the app, and a deep link that works on first load is the whole point of a page you are asked
to open twice.
