---
'@rxova/astro-ui': minor
---

Remove `components/SiteShell.astro`. It was the header-less document the blog and updates were built with while they were separate builds composed into the site at deploy time; both are now routes of the site app with their own layout, and nothing else used it. Give a page its own layout around `Header` and `SiteFooter` instead.
