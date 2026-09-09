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
  // When false, the backdrop Pressable is removed from the tree instantly,
  // so no tap can be swallowed while the close animation plays.
  const [backdropActive, setBackdropActive] = useState(false);

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const overlayOpacity = useSharedValue(0);

  const animating = useRef(false);
  const alreadyClosed = useRef(false);

  function openSheet() {
    animating.current = false;
    alreadyClosed.current = false;
    setBackdropActive(true);
    overlayOpacity.value = withTiming(1, { duration: 220 });
    translateY.value = withSpring(0, OPEN_SPRING);
  }

  function closeSheet(shouldNotify: boolean) {
    if (animating.current || alreadyClosed.current) return;
    animating.current = true;
    alreadyClosed.current = true;

    // ── Key fix: kill the backdrop immediately so the very next tap
    //   goes straight to the content behind, not to an invisible overlay. ──
    setBackdropActive(false);

    overlayOpacity.value = withTiming(0, { duration: 180 });
    translateY.value = withSpring(SCREEN_HEIGHT, CLOSE_SPRING, () => {
      "worklet";
      runOnJS(finishClose)(shouldNotify);
    });
  }

  function finishClose(shouldNotify: boolean) {
    setModalVisible(false);
    if (shouldNotify) {
      onClose();
    }
    Promise.resolve().then(() => {
      animating.current = false;
    });
  }

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      translateY.value = SCREEN_HEIGHT;
      overlayOpacity.value = 0;
      alreadyClosed.current = false;
      animating.current = false;
      requestAnimationFrame(openSheet);
    } else {
      closeSheet(false);
    }
  }, [visible]);

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
      onRequestClose={() => closeSheet(true)}
    >
      {/* Overlay: pointer-events are disabled the moment close begins */}
      <Animated.View
        style={[
          styles.overlay,
          overlayStyle,
          { pointerEvents: backdropActive ? "box-none" : "none" },
        ]}
      >
        {backdropActive && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => closeSheet(true)}
          />
        )}
      </Animated.View>

      <GestureDetector gesture={pan}>{sheetContent}</GestureDetector>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
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
