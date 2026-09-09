---
name: AfuMail Expo preview
description: Runtime verification for the native AfuMail artifact uses the Expo workflow.
---

The AfuMail mobile workflow starts Metro on its managed Expo port rather than serving a browser page on the default web preview port. A native workflow can be healthy even when the generic browser screenshot endpoint returns connection refused. React Native DevTools may also log a missing `libnspr4.so` warning while Metro remains available.

**Why:** The native artifact is consumed through Expo Go or the Replit mobile preview, not as a browser-rendered web app.

**How to apply:** Restart `artifacts/afumail: expo`, inspect workflow logs, and use the Expo QR/mobile preview for runtime checks. Treat the DevTools shared-library warning as separate from Metro startup unless the workflow itself fails.