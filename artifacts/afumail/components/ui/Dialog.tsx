import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface DialogProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Dialog({ visible, onClose, children }: DialogProps) {
  const [mounted, setMounted] = useState(false);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);
  const closing = useRef(false);

  function animateIn() {
    closing.current = false;
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  }

  function animateOut(callback: () => void) {
    if (closing.current) return;
    closing.current = true;
    opacity.value = withTiming(0, { duration: 160 }, () => {});
    scale.value = withTiming(0.94, { duration: 160 });
    setTimeout(callback, 170);
  }

  useEffect(() => {
    if (visible) {
      setMounted(true);
      requestAnimationFrame(animateIn);
    } else {
      animateOut(() => setMounted(false));
    }
  }, [visible]);

  function handleClose() {
    animateOut(() => {
      setMounted(false);
      onClose();
    });
  }

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!mounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "box-none" }]}>
      <Animated.View style={[styles.overlay, overlayStyle, { pointerEvents: "auto" }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>
      <Animated.View style={[styles.cardWrapper, cardStyle, { pointerEvents: "box-none" }]}>
        <View style={[styles.cardInner, { pointerEvents: "auto" }]}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardWrapper: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "box-none" as any,
  },
  cardInner: {
    width: "86%",
    maxWidth: 400,
  },
});
