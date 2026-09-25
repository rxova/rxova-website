---
title: One Turborepo standard across every repo
date: 2026-07-26T10:00:00Z
repos: [journey, use-everywhere, react-inputs, brand]
authors: [jonatan-kruszewski]
tags: [infra]
---

Four repos had drifted into four ways of running the same six checks. They now share one
Turborepo pipeline and one CI shape, so a fix to the build order is made once.

Node 24, TypeScript 6 and pnpm 11 across all of them, which also got `pnpm audit` working
again.
