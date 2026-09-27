# @rxova/updates

## 0.2.7

### Patch Changes

- Updated dependencies [[`3d95f7f`](https://github.com/rxova/rxova-website/commit/3d95f7fbef94253acbc43ebb4dbd3503290e4690), [`7f4ee8b`](https://github.com/rxova/rxova-website/commit/7f4ee8bb94c7e7617ad2c2171bf0c68b9511e10b), [`fbcce0c`](https://github.com/rxova/rxova-website/commit/fbcce0c52c6b1ce6a705fd4d89dc1e1b26ea73a9), [`a6fbd3f`](https://github.com/rxova/rxova-website/commit/a6fbd3f093eefff6caf05706ed1ee675e864a9e2), [`e2768f2`](https://github.com/rxova/rxova-website/commit/e2768f2b40729aabe943b5f552b09466301f9d94), [`f25c4fe`](https://github.com/rxova/rxova-website/commit/f25c4fe37f2fd07de22371d3ae4cc715461ee9d8), [`67371e0`](https://github.com/rxova/rxova-website/commit/67371e033e413c87bbd6f2beb94388803068b719), [`225de9c`](https://github.com/rxova/rxova-website/commit/225de9c68be2559a1312a6fc1fa1d726beb16c7d), [`22d97a6`](https://github.com/rxova/rxova-website/commit/22d97a6bf89ba4f5137a4852c7260abc1eca0401), [`6a32caa`](https://github.com/rxova/rxova-website/commit/6a32caa129c595b3c8043c23777ec0fe2ff966b6), [`56847d0`](https://github.com/rxova/rxova-website/commit/56847d0c764d9b48e1f3659557b03e57f6ced9de), [`4a1a150`](https://github.com/rxova/rxova-website/commit/4a1a150270c3da3b2a6b68d6fa5b462a9dca35e8), [`8dc7e6d`](https://github.com/rxova/rxova-website/commit/8dc7e6d81972b1a3fc85005acd6333f4b3caeab2), [`f25c4fe`](https://github.com/rxova/rxova-website/commit/f25c4fe37f2fd07de22371d3ae4cc715461ee9d8)]:
  - @rxova/astro-ui@0.2.0
  - @rxova/brand@1.1.0

## 0.2.6

### Patch Changes

- Updated dependencies [[`bd46592`](https://github.com/rxova/rxova-website/commit/bd46592a55a7521e01109316a8c1f7493b2dbfaa), [`8370a29`](https://github.com/rxova/rxova-website/commit/8370a29628a6f4d9aba6d257f844db525bed761e)]:
  - @rxova/astro-ui@0.1.0
  - @rxova/brand@1.0.0

## 0.2.5

### Patch Changes

- Updated dependencies [[`cb588f2`](https://github.com/rxova/brand/commit/cb588f29ee1e8671a790a41f512be9ec0c61e502)]:
  - @rxova/brand@0.15.0

## 0.2.4

### Patch Changes

- Updated dependencies [[`cd7259c`](https://github.com/rxova/brand/commit/cd7259cdc89ccc456138d7f94b49f0a4d26bb259)]:
  - @rxova/brand@0.14.0

## 0.2.3

### Patch Changes

- Updated dependencies [[`25d5d29`](https://github.com/rxova/brand/commit/25d5d299385d641608f3c83997478a1f9d84a47a)]:
  - @rxova/brand@0.13.0

## 0.2.2

### Patch Changes

- Updated dependencies [[`32fa287`](https://github.com/rxova/brand/commit/32fa287f7e76b38d79bfa5752f8e088e08d49a05), [`5c34453`](https://github.com/rxova/brand/commit/5c34453a1869a9950d86f7d87da134d236cb2dc9)]:
  - @rxova/brand@0.12.0

## 0.2.1

### Patch Changes

- Updated dependencies [[`0edb84f`](https://github.com/rxova/brand/commit/0edb84f7b64ac17caa693fc4ee2cb3c70d7f67e9)]:
  - @rxova/website-schemas@0.6.0

## 0.2.0

### Minor Changes

- [#46](https://github.com/rxova/brand/pull/46) [`3870c9c`](https://github.com/rxova/brand/commit/3870c9c4f019442843ce25aee4308e608ebd30d9) - Reveal the stream a batch at a time, eight entries to a batch.

  Every entry renders in full, so the page was a long scroll well before it was a long
  list. Batching happens in the browser rather than across paginated routes, because
  the repo and tag filters are show/hide over markup already in the DOM — a `/page/2`
  could only ever filter within the page you happen to be on.

  All eighteen entries still ship in the HTML and the control arrives hidden, so a
  crawler and a reader without JS see what they saw before. "Show all" covers the one
  real cost, find-in-page missing what is batched away, and print ignores the batch
  while still honouring the filters.

  Two things the batching exposed are fixed alongside it: `writeUrl` dropped the
  `#anchor` when it rebuilt the URL, and a `#slug` permalink to an entry beyond the
  batch now clears a conflicting filter and reveals it.
