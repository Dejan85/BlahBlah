import React, { useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Switch,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { CameraView, CameraType, FlashMode } from "expo-camera";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import { GalleryWhite, Record } from "@/assets/images";

interface CaptureStepProps {
  cameraRef: React.RefObject<CameraView>;
  facing: CameraType;
  cameraMode: "video" | "picture";
  flashMode: FlashMode;
  isRecordingActive: boolean;
  recordingTime: number;
  toggleCameraMode: () => void;
  toggleFlashMode: () => void;
  toggleCameraFacing: () => void;
  takePicture: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pickImage: () => Promise<void>;
}

export const CaptureStep: React.FC<CaptureStepProps> = ({
  cameraRef,
  facing,
  cameraMode,
  flashMode,
  isRecordingActive,
  recordingTime,
  toggleCameraMode,
  toggleFlashMode,
  toggleCameraFacing,
  takePicture,
  startRecording,
  stopRecording,
  pickImage,
}) => {
  // 1) Create an Animated.Value for the pulsing border
  const borderPulse = useRef(new Animated.Value(2)).current;

  // 2) Start/stop the pulsing effect whenever isRecordingActive changes
  useEffect(() => {
    if (isRecordingActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(borderPulse, {
            toValue: 10, // how thick you want the border to expand
            duration: 700,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(borderPulse, {
            toValue: 2, // back to default
            duration: 700,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease),
          }),
        ]),
      ).start();
    } else {
      // Stop animation and reset
      borderPulse.stopAnimation();
      borderPulse.setValue(2);
    }
  }, [isRecordingActive]);

  // 3) Create an animated style that references borderPulse
  const animatedCaptureStyle = {
    borderWidth: borderPulse,
  };

  return (
    <CameraView
      style={styles.camera}
      facing={facing}
      ref={cameraRef}
      mode={cameraMode}
      flash={flashMode}
    >
      {/* Recording indicator at top */}
      {isRecordingActive && (
        <View style={styles.recordingView}>
          <View style={styles.recordingIndicator} />
          <Text style={styles.recordingText}>{recordingTime}s</Text>
        </View>
      )}

      {/* Video/Photo switch */}
      <View style={styles.modeSwitchContainer}>
        <Text style={styles.modeSwitchLabel}>Video</Text>
        <Switch
          trackColor={{ false: "#767577", true: "#FF325E" }}
          thumbColor={"#fff"}
          ios_backgroundColor="#767577"
          onValueChange={toggleCameraMode}
          value={cameraMode === "video"}
          style={styles.modeSwitch}
        />
        <Text style={styles.modeSwitchLabel}>Photo</Text>
      </View>

      {/* Toggle flash */}
      <TouchableOpacity style={styles.flashButton} onPress={toggleFlashMode}>
        <MaterialIcons
          name={flashMode === "on" ? "flash-on" : "flash-off"}
          size={30}
          color="white"
        />
      </TouchableOpacity>

      {/* Bottom buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.btnContainer} onPress={pickImage}>
          <GalleryWhite fill={"#fff"} />
          <Text style={styles.btnText}>Gallery</Text>
        </TouchableOpacity>

        {/* 4) Wrap our animated style around the capture button */}
        <Animated.View style={[styles.captureButton, animatedCaptureStyle]}>
          <TouchableOpacity
            style={styles.innerCaptureButton}
            onPress={cameraMode === "picture" ? takePicture : undefined}
            onLongPress={cameraMode === "video" ? startRecording : undefined}
            onPressOut={cameraMode === "video" ? stopRecording : undefined}
          >
            {cameraMode === "video" && isRecordingActive ? (
              <FontAwesome name="stop" size={40} color="red" />
            ) : (
              <View></View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.btnContainer}
          onPress={toggleCameraFacing}
        >
          <MaterialIcons name="flip-camera-ios" size={30} color="white" />
          <Text style={styles.btnText}>Rotate</Text>
        </TouchableOpacity>
      </View>
    </CameraView>
  );
};

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  },
  flashButton: {
    position: "absolute",
    top: 69,
    right: 25,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modeSwitchContainer: {
    position: "absolute",
    left: 20,
    top: "50%",
    transform: [{ translateY: -70 }],
    zIndex: 10,
    alignItems: "center",
    height: 140,
    justifyContent: "space-between",
  },
  modeSwitch: {
    transform: [{ rotate: "-90deg" }],
  },
  modeSwitchLabel: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "InterSemiBold",
    textAlign: "center",
  },
  recordingView: {
    flexDirection: "row",
    position: "absolute",
    top: 69,
    left: 30,
    alignItems: "center",
  },
  recordingIndicator: {
    width: 10,
    height: 10,
    backgroundColor: "red",
    borderRadius: 5,
    marginRight: 5,
  },
  recordingText: {
    color: "#fff",
    fontFamily: "InterSemiBold",
    fontSize: 12,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 10,
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingBottom: 20,
  },
  btnContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#fff",
    fontFamily: "InterSemiBold",
    fontSize: 12,
    marginTop: 6,
  },
  /**
   *  A white circle with a red border
   */
  captureButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 50,
    height: 50,
    borderWidth: 5,
    borderColor: "#FF325E",
    borderRadius: 50,
    top: -20,

    // borderWidth will be animated
  },
  /**
   * The actual touchable area inside the circle
   * (optional if you need a smaller pressable inside the circle)
   */
  innerCaptureButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,

    borderRadius: 42,

    backgroundColor: "white",
    padding: 10,
  },
});
