---
"@rxova/brand": minor
---

Add NX LinkConnect to `REPOS`, so an update entry can be about the app and the updates page can filter by it. Its entry carries `page: "/apps/nx-link/"` instead of `repo`, because the app's source is private: a consumer reading `REPOS` must handle an entry with no GitHub URL and send the reader to the page instead.
