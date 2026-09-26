---
title: Input fixes across OTP, currency and rating
date: 2026-08-03T20:00:00Z
repos: [react-inputs]
authors: [jonatan-kruszewski]
tags: [fix]
---

Small bugs, all of them the kind you only meet by using the thing rather than testing it.

- **OTP** — a pointer press no longer flashes a stale slot active before the pressed one.
- **OTP** — typing over a full code replaces the character under the caret instead of being swallowed by `maxLength`.
- **OTP** — keyboard focus parks the caret deterministically: first empty slot, or the last character when the code is full.
- **OTP** — clicks land the caret in the slot actually pressed, including edges, separators and a scrolled field.
- **Currency** — a keystroke that cannot contribute to the amount is rejected before it moves the value or the caret.
- **Currency** — controlled hosts that echo `onValueChange` asynchronously no longer clobber the field with stale text.
- **Rating** — the cursor no longer flickers back to the default in the gaps between icons.

Also: the docs sidebar mark is keyed per component, GFM tables render in Storybook, and
the autodocs prop tables are back with a test guarding them.
