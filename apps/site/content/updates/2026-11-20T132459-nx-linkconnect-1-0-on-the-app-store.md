---
title: NX LinkConnect 1.0 is on the App Store
date: 2026-11-20T13:24:59Z
repos: [nx-link, rxova-website]
authors: [jonatan-kruszewski]
tags: [release, feature]
version: "NX LinkConnect 1.0"
links:
  - label: App Store
    href: https://apps.apple.com/app/nx-linkconnect/id6832550713
---

The first Rxova app is published. NX LinkConnect copies photos off a Samsung NX camera onto an
iPhone over the camera's own Wi-Fi: it joins the network the camera raises, lists the card, and
saves full-resolution originals straight into the photo library, with a live viewfinder and a
remote shutter alongside. It is free, there is no account, and nothing is collected.

Samsung withdrew the Smart Camera app, but the hardware never stopped working — an NX300 still
raises its access point and still answers. The protocol it answers with was never documented, so
the app was written against two real cameras a packet at a time. The NX300 and NX3000 are tested
end to end; other NX bodies are unverified rather than excluded, because the app reads what a
camera declares instead of branching on its model.

rxova.dev has an [Apps](/apps/) section to go with it, first in the menu, beside Projects, Blog and
Updates. It lists what Rxova ships to a store rather than to npm, and [NX
LinkConnect's page](/apps/nx-link/) now offers the download the listing had been waiting for.
