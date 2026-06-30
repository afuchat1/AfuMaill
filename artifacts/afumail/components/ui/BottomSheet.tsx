import React, { useEffect, useRef, useState } from "react";
import { Dimensions, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet } from "react-native";
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
  const animating = useRef(false);

  function openSheet() {
    animating.current = false;
    overlayOpacity.value = withTiming(1, { duration: 220 });
    translateY.value = withSpring(0, OPEN_SPRING);
  }

  function closeSheet(callback?: () => void) {
    if (animating.current) return;
    animating.current = true;
    overlayOpacity.value = withTiming(0, { duration: 180 });
    translateY.value = withSpring(SCREEN_HEIGHT, CLOSE_SPRING, () => {
      runOnJS(finishClose)(callback);
    });
  }

  function finishClose(callback?: () => void) {
    setModalVisible(false);
    animating.current = false;
    callback?.();
  }

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      translateY.value = SCREEN_HEIGHT;
      overlayOpacity.value = 0;
      requestAnimationFrame(openSheet);
    } else {
      closeSheet();
    }
  }, [visible]);

  function handleOverlayPress() {
    closeSheet(onClose);
  }

  const pan = Gesture.Pan()
    .activeOffsetY(6)
    .onChange((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
        overlayOpacity.value = Math.max(0, 1 - e.translationY / 300);
      }
    })
    .onEnd((e) => {
      if (e.translationY > 80 || e.velocityY > 500) {
        overlayOpacity.value = withTiming(0, { duration: 160 });
        translateY.value = withSpring(SCREEN_HEIGHT, CLOSE_SPRING, () => {
          runOnJS(finishClose)(onClose);
        });
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

  return (
    <Modal
      visible={modalVisible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleOverlayPress}
    >
      <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="auto">
        <Pressable style={StyleSheet.absoluteFill} onPress={handleOverlayPress} />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.sheetContainer, sheetStyle]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoid}
          >
            {children}
          </KeyboardAvoidingView>
        </Animated.View>
      </GestureDetector>
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
