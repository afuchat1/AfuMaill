---
name: AfuMail SDK 55 maintenance
description: Non-obvious compatibility constraints for maintaining the native Expo SDK 55 artifact.
---

The AfuMail Expo artifact is aligned to SDK 55 with React Native 0.83 and TypeScript 5. Keep splash settings in the `expo-splash-screen` config plugin, omit the removed `newArchEnabled` app config field, and use `StyleSheet.absoluteFill` rather than the removed `absoluteFillObject` type.

**Why:** The installed Expo CLI and native dependency graph are SDK 55, while leftover SDK 57 packages caused duplicate native modules and failed dependency validation. The artifact is intentionally native-only, so its Expo workflow should produce a native bundle; web bundling will fail without `react-native-web` by design.

**How to apply:** When upgrading Expo again, run Expo Doctor and `expo install --check`, keep all Expo-native packages on one SDK line, preserve the native-only dependency boundary, and verify the native bundle through the existing Expo workflow.