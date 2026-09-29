---
title: The brand moves into the website, and the landing gets a walkthrough
date: 2026-09-26T12:00:00Z
repos: [rxova-website, brand]
authors: [jonatan-kruszewski]
tags: [feature, infra]
links:
  - label: rxova.dev
    href: https://rxova.dev/
  - label: rxova/rxova-website
    href: https://github.com/rxova/rxova-website
---

`@rxova/brand` has moved out of its private repository and into rxova-website, which is public. Its
source, its history from here on and its release process sit next to the landing, the blog, the
updates stream and the tooling that assembles rxova.org. One workspace, one gate: the pre-push
verify list and CI run the same steps, and every app and package is held to a coverage floor.
Playwright now checks the built site's behaviour, and a local visual check catches layout drift.

On the landing, each project has a before/after walkthrough: the code a problem usually ends up as,
and the same thing written with the library, one note at a time. Pick a project from the rail and
step through it on the stage.
