---
'@rxova/astro-ui': minor
---

Add the landing and docs components the journey and react-inputs sites were each carrying a copy of, so they can be imported instead: `Section`, `CtaBand`, `QuickStart`, `ProofStats`, `ValueGrid`, `SizeTable`, `ModeTabs`, `ScreenshotGrid`, `DocAccordion` and `DocAccordionItem`, `CodeRecipes` and `DataTable`. `ValueGrid` takes a Lucide icon name and inlines it at build time through the new `lucide-static` dependency. Two stylesheets come with them: `styles/landing.css`, the Starlight overrides a splash landing page needs, and `styles/mermaid.css`, which restyles `rehype-mermaid`'s build-time SVG with the tokens.
