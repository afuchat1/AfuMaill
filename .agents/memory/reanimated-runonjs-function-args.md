---
name: Reanimated runOnJS crashes on function arguments
description: Why passing callbacks as arguments to runOnJS(fn)(arg) from a worklet crashes, and what the safe pattern looks like.
---

Calling `runOnJS(fn)(someFunctionValue)` from inside a Reanimated worklet crashes with an error like `callback_0 is not a function (it is Object)`. Reanimated serializes arguments across the UI thread → JS thread boundary, and functions cannot be serialized that way.

Plain `runOnJS(fn)()` with no arguments, or with primitive/enum arguments (strings, numbers, booleans, null), is fine and is NOT a bug — don't "fix" those.

**Why:** Hit this exact crash in a bottom sheet component that tried to pass an `onClose` callback as a runOnJS argument from a pan-gesture worklet.

**How to apply:** If a worklet needs to conditionally invoke different JS-side behavior, store the callback in a ref set from the JS thread beforehand, and pass only a boolean/enum flag through `runOnJS` to select behavior — never pass the function itself.
