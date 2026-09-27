---
title: Mutation testing on use-everywhere
date: 2026-08-04T18:00:00Z
repos: [use-everywhere]
authors: [jonatan-kruszewski]
tags: [infra]
---

Coverage says a line ran, not that a test would notice if it were wrong. The core is under
mutation testing now — every module past 90%, gated in CI per module as well as overall,
and two tests that turned out not to notice were fixed in the same pass.

It runs Sunday, Wednesday and Friday rather than on every pull request, because rerunning
the suite once per mutant is slow and paying that on every push buys very little. The e2e
suite also grew coverage for throttling and transport degradation, the two failure modes
0.7.0 addressed and nothing was exercising end to end.
