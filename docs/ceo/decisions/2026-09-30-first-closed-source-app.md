# No new app before 22 November; the first closed-source release is trainmf (2026-09-30, Jonatan)

Status: never confirmed; replaced the same day by
[2026-09-30-small-phone-app.md](2026-09-30-small-phone-app.md).

Context: three closed-source candidates are on the table (trainmf, settlers, a new iOS screenshot
cleaner) while the open-source side has no outside users. On 2026-09-30 the org had 1 GitHub star
across seven public repos, 0 external dependents, and 971 commits in September, 265 of them in
trainmf. `social/START_HERE.md` sets the goal as a Senior/Staff Frontend role and opens the
campaign on 4 October; `social/linkedin/SCORECARD.csv` has no baseline and no week filled in.
trainmf's `docs/launch-checklist.md` says the feature work is done and that what is left is owner
work: Apple and Google enrolment, the legal identity, the store name, the first AWS apply, a first
build on a real device, and store billing.

Options:

- Build the screenshot cleaner first. Cost: a seventh project, two to four weeks inside the
  4 October to 21 November window, and the same enrolment and legal gates trainmf is waiting on. It
  teaches the store flow, but so does trainmf, and it reaches neither hiring managers nor library
  users. Jev is a hosted judge, so using it as the classifier sends users' screenshots to a server;
  an on-device model is the workable design, and then the app no longer shows off Jev.
- Push trainmf to the stores now. Cost: the same window, plus billing and the AWS stack. Gives up
  the campaign weeks for a product with no audience waiting.
- Start only the gates that run on someone else's clock (Apple enrolment, Google Play account, the
  legal identity), spend the window on distribution, and resume trainmf as the first closed-source
  release afterwards. Cost: no app ships before late November. Gives up nothing that is dated.

Decision: the third option, because the only dated thing on the board is the 4 October to
21 November hiring window, and every closed-source path waits on the same owner-only gates anyway.
Settlers stays parked: 15 commits in September, no payments or accounts, and a name constraint
(I9) that removes its best search term.

Reversibility: two-way door. Undoing it costs a new memo; the enrolments are useful under every
option.

Revisit: 2026-11-22, or earlier if the goal changes from a role to indie income, in which case
trainmf moves up and the screenshot cleaner still does not.
