import { router } from "expo-router";
import React from "react";
import { useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const SPRING = { damping: 28, stiffness: 300, mass: 0.9 };

export function SwipeBackView({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const panX = useSharedValue(0);

  function goBack() {
    router.back();
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
        panX.value = withSpring(width, SPRING, () => {
          runOnJS(goBack)();
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
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
