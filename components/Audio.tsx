import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Audio } from 'expo-av';
import Animated, { withSpring, useSharedValue } from 'react-native-reanimated';

interface AudioWaveformProps {
  recording: Audio.Recording | null;
  isRecording: boolean;
  playbackPosition?: number;
  playbackDuration?: number;
}

const BAR_WIDTH = 3;
const BAR_MARGIN = 2;
const MAX_HEIGHT = 50;
const MIN_HEIGHT = 5;
const BARS_COUNT = 40;

const AudioWaveform: React.FC<AudioWaveformProps> = ({
  recording,
  isRecording,
  playbackPosition = 0,
  playbackDuration = 0,
}) => {
  const [amplitudes, setAmplitudes] = useState<number[]>([]);
  const animatedBars = useSharedValue<number[]>(Array(BARS_COUNT).fill(0));
  const isAndroid = Platform.OS === 'android';

  useEffect(() => {
    if (recording) {
      setupRecordingCallback();
    }
    return () => {
      setAmplitudes([]);
      animatedBars.value = Array(BARS_COUNT).fill(0);
    };
  }, [recording]);

  const generateRandomAmplitude = () => {
    return Math.random() * 0.6 + 0.2; // Returns a value between 0.2 and 0.8
  };

  const setupRecordingCallback = async () => {
    if (!recording) return;

    if (isAndroid) {
      // For Android, use simulated amplitudes since metering might not work consistently
      const interval = setInterval(() => {
        setAmplitudes((prev) => {
          const newAmplitudes = [...prev, generateRandomAmplitude()];
          if (newAmplitudes.length > BARS_COUNT) {
            return newAmplitudes.slice(-BARS_COUNT);
          }
          return newAmplitudes;
        });
      }, 100);

      return () => clearInterval(interval);
    } else {
      // iOS implementation
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording) {
          const meterLevel = status.metering ?? -160;
          const amplitude = Math.max(0, (meterLevel + 160) / 160);

          setAmplitudes((prev) => {
            const newAmplitudes = [...prev, amplitude];
            if (newAmplitudes.length > BARS_COUNT) {
              return newAmplitudes.slice(-BARS_COUNT);
            }
            return newAmplitudes;
          });
        }
      });
    }
  };

  const getBarStyle = (index: number, amplitude: number) => {
    const progress =
      playbackDuration > 0 ? playbackPosition / playbackDuration : 0;
    const isActive = index / BARS_COUNT <= progress;

    let height = Math.max(MIN_HEIGHT, amplitude * MAX_HEIGHT);

    if (isRecording) {
      // Add some randomness to the height during recording
      height += Math.random() * 5;
    }

    return {
      height: withSpring(height, {
        mass: 1,
        damping: 15,
        stiffness: 100,
      }),
      backgroundColor: isActive ? '#FF325E' : '#fff',
    };
  };

  const renderBar = (amplitude: number, index: number) => {
    return (
      <Animated.View
        key={index}
        style={[styles.bar, getBarStyle(index, amplitude)]}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.barsContainer}>
        {amplitudes.map((amp, index) => renderBar(amp, index))}
        {Array(Math.max(0, BARS_COUNT - amplitudes.length))
          .fill(0)
          .map((_, index) => renderBar(0.1, amplitudes.length + index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '60%',
    height: MAX_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  bar: {
    width: BAR_WIDTH,
    marginHorizontal: BAR_MARGIN,
    borderRadius: BAR_WIDTH / 2,
    backgroundColor: '#fff',
  },
});

export default AudioWaveform;
