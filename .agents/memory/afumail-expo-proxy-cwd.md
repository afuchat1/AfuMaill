---
name: AfuMail Expo proxy working directory
description: Environment-specific Expo Web preview behavior for the AfuMail managed workflow.
---

The AfuMail Expo proxy must spawn Metro with the artifact directory as its working directory, not the monorepo root. A stale process holding the preview port can also mask the corrected workflow and continue serving the old broken bundle.

**Why:** Metro resolves Expo Router and the app entry relative to its working directory. Starting at the workspace root produced a JSON UnableToResolveError instead of JavaScript, which rendered as a blank browser preview.

**How to apply:** Keep the proxy's child-process cwd anchored to the AfuMail artifact. If the workflow repeatedly reports the preview port as busy after a restart, inspect and stop only the orphaned old Expo/proxy process before verifying the new bundle.