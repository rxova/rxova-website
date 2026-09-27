---
'@rxova/astro-ui': minor
---

Add `CopyButton`: an icon button that puts a string on the clipboard, swaps to a tick for a moment and announces it to screen readers; `label` is its accessible name and tooltip. Add the `Copy` and `Check` glyphs under `components/icons/` for it. It draws in `currentColor`, so it sits on any surface, a dark terminal included. `QuickStart` now uses it instead of its own button.
