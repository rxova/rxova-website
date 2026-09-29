# Voice and glossary

How rxova.dev speaks: every page, label, button and message the site and `@rxova/astro-ui`
render. Blog posts and update entries have their own guide in [CONTENT.md](CONTENT.md); update
posts keep their original prose.

The reader is a developer deciding, in under a minute, whether a library solves their problem and
can be trusted in their code. Everything here serves that decision.

## Principles

**1. Say what it does, exactly.** Name the behaviour, the limit and the cost. A claim the code
cannot back does not ship.

- Do: "Nine input components, headless, with zero runtime dependencies each."
- Don't: "Blazing-fast, beautiful inputs that just work."

**2. Plain over clever.** Short sentences, everyday words, active voice. Technical terms are fine
when the reader uses them daily (`BroadcastChannel`, peer dependency); idioms and jokes are not,
because they do not translate and they slow a skim.

- Do: "Test each library in your own project before you rely on it."
- Don't: "Take them for a test drive before you lean on them."

**3. Rxova speaks, not a person.** The site is written about the projects, with the project or
Rxova as the subject, and addresses the reader as "you". First person ("I") appears only in the
maintainer's own bio on the about page.

- Do: "Rxova uses those reports to see which docs are read."
- Don't: "I've worked hard to make them solid."

## Tone by moment

| Moment           | Tone                          | Example                                                         |
| ---------------- | ----------------------------- | --------------------------------------------------------------- |
| Landing, pitch   | Confident, concrete, no hype  | Share state across every tab, with no Provider.                 |
| Walkthrough      | Neutral, cause and effect     | The caret jumps to the end on every keystroke.                  |
| Action succeeded | Brief, one word if it can be  | Copied                                                          |
| Nothing to show  | Calm, says why and what next  | No updates match these filters. Clear them to see every update. |
| Legal pages      | Plain, direct, no warmth-fill | The software is provided as is, without warranty.               |

## Microcopy patterns

- **Buttons and links**: a verb and its object ("Copy the install command", "Show more posts",
  "Clear filters"). Icon-only buttons carry the same wording in `aria-label`.
- **Toggles**: the label names the action the press takes ("Switch to dark theme"), updated when
  the state flips.
- **Empty states**: what would be here, and how to get it back if the reader caused the emptiness.
- **Errors**: what happened and what to do next, no codes or internals. The site has one failure a
  reader can see (a copy the browser refuses); see the audit.
- **Page titles**: `<Page> — Rxova`. Headings in sentence case.
- **Words to avoid**: simply, just, easy, obviously, seamless, blazing, "click here", idioms.

## Glossary

One word per concept, in copy and, where the reader can see it, in code.

| Use           | Meaning                                                          | Not                            |
| ------------- | ---------------------------------------------------------------- | ------------------------------ |
| Rxova         | The umbrella: the site and its projects. Capitalised in prose    | RxOva, RXOVA, rxova (in prose) |
| rxova.dev     | The website, when the address itself matters                     | rxova.org (retired)            |
| project       | One library family listed on the site (journey, react-inputs, …) | tool, product, lib             |
| package       | One installable npm package inside a project                     | module, dependency             |
| repo          | A GitHub repository; used where non-project repos also appear    | repository (in UI labels)      |
| docs          | A project's documentation site under `/packages/<id>/`           | documentation (in UI labels)   |
| post          | A blog article under `/blog`                                     | article, entry                 |
| update        | One item in the `/updates` stream                                | entry, log, changelog item     |
| walkthrough   | The before-and-after code tour on the landing                    | tour, demo                     |
| step          | One stop in a walkthrough                                        | note, slide                    |
| problem / fix | A step on the Before side / on the After side                    | issue, bug / solution          |
| maintainer    | The person who runs Rxova                                        | author (outside posts), owner  |

Project and package names are lowercase and in code style where they are identifiers
(`use-everywhere`, `@rxova/react-inputs`).

**For translators:** the site is English only today. Project names, package names, `rxova.dev`
and anything in code style never translate. Counts are built as whole sentences in one place
(`stepCount`, the updates count and progress text), so each can become one ICU message with a
`{count}` placeholder rather than joined fragments.

## Reviewing copy in a diff

For each changed user-facing string: does it follow the pattern for its kind, use the glossary
term, read at about age 12, avoid the listed words, and build any count as one whole sentence?
