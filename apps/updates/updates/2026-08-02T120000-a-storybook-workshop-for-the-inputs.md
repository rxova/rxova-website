---
title: A Storybook workshop for the inputs
date: 2026-08-02T12:00:00Z
repos: [react-inputs]
authors: [jonatan-kruszewski]
tags: [feature, docs]
---

Every input has stories now — currency, OTP and rating each get an args-driven Playground
plus one story per behaviour worth showing off, with a toolbar toggle that flips the whole
workshop to RTL.

The prop tables are generated from the annotated source interfaces, so documenting a prop
in a package updates its table here with no extra work. The workshop aliases the packages'
source directly: no build step in between, and library edits hot-reload into the stories.
