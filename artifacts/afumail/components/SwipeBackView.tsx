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

const SPRING = { damping: 28, stiffness: 300, mass: 0.9 };

/**
 * Swipe-to-go-back view that only activates from the left edge (~30px).
 * Uses manualActivation so the native ScrollView always wins for vertical
 * scrolls — the pan gesture fails immediately if movement is more vertical
 * than horizontal, letting the scroll view take full control.
 */

const EDGE_SLOP = 30;

interface Props {
  children: (goBack: () => void) => React.ReactNode;
}

export function SwipeBackView({ children }: Props) {
  const { width } = useWindowDimensions();
  const panX = useSharedValue(width);
  const isClosing = useRef(false);

  const startedFromEdge = useSharedValue(false);
  const initialX = useSharedValue(0);
  const initialY = useSharedValue(0);

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
    .manualActivation(true)
    .onBegin((e) => {
      isClosing.current = false;
      startedFromEdge.value = e.x <= EDGE_SLOP;
      initialX.value = e.x;
      initialY.value = e.y;
    })
    .onTouchesMove((e, stateManager) => {
      const touch = e.changedTouches[0];
      if (!touch) return;

      if (!startedFromEdge.value) {
        stateManager.fail();
        return;
      }

      const dx = touch.x - initialX.value;
      const dy = touch.y - initialY.value;

      if (Math.abs(dy) > Math.abs(dx) + 3) {
        stateManager.fail();
        return;
      }

      if (dx > 8) {
        stateManager.activate();
      }
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
    })
    .onFinalize(() => {
      if (!isClosing.current) {
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
