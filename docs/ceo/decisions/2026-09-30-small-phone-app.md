# The spare capacity goes to one small iOS app, time-boxed to 30 October (2026-09-30, Jonatan)

Status: proposed. Replaces
[2026-09-30-first-closed-source-app.md](2026-09-30-first-closed-source-app.md), which was never
confirmed.

Context: the six public projects are being frozen and the campaign in `social/` is planned at about
five hours a week, so there is capacity left over. The earlier memo assumed there was not. trainmf's
`docs/launch-checklist.md` says its feature work is done and that its release waits on an AWS
apply, a user pool, legal documents and store billing, and that no build has run on a real device.
Settlers had 15 commits in September and has no accounts or payments.

Options:

- More trainmf development. Cost: more features on a product whose features are done; teaches
  nothing about releasing. Gives up the ramp-up.
- trainmf's release work. Cost: every unknown at once (device, review, billing, AWS, legal) on the
  product that matters most. Gives up a cheap place to make first-release mistakes.
- One small iOS app with no account and no server, built with Expo like trainmf. Cost: up to four
  weeks and a seventh codebase. It meets the unknowns trainmf shares (enrolment, a real device,
  TestFlight, App Review, then a purchase) without the ones it does not.

Decision: the small app, because it is the only option that teaches the release path, and on the
same stack trainmf will use.

Conditions: campaign hours come first each week. iOS only, on-device only, no account, no server,
no Jev. On your own phone through TestFlight by 16 October; submitted to App Review by 30 October.
A purchase comes in a second version, after the first is approved. It is judged on "approved in the
App Store", not on revenue.

Reversibility: two-way door. Stopping costs the weeks spent; the Apple account and the lessons
carry to trainmf either way.

Revisit: 16 October if it is not on a phone (cut scope), 30 October if it is not submitted (stop and
write down what blocked it).
