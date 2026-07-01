import { router } from "expo-router";
import React, { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const DURATION = 300;
const EASE = Easing.out(Easing.cubic);

interface Props {
  children: (goBack: () => void) => React.ReactNode;
}

/**
 * Drives BOTH the entrance (slide in from the right on mount) and the exit
 * (slide out to the right — via swipe-to-dismiss OR a programmatic goBack
 * call) with the exact same timing/easing curve, on every platform
 * (including web, where native stack gestures don't apply). Screens should
 * call the `goBack` function handed to them instead of `router.back()`
 * directly so button-tap exits animate identically to swipe exits.
 */
export function SwipeBackView({ children }: Props) {
  const { width } = useWindowDimensions();
  const panX = useSharedValue(width);

  useEffect(() => {
    panX.value = withTiming(0, { duration: DURATION, easing: EASE });
  }, []);

  function finish() {
    router.back();
  }

  function goBack() {
    panX.value = withTiming(width, { duration: DURATION, easing: EASE }, (finished) => {
      if (finished) runOnJS(finish)();
    });
  }

  const pan = Gesture.Pan()
    .activeOffsetX([8, Infinity])
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      panX.value = Math.max(0, e.translationX);
    })
    .onEnd((e) => {
      const committed = e.translationX > width * 0.32 || e.velocityX > 500;
      if (committed) {
        panX.value = withTiming(width, { duration: DURATION, easing: EASE }, (finished) => {
          if (finished) runOnJS(finish)();
        });
      } else {
        panX.value = withTiming(0, { duration: DURATION, easing: EASE });
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
