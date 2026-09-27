---
title: A new landing page for react-inputs
date: 2026-08-04T09:35:00Z
repos: [react-inputs]
authors: [jonatan-kruszewski]
tags: [docs]
---

The landing page read as thin documentation — the h1 was the org name, the body was a
component catalogue, and none of the CTAs a visitor needs were on it. It runs hero → quick
start → why → proof → one live demo → budgets → headless now, and no longer enumerates
components, so a fourth input changes nothing here.

The numbers are derived from the same configs CI enforces — size budgets, coverage
thresholds, Playwright projects, axe tags — so the page renders the pipeline's own inputs
and cannot drift from it. Budgets are quoted Brotli rather than gzip, and the coverage
floor is the minimum across packages, not the best case.
