import React from "react";

/**
 * Native stack navigation (gestureEnabled + animation: "slide_from_right")
 * now drives both the entrance and the interactive swipe-back exit, so the
 * two transitions use the exact same curve/timing. This wrapper is kept as
 * a stable import for existing screens but no longer applies its own
 * competing transform/gesture.
 */
export function SwipeBackView({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
