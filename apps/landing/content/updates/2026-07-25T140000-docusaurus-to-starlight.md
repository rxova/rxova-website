---
title: Docusaurus out, Astro Starlight in
date: 2026-07-25T14:00:00Z
repos: [use-everywhere, react-inputs, journey]
authors: [jonatan-kruszewski]
tags: [docs, feature]
---

All three docs sites moved to Astro Starlight. The landing already was Astro, so this leaves
one framework across the whole origin — and dropped a webpack build that had been the
flakiest job in every pipeline.

react-inputs took the chance to restructure: one component library with a flat sidebar and
shared guides, instead of three manuals bolted together.
