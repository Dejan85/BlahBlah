import React, {
  useRef,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { StyleSheet, Alert } from "react-native";
import { CameraView, FlashMode, CameraType, Camera } from "expo-camera";
import { Video } from "expo-av";
import { AVPlaybackStatus } from "expo-av";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";

import { CameraContext } from "@/context/CameraContext";
import { CaptureStep } from "@/components/Camera/CaptureStep";
import { PreviewStep } from "@/components/Camera/PreviewStep";

import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { SendStep } from "@/components/Camera/SendStep";

const AnimatedView = Animated.createAnimatedComponent(Animated.View);

export default function CameraScreen() {
  const {
    step,
    setStep,
    capturedPhoto,
    setCapturedPhoto,
    video,
    setVideo,
    isPreviewVisible,
    setIsPreviewVisible,
    selectedFilter,
  } = useContext(CameraContext);

  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [cameraMode, setCameraMode] = useState<"video" | "picture">("picture");
  const [facing, setFacing] = useState<CameraType>("back");
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const { from, conversationId } = useLocalSearchParams<{
    from?: string;
    conversationId: string;
  }>();

  const cameraRef = useRef<CameraView>(null);
  const videoRef = useRef<Video>(null);
  let recordingInterval: NodeJS.Timeout | null = null;
  const translateX = useSharedValue(0);

  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  console.log(from);
  const router = useRouter(); // Access the router

  // Request camera permissions on component mount
  useEffect(() => {
    (async () => {
      try {
        const { status: cameraStatus } =
          await Camera.requestCameraPermissionsAsync();
        const { status: micStatus } =
          await Camera.requestMicrophonePermissionsAsync();
        const { status: mediaStatus } =
          await MediaLibrary.requestPermissionsAsync();

        setHasPermission(
          cameraStatus === "granted" &&
            micStatus === "granted" &&
            mediaStatus === "granted",
        );
      } catch (error) {
        console.error("Error requesting permissions:", error);
        setHasPermission(false);
      }
    })();
  }, []);

  // Gesture handler for swipe navigation

  const handleNavigateBack = useCallback(() => {
    if (from === "chat" && conversationId) {
      router.replace({
        pathname: "/chats/chat-room/[id]",
        params: { id: conversationId },
      });
    } else {
      router.back();
    }
  }, [from, conversationId, router]);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      "worklet";
      if (step === "capture" && event.translationX > 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      "worklet";
      if (step === "capture" && event.translationX > 100) {
        runOnJS(handleNavigateBack)();
      }
      translateX.value = withTiming(0);
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const handlePlayPause = () => {
    if (status?.isLoaded && status.isPlaying) {
      videoRef.current?.pauseAsync();
    } else {
      videoRef.current?.playAsync();
    }
  };

  const startRecording = async () => {
    if (cameraRef.current) {
      setIsRecordingActive(true);
      setRecordingTime(0);

      recordingInterval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      try {
        const recordedVideo = await cameraRef.current.recordAsync({
          maxDuration: 30,
        });

        if (recordedVideo?.uri) {
          setVideo({ uri: recordedVideo.uri });
          setIsPreviewVisible(true);
          setStep("preview");
        }
      } catch (error) {
        console.error("Recording failed:", error);
      } finally {
        setIsRecordingActive(false);
        if (recordingInterval) {
          clearInterval(recordingInterval);
        }
      }
    }
  };

  const stopRecording = () => {
    if (isRecordingActive && cameraRef.current) {
      cameraRef.current.stopRecording();
      setIsRecordingActive(false);
      setIsPreviewVisible(true);
      setStep("preview");
      if (recordingInterval) {
        clearInterval(recordingInterval);
      }
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      setCapturedPhoto(photo);
      setIsPreviewVisible(true);
      setStep("preview");
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCapturedPhoto(result.assets[0]);
      setIsPreviewVisible(true);
      setStep("preview");
    }
  };

  const handleDownload = async () => {
    try {
      if (capturedPhoto?.uri) {
        const asset = await MediaLibrary.createAssetAsync(capturedPhoto.uri);
        await MediaLibrary.createAlbumAsync("Expo", asset, false);
        alert("Photo saved to gallery!");
      } else if (video?.uri) {
        const asset = await MediaLibrary.createAssetAsync(video.uri);
        await MediaLibrary.createAlbumAsync("Expo", asset, false);
        alert("Video saved to gallery!");
      }
    } catch (error) {
      console.error("Error saving media:", error);
      alert("Failed to save media.");
    }
  };

  const handleBack = () => {
    setCapturedPhoto(null);
    setVideo(null);
    setIsPreviewVisible(false);
    setStep("capture");
  };

  if (hasPermission === null) {
    return null; // Show a loading indicator or nothing while checking permissions
  }

  if (hasPermission === false) {
    return null; // Return to the previous screen if permission was denied
  }

  return (
    <GestureDetector gesture={gesture}>
      <AnimatedView style={[styles.container, animatedStyle]}>
        {step === "capture" && (
          <CaptureStep
            cameraRef={cameraRef}
            facing={facing}
            cameraMode={cameraMode}
            flashMode={flashMode}
            isRecordingActive={isRecordingActive}
            recordingTime={recordingTime}
            toggleCameraMode={() =>
              setCameraMode((current) =>
                current === "picture" ? "video" : "picture",
              )
            }
            toggleFlashMode={() =>
              setFlashMode((current) => (current === "on" ? "off" : "on"))
            }
            toggleCameraFacing={() =>
              setFacing((current) => (current === "back" ? "front" : "back"))
            }
            takePicture={takePicture}
            startRecording={startRecording}
            stopRecording={stopRecording}
            pickImage={pickImage}
          />
        )}

        {step === "preview" && (
          <PreviewStep
            videoRef={videoRef}
            handlePlayPause={handlePlayPause}
            handleDownload={handleDownload}
            setIsFilterMenuVisible={setIsFilterMenuVisible}
            onBack={handleBack}
            onNext={() => setStep("send")}
            capturedPhoto={capturedPhoto}
            video={video}
            setStatus={setStatus}
          />
        )}

        {step === "send" && (
          <SendStep
            onBack={() => setStep("preview")}
            onSubmit={(post) => {
              console.log("Post submitted:", post);
              setStep("capture");
              if (from === "chat" && conversationId) {
                router.replace({
                  pathname: "/chats/chat-room/[id]",
                  params: { id: conversationId },
                });
              } else {
                router.push("/home");
              }
            }}
          />
        )}
      </AnimatedView>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
});
