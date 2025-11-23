import React, { useCallback, useRef } from "react";
import {
  View,
  Modal,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from "react-native";
import {
  PinchGestureHandler,
  PanGestureHandler,
  State,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { AntDesign } from "@expo/vector-icons";
import {
  Canvas,
  Image as SkiaImage,
  useImage,
  ColorMatrix,
} from "@shopify/react-native-skia";
import {
  PinchGestureHandlerStateChangeEvent,
  PanGestureHandlerStateChangeEvent,
} from "react-native-gesture-handler";

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get("window");

interface ResizablePhotoProps {
  isVisible: boolean;
  onClose: () => void;
  imageUri: string;
  filterMatrix?: number[] | null;
}

export const ResizablePhoto: React.FC<ResizablePhotoProps> = ({
  isVisible,
  onClose,
  imageUri,
  filterMatrix,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const pinchRef = useRef();
  const panRef = useRef();
  const image = useImage(imageUri);

  const onPinchGestureEvent = Animated.event(
    [{ nativeEvent: { scale: scale } }],
    { useNativeDriver: true },
  );

  const onPanGestureEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: translateX,
          translationY: translateY,
        },
      },
    ],
    { useNativeDriver: true },
  );

  const onPinchHandlerStateChange = useCallback(
    ({ nativeEvent }: PinchGestureHandlerStateChangeEvent) => {
      if (nativeEvent.oldState === State.ACTIVE) {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          bounciness: 10,
        }).start();
      }
    },
    [],
  );

  const onPanHandlerStateChange = useCallback(
    ({ nativeEvent }: PanGestureHandlerStateChangeEvent) => {
      if (nativeEvent.oldState === State.ACTIVE) {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 10,
        }).start();
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 10,
        }).start();
      }
    },
    [],
  );

  if (!image) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <AntDesign name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <PanGestureHandler
            ref={panRef}
            simultaneousHandlers={pinchRef}
            onGestureEvent={onPanGestureEvent}
            onHandlerStateChange={onPanHandlerStateChange}
          >
            <Animated.View>
              <PinchGestureHandler
                ref={pinchRef}
                simultaneousHandlers={panRef}
                onGestureEvent={onPinchGestureEvent}
                onHandlerStateChange={onPinchHandlerStateChange}
              >
                <Animated.View
                  style={[
                    styles.imageContainer,
                    {
                      transform: [{ scale }, { translateX }, { translateY }],
                    },
                  ]}
                >
                  <Canvas style={styles.canvas}>
                    <SkiaImage
                      image={image}
                      fit="cover"
                      width={WINDOW_WIDTH}
                      height={WINDOW_HEIGHT * 0.8}
                    >
                      {filterMatrix && <ColorMatrix matrix={filterMatrix} />}
                    </SkiaImage>
                  </Canvas>
                </Animated.View>
              </PinchGestureHandler>
            </Animated.View>
          </PanGestureHandler>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  imageContainer: {
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT * 0.8,
    justifyContent: "center",
    alignItems: "center",
  },
  canvas: {
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT * 0.8,
  },
});

export default ResizablePhoto;
