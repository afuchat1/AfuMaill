---
name: AfuMail native-only boundary
description: Product boundary for the AfuMail Expo artifact after removing website-focused surfaces.
---

The AfuMail Expo artifact is native-only. Website routes, website-origin configuration, browser-auth dependencies, web layout branches, and web favicon/configuration should not be added back to this artifact.

**Why:** The product decision is to keep OAuth/developer and other website-focused experiences on the website while making the mobile app a focused mail client.

**How to apply:** Keep native integrations such as `mailto` intent handling, native HTML email rendering through WebView, device keyboard/safe-area behavior, account recovery deep links, calendar, and mobile settings. If a feature primarily serves browser users, implement it in the website product instead of adding it to AfuMail.