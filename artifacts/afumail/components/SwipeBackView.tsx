import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

/**
 * Spring config that matches the main drawer / email-detail panel in index.tsx.
 * Using withSpring instead of withTiming gives the same physics-based feel as
 * the sidebar swipe and the email panel overlay.
 */
const SPRING = { damping: 28, stiffness: 300, mass: 0.9 };

/**
 * Drives BOTH the entrance (slide in from the right on mount) and the exit
 * (slide out to the right — via swipe-to-dismiss OR a programmatic goBack
 * call) with the exact same spring curve used by the sidebar drawer and the
 * email detail panel, on every platform.
 *
 * Screens should call the `goBack` function handed to them instead of
 * `router.back()` directly so button-tap exits animate identically to swipe
 * exits.
 */

interface Props {
  children: (goBack: () => void) => React.ReactNode;
}

export function SwipeBackView({ children }: Props) {
  const { width } = useWindowDimensions();
  const panX = useSharedValue(width);
  const isClosing = useRef(false);

  useEffect(() => {
    panX.value = withSpring(0, SPRING);
  }, []);

  function finish() {
    router.back();
  }

  function goBack() {
    if (isClosing.current) return;
    isClosing.current = true;
    panX.value = withSpring(width, SPRING, (finished) => {
      if (finished) runOnJS(finish)();
    });
  }

  const pan = Gesture.Pan()
    .activeOffsetX([8, Infinity])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      isClosing.current = false;
    })
    .onUpdate((e) => {
      panX.value = Math.max(0, e.translationX);
    })
    .onEnd((e) => {
      const committed =
        e.translationX > width * 0.32 || e.velocityX > 500;

      if (committed && !isClosing.current) {
        isClosing.current = true;
        panX.value = withSpring(width, SPRING, (finished) => {
          if (finished) runOnJS(finish)();
        });
      } else {
        panX.value = withSpring(0, SPRING);
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: panX.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ flex: 1 }, style]}>
        {children(goBack)}
      </Animated.View>
    </GestureDetector>
  );
}
