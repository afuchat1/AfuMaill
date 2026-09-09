---
name: AfuMail SDK 57 maintenance
description: Non-obvious compatibility constraints for maintaining the native Expo SDK 57 artifact.
---

The AfuMail Expo artifact is on SDK 57 with React Native 0.86 and TypeScript 6. Keep splash settings in the `expo-splash-screen` config plugin, omit the removed `newArchEnabled` app config field, and use `StyleSheet.absoluteFill` rather than the removed `absoluteFillObject` type.

**Why:** SDK 57's config schema and React Native typings reject the older SDK 55 forms. The artifact is intentionally native-only, so its Expo workflow should produce a native bundle; web bundling will fail without `react-native-web` by design.

**How to apply:** When upgrading Expo again, run Expo Doctor and `expo install --check`, preserve the native-only dependency boundary, and verify the native bundle through the existing Expo workflow.