---
title: Two new contracts, and Storybook on rxova.org
date: 2026-08-03T10:00:00Z
repos: [rxova-website, brand, react-inputs, use-everywhere]
authors: [jonatan-kruszewski]
tags: [infra, feature]
version: '@rxova/website-schemas@0.6.0'
---

`@rxova/website-schemas` grew two contracts. Page-component bundles: a producer's artifact
now carries only its page bodies, and the website supplies the header, footer, global head
and analytics at deploy time. The docs sites moved onto it through one shared mode instead
of each repo keeping a copy.

And a `storybook` source kind: a project's workshop ingests like any other source and
nests under one `/storybook/` tree. The react-inputs workshop is the first through —
live at `rxova.org/storybook/react-inputs/`.
