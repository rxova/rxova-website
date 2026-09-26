---
title: A post whose cover carries information
description: 'Fixture: a described cover, an embedded body image, and the shapes that must not be mistaken for one.'
pubDate: 2026-01-01T00:00:00Z
authors: [jonatan-kruszewski]
tags: [fixture]
cover: ../images/cover-described/hero.png
coverAlt: A gradient running blue to magenta, described because it is not decorative.
---

Prose before the embed, so the image is not the first node in the body.

![A square diagram, teal shading to blue](../images/cover-described/diagram.png)

An embed with empty alt text, which is how a decorative body image is written:

![](../images/cover-described/diagram.png)

A remote image, which Astro leaves alone because there is no local file to optimise:

![Remote](https://example.com/not-fetched.png)

And the shape that must never be treated as an embed — this is a post about
markdown quoting markdown, and the validator has to tell the difference:

```md
![A cover that does not exist](../images/nowhere/missing.png)
```

Inline too: write `![alt](./path.png)` to embed one.
