---
title: One standard across all nine inputs
date: 2026-08-09T09:30:00Z
repos: [react-inputs]
authors: [jonatan-kruszewski]
tags: [breaking, feature]
version: '@rxova/react-inputs@1.0.0'
links:
  - label: Migration guide
    href: https://rxova.org/packages/react-inputs/components/otp/migrating
---

Going from three components to nine broke the conventions that worked for three. Every styling
hook in the suite is now namespaced `--rx-<name>-*` / `data-rx-<name>-*`: `--rx-otp-slot-size`,
`--rx-rating-size`, `--rx-date-segment-radius`. **This is the breaking part of 1.0** — the two
components whose prefixes actually change are OTP (`--otp-*`) and rating (`--rfs-*`), and
`npx @rxova/codemod rx-token-prefixes` plus one `sed` line over your stylesheets is the whole
migration.

The old scheme was each package's initials, which does not survive nine components: password and
phone both reduce to `rpi`. Custom properties inherit, so setting the wrong one is silently inert
rather than an error — the knob just does nothing, on a component that looks like it should have
it. `pnpm check:tokens` now fails any hook that leaves its component's namespace. The shared state
hooks — `data-state`, `data-filled`, `data-active`, `data-disabled`, `data-readonly`,
`data-invalid` — are deliberately untouched, because they mean the same thing on every input and
one selector should reach all of them.

The rest of the standard is the same exercise applied elsewhere. The meta-package now re-exports
everything its components export rather than a hand-picked subset — 37 names were missing, which is
how you get `DateInputProps.onPartsChange` re-exported without `DateParts`, a prop you can see and
cannot name the argument of; a test fails on any export that is neither re-exported nor one of the
six that genuinely collide. Development warnings say the package you installed rather than a name
it had two renames ago. The date and time fields paint a focus ring on the focused segment, which a
`<span role="spinbutton">` gets from nobody. Password and phone always cap their length now. And
the whole suite is exercised on every PR in real Vite, Next and Remix apps, because "renders in a
test renderer" and "hydrates in your framework" are different claims.
