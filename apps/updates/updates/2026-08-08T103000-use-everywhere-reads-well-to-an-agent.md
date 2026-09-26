---
title: use-everywhere reads well to an agent
date: 2026-08-08T10:30:00Z
repos: [use-everywhere]
authors: [jonatan-kruszewski]
tags: [docs, feature]
---

The treatment the inputs docs got in July, ported here — five surfaces rather than six. The
shadcn registry does not port: this library ships hooks, not components you copy into your
own tree.

Every docs page is also served as raw markdown at `<route>.md`, all 257 of them, generated
from the same page enumeration the site is built from so a twin cannot disagree with its
page. `llms.txt` indexes the site in 11 kB and `llms-full.txt` inlines the lot in 517 kB,
under an 800 kB budget the build enforces rather than an agent silently truncating. Its
`## Optional` section links the three TypeDoc index pages, not the 209 generated reference
pages behind them — listing those individually buries the 46 prose links the index exists to
present, and a 24 kB budget keeps it that way. Every symbol page still has its own twin, one
hop further on.

Each of the four tarballs carries a hand-written `llms.txt` as well, which is what an agent
reads out of `node_modules` after an install rather than fetching anything: what the package
is, how to install it, a working example, the public surface, and the mistakes that are
silent at runtime. `check-llms.ts` checks its `## API` table against the package's real
entry points, so a renamed export fails the build instead of leaving the file describing an
API that no longer exists, and `pack:smoke` proves the file actually ships. `AGENTS.md`
covers the other case — working in the repo rather than reading the site.

**Writing it found five things wrong with the docs**, which is the argument for writing it.
235 doc-relative links left over from the Docusaurus migration — `../core/transports.md` and
its like — were being emitted into the HTML verbatim as dead links, and nothing checked them
because `starlightLinksValidator` runs with `errorOnRelativeLinks: false`. Twelve of those
pointed nowhere at all. Astro lowercases ids, so TypeDoc's `README.md` is served at
`/api/core/readme/` and a link written with the true filename resolved to a page that does
not exist. `index.md` has the id `index` rather than `''`, which had put a `source:` line
naming a route the site does not serve into all 257 twins. And the description extractor
dropped a description whenever the opening sentence ran past 200 characters, and welded link
URLs into the prose — two pages had none and one was corrupted.

The site's files are live. The packaged ones ship with each package's next patch.
