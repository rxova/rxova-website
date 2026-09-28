# @rxova/website-schemas

The contracts between the rxova repositories and rxova.org, as [zod](https://zod.dev) schemas: the
frontmatter of blog posts, updates and authors, the entries of the docs registry (`sources.json`),
the `docs` dispatch a repository sends to publish its docs, and the entry filenames.

```sh
pnpm add -D @rxova/website-schemas zod
```

```ts
import { dispatchPayload, sourceEntry } from '@rxova/website-schemas'

const payload = dispatchPayload.parse(JSON.parse(process.env.CLIENT_PAYLOAD ?? '{}'))
```

| Export                                                             | What it is                                                  |
| ------------------------------------------------------------------ | ----------------------------------------------------------- |
| `postBase`, `updateBase`, `authorBase`, `updateTag`, `repoId`      | Content frontmatter, and the tags and repository ids in it. |
| `sourceEntry`, `sourceId`, `SOURCE_KINDS`, `mountFor`, `baseFor`   | A docs registry entry, and the paths derived from its id.   |
| `dispatchPayload`                                                  | The `docs` dispatch that publishes a repository's docs.     |
| `ENTRY_FILENAME`, `parseEntryFilename`, `stampToISO`, `isoToStamp` | Dated entry filenames and their timestamps.                 |

`zod` 4 is a peer dependency. MIT licensed.
