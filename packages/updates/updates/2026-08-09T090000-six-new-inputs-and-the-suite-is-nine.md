---
title: Six new inputs, and the suite is nine
date: 2026-08-09T09:00:00Z
repos: [react-inputs]
authors: [jonatan-kruszewski]
tags: [feature, release]
links:
  - label: All nine components
    href: https://rxova.org/packages/react-inputs/
---

The suite was currency, rating and OTP. It is now nine: **date**, **time**, **phone**,
**password**, **tags** and **file** landed together, each one headless, typed, with no
stylesheet to import and zero runtime dependencies.

The through-line is that the platform already ships most of what these components are usually
sold with. **Date** and **time** are segmented, keyboard-first fields with no calendar, no clock
popup and no date library — segment order, separators, month names and the AM/PM words come from
`Intl`, and the value is a `YYYY-MM-DD` or `HH:mm[:ss]` string end to end with no `Date` ever
constructed, because a calendar date is not an instant. **Phone** drops the metadata blob: country
names from `Intl.DisplayNames`, flags from Unicode regional indicators, and a ~4 kB dial-code table,
which is ~6 kB brotli against 10.2 MB unpacked and five dependencies for the category leader.

The other three are about the details you only meet in use. **Tags** is not the smallest option in
its category and says so — the case is six accessibility failures common to the popular
alternatives, each with a test here, starting with focus never landing on `<body>` after a removal.
**File** validates, deduplicates and revokes its own preview URLs, and never uploads anything.
**Password** has a reveal toggle that keeps focus and the caret, a Caps Lock warning read off the
real modifier state, and a 1.2 kB entropy estimator you can swap for zxcvbn if you want its
wordlists.
