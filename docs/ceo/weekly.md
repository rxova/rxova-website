# Weekly priorities

Numbers come from `bash docs/ceo/metrics.sh <monday>`, except docs visits, which are read from
Cloudflare Web Analytics. North star and inputs are set in
[decisions/2026-09-29-north-star.md](decisions/2026-09-29-north-star.md).

## Week 40 (from 2026-09-28)

North star: external repos depending on an rxova package: **0** (first measurement).

Inputs, week ending 2026-09-27 against the week before:

- npm downloads, five main packages: 1,114 (-48%, from 2,128). use-everywhere 327, ts-extended-errors
  334, overlock 289, journey-core 124, react-inputs 40. At this size most of it is mirrors, bots and
  the projects' own CI; the drop is ts-extended-errors and overlock falling back after release weeks.
- GitHub stars, five project repos: 1 (journey 1, the rest 0).
- Issues and PRs from people outside the org: 0.
- Docs visits from outside referrers: not measured yet (see priority 2).

Nothing is wrong with the libraries; nobody outside knows they exist. Five projects, a design
system, a docs aggregator and 60 update posts have shipped, and none has been put in front of the
people who would use it.

Priorities

1. Launch use-everywhere 1.0 where React developers are: one Show HN, one r/reactjs post, both
   leading with the live demo and the "no Provider" snippet (Jonatan) -> stars, outside referrers
2. Record the Cloudflare Web Analytics baseline for docs visits by referrer, and add it to this
   file every Monday (Jonatan) -> docs visits from outside referrers
3. Add a two-line "Using this? Tell us" invitation, linking a GitHub Discussion, to the
   use-everywhere README and docs landing (Jonatan) -> outside issues and PRs, north star

Stop doing

- Website, brand and CI polish: the last 30 commits are almost all here and none moves an input.
  Paused until the north star is above zero; fixes for anything broken still go in.
- Updating rxova.org links in the other repos: the 301 already covers them. Done opportunistically,
  never as its own task.
- Starting or enabling a sixth project, or bringing overlock back onto the site, until one project
  has an outside user.
- Update posts about internal tooling (budgets, gates, turborepo). Posts go to things a user of the
  libraries would notice.

Decision this week: north star is external dependents
([memo](decisions/2026-09-29-north-star.md), two-way door). Pricing: none; every project is MIT
with no paid tier, and nothing is worth charging for before anyone outside uses it. Revisit at
50 external dependents.
