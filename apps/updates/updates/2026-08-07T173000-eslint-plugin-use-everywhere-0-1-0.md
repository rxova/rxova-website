---
title: 'eslint-plugin-use-everywhere 0.1.0'
date: 2026-08-07T17:30:00Z
repos: [use-everywhere]
authors: [jonatan-kruszewski]
tags: [release, feature]
version: 'eslint-plugin-use-everywhere@0.1.0'
---

Four rules, for the four mistakes this library cannot warn you about at runtime.

Each one has the same shape: the code runs, nothing throws, and the bug shows up as
behaviour that is merely wrong — in another tab, or on somebody else's machine, or only
after a deploy. That is the case worth spending a lint rule on.

`define-at-module-scope` catches a definer called inside a component, where only the first
registration takes effect and every later one is silently discarded.

`no-dynamic-name` catches a bus name computed at runtime. A `BroadcastChannel` name is an
identity, so a name that varies forks the bus in two, and both halves keep working
perfectly on their own.

`structured-clone-safe` catches functions, symbols and class instances in shared state.
These either throw on write or, worse, arrive with their prototype dropped — a plain
object wearing the shape of the thing you sent.

`leader-effect-captures` warns when a `useLeaderEffect` closes over a value that changes
between renders. The effect re-runs when leadership moves and not when the value does, so
the stale capture can outlive several renders without anything looking wrong.

Flat config, ESLint 9+, and no type information required — so it costs nothing to turn on:

```js
import useEverywhere from 'eslint-plugin-use-everywhere'

export default [useEverywhere.configs.recommended]
```
