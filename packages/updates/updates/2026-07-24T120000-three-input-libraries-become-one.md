---
title: Three input libraries become one
date: 2026-07-24T12:00:00Z
repos: [react-inputs]
authors: [jonatan-kruszewski]
tags: [release, breaking]
version: '@rxova/react-inputs@0.1.1'
---

`react-intl-currency-input`, `react-feedback-stars` and `react-otp-slots` were three repos
with three CI setups, three docs sites and three release processes for what is really one
problem: the tricky React inputs.

They are now `@rxova/react-intl-currency-input`, `@rxova/react-rating-input` and
`@rxova/react-otp-input`, with `@rxova/react-inputs` as the umbrella if you want all three.
The old package names are deprecated, and `@rxova/codemod` rewrites the imports for you.
