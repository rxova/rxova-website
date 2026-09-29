---
"@rxova/astro-ui": minor
---

Give the docs header one row and one menu on phones. `sharedStarlightConfig` now also overrides `Header` and `MobileMenuFooter`: a splash page (no sidebar) gets a menu button beside search, and a page with a sidebar gets the same links at the foot of Starlight's own menu. Both hold every project's docs with the current one marked, the rxova.dev sections (Projects, Blog, Updates), GitHub, npm and the theme picker, which phones could not reach before. The menu buttons and every menu row are at least 44px tall. The desktop switcher is labelled "Docs", so it no longer reads as a second "Projects" beside the Projects link. A site that passes its own `Header` or `MobileMenuFooter` in `components` keeps it, and loses this menu on the pages it covers.
