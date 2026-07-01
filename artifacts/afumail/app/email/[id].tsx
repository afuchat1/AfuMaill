import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useWindowDimensions } from "react-native";

import EmailDetailPanel from "@/components/EmailDetailPanel";

const SPRING = { damping: 28, stiffness: 300, mass: 0.9 };

export default function EmailDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const panelX = useSharedValue(0);

  function goBack() {
    router.back();
  }

  const pan = Gesture.Pan()
    .activeOffsetX([8, Infinity])
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      panelX.value = Math.max(0, e.translationX);
    })
    .onEnd((e) => {
      const committed = e.translationX > width * 0.32 || e.velocityX > 500;
      if (committed) {
        panelX.value = withSpring(width, SPRING, () => {
          runOnJS(goBack)();
        });
      } else {
        panelX.value = withSpring(0, SPRING);
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: panelX.value }],
  }));

  if (!id) return null;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[StyleSheet.absoluteFill, style]}>
        <EmailDetailPanel emailId={id} onClose={goBack} />
      </Animated.View>
    </GestureDetector>
  );
}
