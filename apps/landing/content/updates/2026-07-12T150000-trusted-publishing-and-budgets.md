---
title: Publishing over OIDC, with size budgets to match
date: 2026-07-12T15:00:00Z
repos: [use-everywhere]
authors: [jonatan-kruszewski]
tags: [infra]
---

npm publishes now run through trusted publishing — OIDC, no long-lived token in the repo —
and every package carries provenance.

The rest of the gate went in at the same time: a changeset is required before a published
package can change, each public export has its own size-limit budget, and per-file coverage
has to clear 95%.
