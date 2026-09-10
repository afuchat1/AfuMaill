---
name: AfuMail Expo preview
description: Runtime verification for AfuMail's Expo Web and native previews.
---

The managed AfuMail workflow serves Expo Web through the browser preview port and also exposes an Expo Go QR URL for native checks. The browser preview should render the app UI, while Expo Go is used for device-specific validation.

**Why:** The project needs a visible Replit browser preview without losing the native Expo workflow.

**How to apply:** Restart `artifacts/afumail: expo`, inspect workflow logs, and screenshot the browser preview for UI checks. Use the Expo QR/mobile preview for native checks. DevTools library errors are separate from app rendering unless bundling or the workflow fails.

The managed workflow can report `RUNNING` while the Expo proxy repeatedly retries because port 8099 is already occupied.

**Why:** A stale or overlapping Expo process can hold the configured port even when the browser preview remains available through the existing process.

**How to apply:** Treat repeated `Port 8099 busy` lines as a process/port conflict, not proof that the app bundle is broken; verify the preview and browser logs separately before changing the app.