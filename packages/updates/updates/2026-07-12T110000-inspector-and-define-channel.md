---
title: An Inspector, and typed channels bound once
date: 2026-07-12T11:00:00Z
repos: [use-everywhere]
authors: [jonatan-kruszewski]
tags: [feature]
---

`<Inspector />` shows the live bus — channels, peers, who is leader — and ships on a
`use-everywhere/devtools` subpath so it stays out of the bundle unless it is asked for.

`defineChannel` binds a channel and its message type at module level, so the shape is
declared once instead of being repeated at every call site.
