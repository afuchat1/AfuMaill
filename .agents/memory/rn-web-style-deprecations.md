---
name: React Native Web style/prop deprecations
description: Deprecated style props and JSX props that trigger console warnings on RN Web, and their replacements.
---

On React Native Web (RN 0.83+), two patterns trigger deprecation warnings in the browser console:

1. `shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius` style props → replace with a single `boxShadow: "Xpx Ypx Zpx rgba(...)"` string (keep `elevation` for Android, it's unrelated).
2. The `pointerEvents="..."` JSX prop on `View`/`Animated.View` → move it into the `style` prop as `{ pointerEvents: "..." }` merged into the style array.

**Why:** Found these as active console warnings during a full app warning sweep; both are silent-but-real deprecations that don't break functionality yet but clutter the console and will eventually be removed.

**How to apply:** When touching any component with `shadow*` styles or a `pointerEvents` prop, convert to the new forms above rather than leaving the warning in place.
