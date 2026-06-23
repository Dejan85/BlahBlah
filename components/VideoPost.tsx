import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

interface VideoPostProps {
  uri: string;
  isVisible: boolean;
}

export const VideoPost = React.memo(function VideoPost({
  uri,
  isVisible,
}: VideoPostProps) {
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<Video>(null);

  const togglePlayPause = () => setIsPaused(!isPaused);

  const shouldVideoPlay = useMemo(() => {
    return isVisible && !isPaused;
  }, [isVisible, isPaused]);

  return (
    <TouchableWithoutFeedback onPress={togglePlayPause}>
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          isMuted={true}
          source={{ uri }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay={shouldVideoPlay}
          isLooping
        />
        {isPaused && (
          <View style={styles.playIcon}>
            <Ionicons name="play" size={50} color="white" />
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
});

const styles = StyleSheet.create({
  videoContainer: {
    height:
      Platform.OS === 'android'
        ? Dimensions.get('window').height + (StatusBar.currentHeight || 0)
        : Dimensions.get('window').height,
  },
  video: {
    flex: 1,
  },
  playIcon: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
