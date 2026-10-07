---
"@rxova/site": patch
---

Update the journey walkthrough on the landing page to journey 1.0.

`@rxova/journey-core` was pinned to `1.0.0-rc.3`, so the showcase was typechecked and
run against the release candidate rather than the published 1.0. The sample it printed
opened with `createJourneyMachine`, which v1 removed — anyone copying it got a broken
import.

The sample now uses `withGraphTypes` with per-step `on` entries, and the two notes whose
mechanism v1 replaced are rewritten: the address check is the event's `run` (guards stayed
synchronous, so `commit` stages the answer the guard reads), and navigation is refused
while that work is in flight rather than queued behind it.
