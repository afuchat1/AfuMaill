---
name: AfuMail workspace dependency alignment
description: Prevent stale node_modules from running a different Expo SDK than the committed AfuMail manifest and lockfile.
---

The AfuMail workspace must be reinstalled from the committed pnpm lockfile when package versions change or the resolved runtime looks inconsistent. Verify the resolved Expo and React Native versions before debugging app code.

**Why:** A stale workspace install ran Expo 55 even though the AfuMail manifest and lockfile required Expo 57, producing misleading compatibility warnings and masking the real toolchain state.

**How to apply:** Run the lockfile-based workspace install, confirm the resolved Expo line, then restart the managed Expo workflow before judging runtime behavior. Expo prebuild can promote Expo, React, and React Native into production dependencies; sync the lockfile afterward.