import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  Dimensions,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { Close, Submit } from '@/assets/images';

interface BottomModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  modalStyle?: StyleProp<ViewStyle>;
  lineStyle?: StyleProp<ViewStyle>;
  height?: number; // Added height as props
  line?: boolean; // Added line as props
  header?: boolean;
  onSubmit?: () => void; // Added onSubmit as props
}

const { height: windowHeight } = Dimensions.get('window');
const defaultModalHeight = windowHeight * 0.5; // Default if height not provided

const BottomModal: React.FC<BottomModalProps> = ({
  visible,
  onClose,
  children,
  modalStyle,
  lineStyle,
  height,
  header = false,
  onSubmit,
  line = true, // Added line as props
}) => {
  const modalHeight = height ?? defaultModalHeight;
  const translateY = useSharedValue(modalHeight);
  const scrollEnabled = useSharedValue(true);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20 });
    } else {
      translateY.value = withTiming(modalHeight, {}, () => runOnJS(onClose)());
    }
  }, [visible]);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx: any) => {
      if (event.translationY > 0) {
        translateY.value = ctx.startY + event.translationY;
        scrollEnabled.value = false;
      } else {
        scrollEnabled.value = true;
      }
    },
    onEnd: (event) => {
      if (event.translationY > modalHeight * 0.2) {
        translateY.value = withTiming(modalHeight, {}, () =>
          runOnJS(onClose)()
        );
      } else {
        translateY.value = withSpring(0, { damping: 20 });
      }
      scrollEnabled.value = true;
    },
  });

  return (
    <Modal visible={visible} transparent animationType="none">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <GestureHandlerRootView
        style={[styles.modalContainer, { height: modalHeight }]}
      >
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View
            style={[
              styles.modalContent,
              animatedStyle,
              modalStyle,
              { height: modalHeight },
            ]}
          >
            {header && (
              <View style={styles.header}>
                <Pressable style={styles.closeButton} onPress={onClose}>
                  <Close />
                </Pressable>

                <Pressable
                  style={styles.submitButton}
                  onPress={onSubmit}
                  disabled={!scrollEnabled.value}
                >
                  <Submit fill={'#fff'} />
                </Pressable>
              </View>
            )}
            {line && <View style={[styles.line, lineStyle]} />}
            <View style={styles.innerContent}>{children}</View>
          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  line: {
    height: 3,
    backgroundColor: '#B3B3B3',
    marginTop: 14,
    marginBottom: 19,
    marginHorizontal: 20,
    borderRadius: 40,
    width: 50,
    alignContent: 'center',
    alignSelf: 'center',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  submitButton: {
    position: 'absolute',
    top: 50,
    right: 30,
    backgroundColor: '#000',
    opacity: 0.5,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 3,
    borderColor: '#B3B3B3',
  },
  closeButton: {
    position: 'absolute',
    top: 54,
    left: 30,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    opacity: 0.5,
    width: 40,
    height: 40,
  },
  innerContent: {
    flex: 1,
  },
  header: {
    zIndex: 10,
    borderRadius: 0,
  },
});

export default BottomModal;
