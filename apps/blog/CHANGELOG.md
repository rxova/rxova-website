# @rxova/blog

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

- [#46](https://github.com/rxova/brand/pull/46) [`3870c9c`](https://github.com/rxova/brand/commit/3870c9c4f019442843ce25aee4308e608ebd30d9) - Reveal the index a batch at a time, ten posts to a batch.

  Inert at the current two posts, and deliberately so — the point is that the index
  scales without a second visit. Ten rather than the updates stream's eight because a
  post is one card here, not an entry rendered in full.

  The control is a small `ShowMore` component driven by `data-reveal-list` and
  `data-reveal-step` on the list itself, since an Astro `<script>` is bundled once per
  page rather than instantiated per component. It ships hidden and the script un-hides
  it, so without JS every post is on the page exactly as before.
