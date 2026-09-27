---
title: A new landing page for Journey
date: 2026-08-04T11:48:00Z
repos: [journey]
authors: [jonatan-kruszewski]
tags: [docs]
---

The Docusaurus migration transcribed the old homepage rather than redesigning it, so it
still opened as a release announcement — "We did it!", a confetti modal, a link to reopen
the 1.0.0rc celebration — and four sections carried the old teal-and-navy palette as some
fifty hardcoded colour literals, on a site whose accent has been violet since it adopted
`@rxova/brand`. The carousel's cards filled with the token the brand maps to the page
background, so only a hairline of them showed.

Those four components are gone, along with every hardcoded colour and the confetti
dependency, replaced by sections built the way the react-inputs landing is built: brand
tokens only, `prefers-reduced-motion` on every animation, and server-rendered content so
the page reads with JS off. The demo runs a real `@rxova/journey-core` machine from a
plain script through a branching checkout — no React, no bindings — which demonstrates the
framework-agnostic claim rather than asserting it.

The proof band measures itself: size-limit runs against each package's built output at
build time and the coverage floor is parsed out of the vitest config, so no figure is
restated from prose. It immediately caught one — the bridge measures 3.13 kB, not the
3.2 kB the README claims.
