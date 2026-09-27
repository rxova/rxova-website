---
'@rxova/astro-ui': minor
---

`SiteFooter` takes an `origin` prop: `''` makes every rxova.org link root-relative, so a preview or staging build links to itself. Its own page links now end in a slash, which GitHub Pages serves without a redirect.
