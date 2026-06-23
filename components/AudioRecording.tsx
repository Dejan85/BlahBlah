// AudioRecorder.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';

interface AudioRecorderProps {
  onRecordingComplete: (audioUrl: string) => void;
  onClose: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onClose,
}) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  useEffect(() => {
    // Ask for permission
    (async () => {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        alert('Permission to access microphone is required!');
        onClose();
      }
    })();
  }, []);

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    try {
      await recording?.stopAndUnloadAsync();
      const uri = recording?.getURI();
      console.log('Audio file stored at', uri);

      // Optional: upload to Supabase Storage
      // e.g.:
      // const audioUrl = await uploadToSupabase(uri);
      // onRecordingComplete(audioUrl);

      if (uri) {
        onRecordingComplete(uri); // or pass the Supabase URL
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const handleRecordPress = async () => {
    if (recording) {
      // Stop
      await stopRecording();
      setRecording(null);
      onClose();
    } else {
      // Start
      await startRecording();
    }
  };

  return (
    <View style={styles.recorderContainer}>
      <Text style={styles.recorderText}>
        {recording ? 'Recording...' : 'Press to Record'}
      </Text>
      <TouchableOpacity style={styles.recordButton} onPress={handleRecordPress}>
        <Text style={styles.recordButtonText}>
          {recording ? 'Stop' : 'Start'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Text style={styles.closeButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  recorderContainer: {
    backgroundColor: '#fff',
    padding: 16,
  },
  recorderText: {
    fontSize: 16,
    marginBottom: 12,
  },
  recordButton: {
    backgroundColor: 'red',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  closeButtonText: {
    color: '#555',
  },
});
