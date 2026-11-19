# Voice audit (2026-09-29)

Every string rxova.dev and `@rxova/astro-ui` show a reader, checked against [voice.md](voice.md).
There is no i18n layer: strings are inline in `.astro` files and a few `.ts` helpers. Blog posts,
update entries and walkthrough story text (`apps/site/src/showcases/*/story.ts`) were read for
banned words and terminology only; their prose is the author's.

Overall the copy already follows the guide: no "simply", "easy" or hype words anywhere, verbs on
every button, accessible names on every icon button. The gaps were the terms page, and three
words used for the same thing ("entry", "logged", "note") where the reader sees another.

## Fixed

| File                                                      | Was                                                                                                        | Now                                                                               | Why                                                            |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `apps/site/src/pages/terms.astro`                         | First person, idioms ("test drive", "lean on them", "two-way street", "no strings", "just want to say hi") | Plain third person, same legal points, a short-version lead like the privacy page | Principles 2 and 3; idioms do not translate                    |
| `apps/site/src/pages/terms.astro:6`                       | `Last updated: {new Date().getFullYear()}`                                                                 | `Last updated: September 2026`                                                    | Showed the build year, so it changed without the page changing |
| `apps/site/src/pages/terms.astro:16`                      | "journey, react-inputs, and use-everywhere"                                                                | "All Rxova projects"                                                              | Left out ts-extended-errors and overlock; a list goes stale    |
| `apps/site/src/components/updates/UpdatesStream.astro:34` | No entries match those filters.                                                                            | No updates match these filters. Clear them to see every update.                   | Glossary (update); empty state says what to do                 |
| `apps/site/src/lib/stream.ts:79`                          | 3 of 12 entries                                                                                            | 3 of 12 updates                                                                   | Glossary; test updated to match                                |
| `apps/site/src/pages/updates/index.astro:62`              | Nothing logged yet.                                                                                        | No updates yet.                                                                   | Glossary                                                       |
| `apps/site/src/pages/updates/repos/[id].astro:59`         | Nothing logged for {repo.label} yet.                                                                       | No updates for {repo.label} yet.                                                  | Glossary                                                       |
| `apps/site/src/pages/blog/index.astro:76`                 | Nothing published yet.                                                                                     | No posts yet.                                                                     | Glossary                                                       |
| `apps/site/src/components/walkthrough/Bar.astro:42,46`    | Previous note / Next note (aria-label)                                                                     | Previous step / Next step                                                         | "Note" is the data model's word; the reader never sees it      |

## Checked, left as is

| Where                                                                                  | String                                                            | Note                                                                               |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `packages/astro-ui/src/components/CopyButton.astro`                                    | Copied / label "Copy the install command"                         | Verb and object; success is one word                                               |
| `packages/astro-ui/src/components/ShowMore.astro:18,21`                                | Show more {noun} / Show all                                       | Verb and object                                                                    |
| `packages/astro-ui/src/scripts/show-more.ts:19`                                        | Showing {limit} of {total}                                        | Whole sentence built in one place                                                  |
| `packages/astro-ui/src/components/ThemeToggle.astro:136`                               | Switch to light theme / Switch to dark theme                      | Names the action; the initial "Toggle theme" is replaced on load                   |
| `packages/astro-ui/src/components/ProjectSwitcher.astro:17`                            | Switch project                                                    | Verb and object                                                                    |
| `apps/site/src/lib/walkthrough.ts:87-95`                                               | Play / Pause / Replay the walkthrough; Problem 2 of 4, Fix 2 of 4 | Verb and object; count built whole                                                 |
| `apps/site/src/components/walkthrough/Bar.astro:60`                                    | Full screen / Exit full screen                                    | Matches the toggle pattern                                                         |
| `apps/site/src/components/updates/stream/Filters.astro`                                | Repo / Tag / Clear filters                                        | "Repo" is right: the stream includes non-project repos                             |
| `apps/site/src/pages/blog/index.astro:96`                                              | Read more of “{title}” (hidden suffix)                            | Unique accessible name per link                                                    |
| `apps/site/src/pages/privacy.astro`                                                    | Whole page                                                        | Already plain, third person, with a short version                                  |
| Page titles (`index`, `projects`, `blog`, `updates`, legal)                            | `<Page> — Rxova`                                                  | Consistent                                                                         |
| Landing, about and project copy (`lib/about.ts`, `lib/home.ts`, `sources.json` blurbs) | —                                                                 | No banned words; one "our" (`about.ts:74`) reads as Rxova's own packages and stays |

## Recommended, not applied (needs a logic change)

- **Copy failures are silent.** `CopyButton.astro` returns without a message when the browser
  refuses clipboard access, and `.rx-copy__status` is the only place a message could go. Suggested
  copy: "Could not copy. Select the command and copy it by hand." It needs a failure state in the
  script and a visible style, and a changeset for `@rxova/astro-ui`.
- **Counts are English-only plurals.** `countText`, `progressText`, `stepCount` and the show-more
  progress build English plurals in code. Fine while the site is English only; if it is ever
  translated, each becomes one ICU message (`{count, plural, one {# update} other {# updates}}`).
