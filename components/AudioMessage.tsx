import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Pressable,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

interface AudioMessageProps {
  audioUrl: string;
  isSender: boolean;
}

const AudioMessage: React.FC<AudioMessageProps> = ({ audioUrl, isSender }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [position, setPosition] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const BAR_COUNT = 40; // Number of bars in the waveform

  useEffect(() => {
    loadAudio();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [audioUrl]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false },
        onPlaybackStatusUpdate,
        true
      );

      setSound(audioSound);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading audio:', error);
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis);
      setPosition(status.positionMillis);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const togglePlayback = async () => {
    try {
      if (!sound) return;

      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        if (position === duration) {
          await sound.setPositionAsync(0);
        }
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const handleSeek = async (barIndex: number) => {
    if (!sound || !duration) return;

    const newPosition = (barIndex / BAR_COUNT) * duration;
    try {
      await sound.setPositionAsync(newPosition);
      setPosition(newPosition);
      if (!isPlaying) {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const formatTime = (milliseconds: number | null) => {
    if (!milliseconds) return '0:00';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderWaveform = () => {
    return Array.from({ length: BAR_COUNT }).map((_, index) => {
      const progress = position / (duration || 1);
      const isPlayed = index / BAR_COUNT <= progress;

      // Create a more dynamic wave pattern
      const baseHeight =
        Math.sin(index * 0.3) * 0.5 + Math.cos(index * 0.5) * 0.3;
      const randomFactor = 0.2 * (Math.random() - 0.5); // Add slight randomness
      const heightFactor = baseHeight + randomFactor;

      // Maximum height is 24px, minimum is 4px
      const height = 4 + Math.abs(heightFactor) * 20;

      return (
        <Pressable
          key={index}
          onPress={() => handleSeek(index)}
          style={styles.barContainer}
        >
          <View
            style={[
              styles.bar,
              {
                height,
                backgroundColor: isPlayed
                  ? isSender
                    ? 'rgba(255, 255, 255, 0.9)'
                    : 'rgba(0, 0, 0, 0.7)'
                  : isSender
                    ? 'rgba(255, 255, 255, 0.4)'
                    : 'rgba(0, 0, 0, 0.2)',
              },
            ]}
          />
        </Pressable>
      );
    });
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.audioContainer,
          isSender ? styles.senderAudio : styles.receiverAudio,
        ]}
      >
        <Text
          style={[
            styles.loadingText,
            isSender ? styles.senderText : styles.receiverText,
          ]}
        >
          Loading audio...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.audioContainer,
        isSender ? styles.senderAudio : styles.receiverAudio,
      ]}
    >
      <TouchableOpacity
        onPress={togglePlayback}
        style={[
          styles.playButton,
          isSender ? styles.senderPlayButton : styles.receiverPlayButton,
        ]}
      >
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={22}
          color={isSender ? '#fff' : '#000'}
        />
      </TouchableOpacity>

      <View style={styles.waveformContainer}>
        <View style={styles.waveformContent}>{renderWaveform()}</View>
      </View>

      <View style={styles.timeContainer}>
        <Text
          style={[
            styles.timeText,
            isSender ? styles.senderText : styles.receiverText,
          ]}
        >
          {formatTime(duration)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    maxWidth: '100%',
    minWidth: 240,
    marginVertical: 4,
  },
  senderAudio: {
    backgroundColor: '#FF325E',
    marginLeft: 'auto',
  },
  receiverAudio: {
    backgroundColor: '#E5E5E5',
    marginRight: 'auto',
    marginLeft: 40,
  },
  timeContainer: {
    marginHorizontal: 10,
    flexDirection: 'row',
  },
  timeText: {
    fontSize: 12,
    textAlign: 'center',
  },
  playButton: {
    marginHorizontal: 4,
  },
  waveformContainer: {
    flex: 1,
    height: 36, // Increased height
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  waveformContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    marginHorizontal: 5,
  },
  barContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 0.5, // Reduced padding for tighter bars
  },
  bar: {
    width: 2.5, // Slightly thinner bars
    borderRadius: 4,
  },
  senderText: {
    color: '#FFFFFF',
  },
  receiverText: {
    color: '#202020',
  },
  loadingText: {
    padding: 8,
  },
  senderPlayButton: {
    backgroundColor: 'transparent',
  },
  receiverPlayButton: {
    backgroundColor: 'transparent',
  },
});

export default AudioMessage;
