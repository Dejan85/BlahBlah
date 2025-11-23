import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  Dimensions,
  StyleProp,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  useAnimatedGestureHandler,
  withTiming,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import {
  PanGestureHandler,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { Close, Submit } from "@/assets/images";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  modalStyle?: StyleProp<ViewStyle>;
  lineStyle?: StyleProp<ViewStyle>;
  header?: boolean;
  onSubmit?: () => void;
  initialSnap?: "closed" | "partial" | "full";
  onSnapChange?: (snap: "closed" | "partial" | "full") => void;
  snapPoint?: number | string;
  isOnBottom?: boolean;
  customSnapPoints?: {
    PARTIAL?: number;
    FULL?: number;
    CLOSED?: number;
  };
  bottomStyle?: StyleProp<ViewStyle>;
  bottomChildren?: React.ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  children,
  modalStyle,
  lineStyle,
  header = false,
  onSubmit,
  initialSnap = "partial",
  onSnapChange,
  isOnBottom,
  customSnapPoints,
  bottomStyle,
  bottomChildren,
}) => {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const active = useSharedValue(false);
  const scrollEnabled = useSharedValue(false);
  const [showBottom, setShowBottom] = useState(visible);

  const SNAP_POINTS = useMemo(
    () => ({
      CLOSED: SCREEN_HEIGHT,
      PARTIAL: customSnapPoints?.PARTIAL ?? SCREEN_HEIGHT * 0.7,
      FULL: customSnapPoints?.FULL ?? SCREEN_HEIGHT * 0.1,
    }),
    [customSnapPoints],
  );
  const initialPosition = useMemo(() => {
    switch (initialSnap) {
      case "closed":
        return SNAP_POINTS.CLOSED;
      case "full":
        return SNAP_POINTS.FULL;
      case "partial":
      default:
        return SNAP_POINTS.PARTIAL;
    }
  }, [initialSnap]);

  // Update the snap change handler
  useEffect(() => {
    if (visible) {
      setShowBottom(true);
      translateY.value = withSpring(initialPosition, {
        damping: 20,
        stiffness: 90,
      });
      if (onSnapChange) {
        if (initialPosition === SNAP_POINTS.FULL) {
          runOnJS(onSnapChange)("full");
        } else if (initialPosition === SNAP_POINTS.PARTIAL) {
          runOnJS(onSnapChange)("partial");
        }
      }
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, {
        damping: 20,
        stiffness: 90,
      });
      if (onSnapChange) {
        runOnJS(onSnapChange)("closed");
      }
      // Hide bottom view after animation
      setTimeout(() => {
        setShowBottom(false);
      }, 300); // Adjust timing to match your animation duration
    }
  }, [visible, initialPosition]);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startY = translateY.value;
      active.value = true;
    },
    onActive: (event, context) => {
      const newTranslateY = context.startY + event.translationY;
      translateY.value = Math.max(
        SNAP_POINTS.FULL,
        Math.min(newTranslateY, SCREEN_HEIGHT),
      );

      // Enable scrolling only when fully expanded
      scrollEnabled.value = translateY.value <= SNAP_POINTS.FULL + 20;
    },
    onEnd: (event) => {
      active.value = false;
      const velocity = event.velocityY;
      const shouldClose = translateY.value > SNAP_POINTS.PARTIAL;

      if (shouldClose) {
        translateY.value = withSpring(
          SCREEN_HEIGHT,
          {
            velocity: velocity,
            damping: 20,
            stiffness: 90,
          },
          () => {
            if (onClose) {
              runOnJS(onClose)();
            }
            if (onSnapChange) {
              runOnJS(onSnapChange)("closed");
            }
          },
        );
      } else if (
        velocity < -500 ||
        translateY.value < SNAP_POINTS.PARTIAL / 2
      ) {
        // If swiped up quickly or past halfway to full, snap to full
        translateY.value = withSpring(SNAP_POINTS.FULL, {
          velocity: velocity,
          damping: 20,
          stiffness: 90,
        });
        scrollEnabled.value = true;
        if (onSnapChange) {
          runOnJS(onSnapChange)("full");
        }
      } else {
        // Otherwise snap to partial
        translateY.value = withSpring(SNAP_POINTS.PARTIAL, {
          velocity: velocity,
          damping: 20,
          stiffness: 90,
        });
        scrollEnabled.value = false;
        if (onSnapChange) {
          runOnJS(onSnapChange)("partial");
        }
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    const borderRadius = interpolate(
      translateY.value,
      [SNAP_POINTS.FULL, SNAP_POINTS.PARTIAL],
      [0, 40],
      Extrapolate.CLAMP,
    );

    return {
      transform: [{ translateY: translateY.value }],
      borderTopLeftRadius: borderRadius,
      borderTopRightRadius: borderRadius,
    };
  });

  const backgroundStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [SCREEN_HEIGHT, SCREEN_HEIGHT - 1],
      [0, 0.5],
      Extrapolate.CLAMP,
    );

    return {
      opacity: withTiming(opacity, { duration: 150 }),
    };
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Animated.View style={[styles.overlay, backgroundStyle]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.background} />
        </TouchableWithoutFeedback>
      </Animated.View>

      <GestureHandlerRootView style={styles.container}>
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View style={[styles.sheet, animatedStyle, modalStyle]}>
            {header && (
              <View style={styles.header}>
                <Pressable style={styles.closeButton} onPress={onClose}>
                  <Close />
                </Pressable>
                {onSubmit && (
                  <Pressable style={styles.submitButton} onPress={onSubmit}>
                    <Submit fill="#fff" />
                  </Pressable>
                )}
              </View>
            )}
            <View style={[styles.line, lineStyle]} />

            <View style={[styles.content]}>{children}</View>
          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>

      {isOnBottom && showBottom && (
        <View style={bottomStyle}>{bottomChildren}</View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    height: SCREEN_HEIGHT,
    width: "100%",
    position: "absolute",
  },
  overlay: {
    backgroundColor: "#000",
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  onBottom: {
    position: "absolute",
    bottom: 10, // Fixed distance from bottom
    left: 0,
    right: 0,
    backgroundColor: "#F5F5F5",
    height: 80,
    marginHorizontal: 20, // Add some horizontal padding if needed
    borderRadius: 12, // Optional: add border radius
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 1000,
  },

  background: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#fff",
    height: SCREEN_HEIGHT,
    width: "100%",
    position: "absolute",
    top: 0,
    borderWidth: 3,
    borderColor: "#B3B3B3",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    height: 100,
    zIndex: 10,
  },
  closeButton: {
    position: "absolute",
    top: 54,
    left: 30,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    opacity: 0.5,
    width: 40,
    height: 40,
  },
  submitButton: {
    position: "absolute",
    top: 50,
    right: 30,
    backgroundColor: "#000",
    opacity: 0.5,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    width: 40,
    height: 40,
  },
  line: {
    height: 3,
    backgroundColor: "#B3B3B3",
    marginTop: 14,
    marginBottom: 19,
    marginHorizontal: 20,
    borderRadius: 40,
    width: 50,
    alignSelf: "center",
  },
  contentWrapper: {
    flex: 1,
    position: "relative", // Ensure positioning context
  },

  content: {
    flex: 1,
    paddingBottom: 100, // Add padding to prevent content from being hidden behind bottom view
  },
});

export default BottomSheet;
