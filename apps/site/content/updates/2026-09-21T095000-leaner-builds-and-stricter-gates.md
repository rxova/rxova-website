---
title: Leaner builds and stricter gates across the libraries
date: 2026-09-21T09:50:00Z
repos: [overlock, use-everywhere, journey, react-inputs, ts-extended-errors]
authors: [jonatan-kruszewski]
tags: [infra]
links:
  - label: overlock 0.10.1
    href: https://github.com/rxova/overlock/releases/tag/v0.10.1
  - label: use-everywhere 1.0.1
    href: https://github.com/rxova/use-everywhere/releases/tag/use-everywhere%401.0.1
---

overlock and use-everywhere now build with tsdown instead of tsup (overlock 0.10.1, use-everywhere
1.0.1). The published output keeps its shape: same entry points, formats, filenames and types.
overlock's tarball is smaller, because code shared by its two entries is no longer duplicated.

Every library's CI now gates on knip and sherif. knip fails on unused files, exports and
dependencies. sherif fails when two packages in a workspace disagree on a dependency's version. The
first pass removed internal exports nothing imported (overlock 0.10.2, `@use-everywhere/core`
1.0.2), none of them part of the public API.
