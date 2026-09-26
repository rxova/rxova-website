---
title: ts-extended-errors is on npm and rxova.org
date: 2026-09-17T09:16:00Z
repos: [ts-extended-errors, rxova-website, brand]
authors: [jonatan-kruszewski]
tags: [release, docs]
version: ts-extended-errors@0.4.4
links:
  - label: Documentation
    href: https://rxova.org/packages/ts-extended-errors/
  - label: npm
    href: https://www.npmjs.com/package/ts-extended-errors
  - label: Release notes
    href: https://github.com/rxova/ts-extended-errors/releases/tag/ts-extended-errors%400.4.4
---

ts-extended-errors is public. It is a zero-dependency error model for TypeScript applications that
throw native exceptions but need more from them:

- typed context: `defineError`, with a `message` option that writes the message from the context;
- cause-chain inspection;
- JSON round trips: `serializeError` and `deserializeError` rebuild errors as their own classes,
  including `AggregateError`.

Install it with `npm install ts-extended-errors`. Every version is on npm under that name, so no
`.npmrc` line is needed. Its docs are at `/packages/ts-extended-errors/`, and it appears on the
rxova.org landing page.

0.4.4 hardens the part that matters most in an error handler: a getter, proxy trap or prototype check
that throws while inspecting an unknown value no longer replaces the original failure.
