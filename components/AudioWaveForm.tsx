import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Audio } from "expo-av";

interface AudioWaveformProps {
  recording: Audio.Recording | null;
  isRecording: boolean;
  playbackPosition?: number;
  playbackDuration?: number;
  recordingTimer?: number;
  onSeek?: (position: number) => void;
  style?: StyleProp<ViewStyle>;
  waveStyle?: StyleProp<ViewStyle>;
  timerStyle?: StyleProp<ViewStyle>;
  recordingIndicatorStyle?: StyleProp<ViewStyle>;
  recordingContainerStyle?: StyleProp<ViewStyle>;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({
  recording,
  isRecording,
  playbackPosition = 0,
  playbackDuration = 0,
  recordingTimer = 0,
  style,
  waveStyle,
  onSeek,
  timerStyle,
  recordingIndicatorStyle,
  recordingContainerStyle,
}) => {
  const [amplitudes, setAmplitudes] = useState<number[]>([]);
  const BAR_COUNT = 50; // adjust as needed

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    const updateMeter = async () => {
      if (recording && isRecording) {
        try {
          const status = await recording.getStatusAsync();
          const currentAmplitude = status.metering ?? -160;
          // Normalize amplitude from [-160, 0] -> [0, 1]
          const normalizedAmplitude = Math.max(
            0,
            (currentAmplitude + 160) / 160,
          );
          setAmplitudes((prev) =>
            [...prev, normalizedAmplitude].slice(-BAR_COUNT),
          );
        } catch (error) {
          console.error("Error updating meter:", error);
        }
      }
    };

    if (isRecording) {
      intervalId = setInterval(updateMeter, 100);
    } else {
      // Reset when not recording
      setAmplitudes([]);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [recording, isRecording]);

  const handleBarPress = (index: number) => {
    if (!isRecording && onSeek && playbackDuration) {
      const newPosition = (index / BAR_COUNT) * playbackDuration;
      onSeek(newPosition);
    }
  };

  // For playback, we calculate how far along we are
  const progress = playbackDuration ? playbackPosition / playbackDuration : 0;

  const renderPlaybackBars = () => {
    return Array.from({ length: BAR_COUNT }).map((_, index) => {
      // A simple wave-like effect—replace or remove as needed
      const height = (Math.sin(index * 0.3) + Math.cos(index * 0.3)) * 8 + 18;
      const isPlayed = index / BAR_COUNT <= progress;

      return (
        <TouchableOpacity
          key={index}
          onPress={() => handleBarPress(index)}
          style={styles.barTouchable}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.bar,
              {
                height: Math.max(2, height),
                backgroundColor: isPlayed ? "#fff" : "rgba(255, 255, 255, 0.4)",
              },
            ]}
          />
        </TouchableOpacity>
      );
    });
  };

  const renderRecordingBars = () => {
    return Array.from({ length: BAR_COUNT }).map((_, index) => {
      // If we have fewer amplitudes than BAR_COUNT, handle safely
      const amplitude = amplitudes[index] ?? 0;
      const barHeight = amplitude * 20 + 2; // scale amplitude as needed

      return (
        <View
          key={index}
          style={[
            styles.bar,
            {
              height: Math.max(2, barHeight),
              backgroundColor: "#fff",
            },
          ]}
        />
      );
    });
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.timerText, timerStyle]}>
        {isRecording
          ? formatTime(recordingTimer * 1000)
          : formatTime(playbackPosition)}
      </Text>

      <View style={[styles.waveformContainer, waveStyle]}>
        <View style={styles.waveformContent}>
          {isRecording ? renderRecordingBars() : renderPlaybackBars()}
        </View>
      </View>

      <View style={[styles.recordingIndicator, recordingContainerStyle]}>
        <View style={[styles.recordingDot, recordingIndicatorStyle]} />
      </View>
    </View>
  );
};

export default AudioWaveform;

const styles = StyleSheet.create({
  container: {
    // Outer container which includes timer, wave bars, and recording dot

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 3,
    borderColor: "#fff",
    borderRadius: 40,
    paddingHorizontal: 15,
    width: "80%",
    overflow: "hidden",
    marginHorizontal: 30, // ensures bars won't overflow
  },
  waveformContainer: {
    flex: 1,
    height: 18,
    justifyContent: "center",
    overflow: "hidden",
    margin: 10,
  },
  waveformContent: {
    // The row container for all bars
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    // You can add some horizontal padding if you want
  },
  timerText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "InterBold",
    paddingRight: 20,
    minWidth: 45,
  },
  barTouchable: {
    // Touchable area for each bar (for seeking)
    height: "100%",
    justifyContent: "center",
  },
  bar: {
    width: 2,
    marginHorizontal: 1,
    borderRadius: 2, // rounding each bar
  },
  recordingIndicator: {
    paddingLeft: 20,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF325E",
  },
});
