# @rxova/storybook

Storybook for [`@rxova/astro-ui`](../../packages/astro-ui): one story file per component under
`stories/`, on the community [`@storybook-astro/framework`](https://storybook-astro.org/), which
renders `.astro` components through Astro's container API.

```sh
pnpm --filter @rxova/storybook dev     # http://localhost:6006, with live controls
pnpm --filter @rxova/storybook build   # dist/, every story pre-rendered
```

- Props are `args`; slot content goes under `args.slots`, as an HTML string or a component with
  its own props and slots (see `DocAccordion.stories.ts`).
- The **Theme** toolbar flips `data-theme` on the document, the attribute `tokens.css` reads, so
  every story can be checked in light and dark.
- **Docs** pages take their props table and description from the component's frontmatter: the
  `Props` interface and its JSDoc are the source of truth.
- The static build pre-renders each story, so controls do not live-edit there; `dev` renders on
  a server and they do. `pnpm run verify` runs the static build, so a story that fails to render
  fails the gate.

The gallery in `apps/preview` stays the source of the screenshots the component pull requests
embed; this is where a component is browsed and its props are tried.
