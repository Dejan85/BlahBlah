import { DeleteAction, MuteAction, Pin, PinAction } from "@/assets/images";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

interface SwipeableChatItemProps {
  children: React.ReactNode;
  onPin: () => void;
  onMute: () => void;
  onDelete: () => void;
  isPinned?: boolean;
  isMuted?: boolean;
  enableSwipe?: boolean; // Add this prop
}

const SwipeableChatItem: React.FC<SwipeableChatItemProps> = ({
  children,
  onPin,
  onMute,
  onDelete,
  isPinned = false,
  isMuted = false,
  enableSwipe = false, // Add this prop
}) => {
  const translateX = useSharedValue(0);
  const isOpen = useSharedValue(false);
  const actionWidth = 180;

  const resetPosition = () => {
    "worklet";
    translateX.value = withSpring(0, {
      damping: 15,
      stiffness: 100,
      mass: 0.8,
    });
    isOpen.value = false;
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .enabled(enableSwipe) // Enable/disable gesture based on prop
    .onUpdate((event) => {
      "worklet";
      if (isOpen.value) {
        // If actions are visible, only allow swiping back (right)
        if (event.translationX > 0) {
          const newValue = -actionWidth + event.translationX;
          translateX.value = Math.min(0, newValue);
        }
      } else {
        // If closed, only allow swiping left
        if (event.translationX < 0) {
          translateX.value = Math.max(-actionWidth, event.translationX);
        }
      }
    })
    .onEnd((event) => {
      "worklet";
      const velocity = event.velocityX;

      if (isOpen.value) {
        // If actions are visible, check if should close
        if (translateX.value > -actionWidth / 2 || velocity > 500) {
          translateX.value = withSpring(0, {
            velocity: velocity,
            damping: 15,
            stiffness: 100,
            mass: 0.8,
          });
          isOpen.value = false;
        } else {
          translateX.value = withSpring(-actionWidth);
        }
      } else {
        // If closed, check if should open
        if (translateX.value < -actionWidth / 2 || velocity < -500) {
          translateX.value = withSpring(-actionWidth);
          isOpen.value = true;
        } else {
          translateX.value = withSpring(0);
        }
      }
    });

  const rStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handlePin = () => {
    "worklet";
    runOnJS(onPin)();
    runOnJS(resetPosition)();
  };

  const handleMute = () => {
    "worklet";
    runOnJS(onMute)();
    runOnJS(resetPosition)();
  };

  const handleDelete = () => {
    "worklet";
    runOnJS(onDelete)();
    runOnJS(resetPosition)();
  };

  return (
    <View style={styles.container}>
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.pinButton]}
          onPress={handlePin}
        >
          <View style={styles.borderLineLeft} />
          <PinAction />

          <Text style={styles.actionText}>{isPinned ? "Unpin" : "Pin"}</Text>
          <View style={styles.borderLineRight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.muteButton]}
          onPress={handleMute}
        >
          <View style={styles.borderLineLeft} />
          <MuteAction />
          <Text style={styles.actionText}>{isMuted ? "Unmute" : "Mute"}</Text>
          <View style={styles.borderLineRight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
        >
          <View style={styles.borderLineLeft} />
          <DeleteAction fill={"#111"} />
          <Text style={styles.actionText}>Delete</Text>
          <View style={styles.borderLineRight} />
        </TouchableOpacity>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.contentContainer, rStyle]}>
          {children}
          {isPinned && (
            <View style={styles.pinnedBadge}>
              <Pin />
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",

    marginVertical: 10,
  },
  contentContainer: {
    backgroundColor: "#FFFFFF",
    zIndex: 2,
  },
  borderLineLeft: {
    position: "absolute",
    left: 0,
    top: "25%", // Start at 25% from the top
    height: "50%", // 50% height
    width: 0.5, // Border thickness
    backgroundColor: "#D9D9D9",
  },
  borderLineRight: {
    position: "absolute",
    right: 0,
    top: "25%",
    height: "50%",
    width: 0.5,
    backgroundColor: "#D9D9D9",
  },
  actionsContainer: {
    position: "absolute",
    right: 10,
    top: "50%", // Position at 50% from top
    transform: [{ translateY: -25 }], // Half of your button height to center perfectly
    height: 50, // Explicit height for the buttons
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
  },
  actionButton: {
    width: 37,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative", // Needed for absolute-positioned children
  },

  actionText: {
    color: "#B3B3B3",
    fontSize: 8,
    fontFamily: "InterRegular",
  },
  pinButton: {
    backgroundColor: "#fff",
  },
  muteButton: {
    backgroundColor: "#fff",
  },
  deleteButton: {
    backgroundColor: "#fff",
  },
  pinnedBadge: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: [{ translateY: -10 }],

    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pinnedText: {
    fontSize: 12,
    fontFamily: "InterMedium",
    color: "#666666",
  },
});

export default SwipeableChatItem;
