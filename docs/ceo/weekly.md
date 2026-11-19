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

### Readjusted 2026-09-30

The portfolio is four libraries: use-everywhere, journey, react-inputs, ts-extended-errors. Overlock
and jev-planner move to maintenance, so `metrics.sh` no longer counts overlock. On the same four,
week 40's downloads are 825, and that is the baseline for week 41.

Ahead of everything below (added 2026-09-30): a fourth interview at a company Jonatan wants to join.
Preparing for it outranks the three priorities, and the small iOS app gives way first if hours run
short. The campaign and outreach continue until an offer is signed.

Priorities

1. Finish the October material by Sat 3 Oct and send the six outreach messages on Sun 4 Oct, as
   `social/SCHEDULE.md` sets out (Jonatan) -> docs visits from outside referrers, and the LinkedIn
   scorecard
2. Record two baselines: Cloudflare Web Analytics docs visits by referrer, and the week-0 row of
   `social/linkedin/SCORECARD.csv`, which is still empty (Jonatan) -> docs visits from outside
   referrers
3. Prepare the use-everywhere Show HN for 14 Oct: the title, the first comment, the two-tab demo
   checked on a phone, and a two-line "Using this? Tell us" invitation linking a GitHub Discussion
   in the README and docs landing (Jonatan) -> stars, outside issues and PRs, north star

Launches

| When       | Project            | How                                                        |
| ---------- | ------------------ | ---------------------------------------------------------- |
| Wed 14 Oct | use-everywhere     | Show HN, leading with the live demo and "no Provider"      |
| Wed 4 Nov  | journey            | Show HN, after the 19 Oct stepper-and-statechart article   |
| A gap week | react-inputs       | The currency-input article as a normal link, not a Show HN |
| Optional   | ts-extended-errors | An article on round-tripping cause chains, not a Show HN   |

Both Show HN dates avoid the weeks of 6 Oct (the thesis post) and 27 Oct (the AI post), which need
the same hours in the comments. `social/CHANNELS.md` rules Show HN out for the hiring goal; these
two are for the north star, capped at one day each, and no Reddit either way.

One exception to the pause on site work: `@rxova/agent-kit` goes on the site and the CV before the
27 Oct post, which needs it as its artifact -> docs visits from outside referrers.

Stop doing

- Website, brand and CI polish: the last 30 commits are almost all here and none moves an input.
  Paused until the north star is above zero; fixes for anything broken still go in.
- Updating rxova.org links in the other repos: the 301 already covers them. Done opportunistically,
  never as its own task.
- Feature work and launches for overlock and jev-planner. Overlock rarely finds anything to stop in
  the trainmf trial, and jev-planner adds agent cost while the trend is to cut it. Both stay
  published and overlock stays off the site; fixes for anything broken still go in.
- Feature work on trainmf and settlers, and any new project except the one small iOS app, which
  runs to 30 Oct under its own conditions ([proposed memo](decisions/2026-09-30-small-phone-app.md)).
- Raising coverage and tidying CI on the frozen projects beyond what the freeze needs: no input
  moves. Done by Sun 4 Oct or left as it is.
- Adding jev-planner to the site: it is in maintenance and already has jev-planner.com.
- Update posts about internal tooling (budgets, gates, turborepo). Posts go to things a user of the
  libraries would notice.

Decisions this week: north star is external dependents
([memo](decisions/2026-09-29-north-star.md), two-way door). Overlock and jev-planner to maintenance
(two-way door; reopens if either gets an outside user or issue). Pricing: none; every project is MIT
with no paid tier, and nothing is worth charging for before anyone outside uses it. Revisit at
50 external dependents.
