---
title: A post whose cover is decoration
description: 'Fixture: a cover with no coverAlt, which must render as alt="" rather than as a filename.'
pubDate: 2026-01-02T00:00:00Z
authors: [jonatan-kruszewski]
tags: [fixture]
cover: ../images/cover-decorative/hero.png
---

No `coverAlt`, on purpose. The cover sets a mood and says nothing a reader would
miss, so the accessible markup for it is an empty alt — not a description, and not
the filename.

This post embeds nothing, which is also the case worth covering: a body with no
images at all must still build.
