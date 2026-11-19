# The north star is external repos depending on an rxova package (2026-09-29, Jonatan)

Context: rxova ships five MIT libraries and the site that presents them, with no metric to steer
by. On 2026-09-29 the projects had 1,114 npm downloads in a week, 1 GitHub star between them, no
issues or PRs from anyone outside the org, and no repo outside the org listing one of them in its
`package.json`. The work of the last two months has gone into the site, the brand and CI.

Options:

- npm weekly downloads. Free to read and moves every week, but at this size it is mostly mirrors,
  bots and the projects' own CI, and it rises with release frequency rather than use.
- GitHub stars. Easy to move with a launch post, but a star is interest, not use.
- External repos depending on a package, from GitHub code search on `package.json`. Rises only when
  someone outside puts a library in their code, which is the value the projects promise. Slow, and
  blind to private repos.

Decision: external dependents, because it is the only one of the three that counts use rather than
attention. Downloads, stars, outside issues and PRs, and docs visits from outside referrers are its
inputs.

Reversibility: two-way door. Changing the metric costs a new memo and losing comparability in
`weekly.md`, nothing else.

Revisit: when the count passes 10 (switch to one that separates projects), or on 2026-12-28 if it is
still 0 (the inputs are wrong, or the audience is).
