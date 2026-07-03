import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const OPEN_SPRING = { damping: 26, stiffness: 300, mass: 0.8 };
const CLOSE_SPRING = { damping: 22, stiffness: 280 };

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const overlayOpacity = useSharedValue(0);

  // animating: true while a close animation is in flight
  const animating = useRef(false);
  // alreadyClosed: set to true once we've kicked off a close, reset on open.
  // Prevents the parent's visible=false re-render from triggering a second closeSheet.
  const alreadyClosed = useRef(false);

  function openSheet() {
    animating.current = false;
    alreadyClosed.current = false;
    overlayOpacity.value = withTiming(1, { duration: 220 });
    translateY.value = withSpring(0, OPEN_SPRING);
  }

  function closeSheet(shouldNotify: boolean) {
    // Guard: ignore if we're already closing
    if (animating.current || alreadyClosed.current) return;
    animating.current = true;
    alreadyClosed.current = true;

    overlayOpacity.value = withTiming(0, { duration: 180 });
    translateY.value = withSpring(SCREEN_HEIGHT, CLOSE_SPRING, () => {
      "worklet";
      runOnJS(finishClose)(shouldNotify);
    });
  }

  function finishClose(shouldNotify: boolean) {
    setModalVisible(false);
    // Reset animating AFTER we call the callback so that any re-render
    // triggered by the callback still sees animating=true and skips closeSheet.
    if (shouldNotify) {
      onClose();
    }
    // Defer the reset so React's batched re-render from onClose() fires first
    Promise.resolve().then(() => {
      animating.current = false;
    });
  }

  useEffect(() => {
    if (visible) {
      // Opening
      setModalVisible(true);
      translateY.value = SCREEN_HEIGHT;
      overlayOpacity.value = 0;
      alreadyClosed.current = false;
      animating.current = false;
      requestAnimationFrame(openSheet);
    } else {
      // External close request — only act if we haven't already started closing
      closeSheet(false);
    }
  }, [visible]);

  function handleOverlayPress() {
    closeSheet(true);
  }

  // Pan gesture for native drag-to-dismiss (skip on web to avoid pointer event leaks)
  const pan = Gesture.Pan()
    .activeOffsetY(6)
    .onChange((e) => {
      "worklet";
      if (e.translationY > 0) {
        translateY.value = e.translationY;
        overlayOpacity.value = Math.max(0, 1 - e.translationY / 300);
      }
    })
    .onEnd((e) => {
      "worklet";
      if (e.translationY > 80 || e.velocityY > 500) {
        runOnJS(closeSheet)(true);
      } else {
        overlayOpacity.value = withTiming(1, { duration: 180 });
        translateY.value = withSpring(0, OPEN_SPRING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const sheetContent = (
    <Animated.View style={[styles.sheetContainer, sheetStyle]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
        style={styles.keyboardAvoid}
      >
        {children}
      </KeyboardAvoidingView>
    </Animated.View>
  );

  return (
    <Modal
      visible={modalVisible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleOverlayPress}
    >
      <Animated.View
        style={[styles.overlay, overlayStyle, { pointerEvents: "box-none" }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleOverlayPress} />
      </Animated.View>

      {Platform.OS === "web" ? (
        // On web, skip GestureDetector entirely — it leaks pointer-event
        // handlers on Modal close which freezes subsequent interaction.
        sheetContent
      ) : (
        <GestureDetector gesture={pan}>
          {sheetContent}
        </GestureDetector>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  keyboardAvoid: {
    width: "100%",
  },
});
