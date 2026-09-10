---
name: AfuMail native and web boundary
description: Product boundary for the AfuMail Expo artifact and its browser preview.
---

The AfuMail Expo artifact supports the native mail client and an Expo Web preview of the same app. This does not make it a general website product: unrelated website routes, website-origin configuration, or browser-only product surfaces should not be added here.

**Why:** The browser preview is useful for Replit development, while the product boundary remains a focused mail client with native behavior preserved.

**How to apply:** Keep native integrations such as `mailto` intent handling, native HTML email rendering through WebView, device keyboard/safe-area behavior, account recovery deep links, calendar, and mobile settings. Native manifest changes such as Android email intent filters require a new installed Android build; Expo Web preview cannot verify them. Android must approve the default email app through system settings, so register the intent filters without adding unrelated in-app controls. Keep Expo Web compatibility for previewing existing app screens, but implement features primarily serving browser users in the website product.