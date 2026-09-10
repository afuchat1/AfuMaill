---
name: AfuMail SDK 57 maintenance
description: Non-obvious compatibility constraints for maintaining the Expo SDK 57 artifact.
---

The AfuMail Expo artifact is aligned to SDK 57 with React Native 0.86 and TypeScript 6. Keep splash settings in the `expo-splash-screen` config plugin, omit the removed `newArchEnabled` app config field, and use `StyleSheet.absoluteFill` rather than the removed `absoluteFillObject` type.

**Why:** Expo Go on the target phone uses SDK 57. A mixed SDK 55/57 dependency tree caused the native “project is incompatible” screen and stale Metro paths during installation. The artifact intentionally supports both Expo Go and Expo Web.

**How to apply:** When upgrading Expo again, run `expo install --check`, keep all Expo-native packages on one SDK line, preserve both native and web support, and verify the QR/native bundle and browser preview through the existing Expo workflow.