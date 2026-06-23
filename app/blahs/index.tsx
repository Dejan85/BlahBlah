import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { AVPlaybackStatus, Audio } from 'expo-av';
import { Delete, Play, ProfileBackButton, Send } from '@/assets/images';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CustomTextInput from '@/components/CustomTextInput';
import AudioWaveform from '@/components/AudioWaveForm';
import { supabase } from '@/utils';
import { useAuth } from '@/context/AuthContext';

interface RecordingLine {
  sound: Audio.Sound;
  duration: string;
  file: string | null;
}

export default function Blahs() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordings, setRecordings] = useState<RecordingLine[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

  const [isHolding, setIsHolding] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [text, setText] = useState('');
  const holdTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isRecording] = useState(false);

  const { user } = useAuth();
  const sendBlah = async (content: string, type: 'text' | 'audio' = 'text') => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to send Blahs');
      return;
    }

    try {
      const { data: followers, error: followersError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('followed_id', user.id)
        .eq('receive_blahs', true);

      if (followersError) throw followersError;

      if (!followers || followers.length === 0) {
        Alert.alert(
          'No recipients',
          "You don't have any followers who can receive Blahs"
        );
        return;
      }

      const { data: blah, error: blahError } = await supabase
        .from('blahs')
        .insert({
          sender_id: user.id,
          content,
          type,
          recipient_count: followers.length,
        })
        .select()
        .single();

      if (blahError) throw blahError;

      const messages = await Promise.all(
        followers.map(async (follower) => {
          const { data: existingConv, error: convError } = await supabase
            .from('conversations')
            .select('id')
            .or(
              `and(participant1_id.eq.${user.id},participant2_id.eq.${follower.follower_id}),` +
                `and(participant1_id.eq.${follower.follower_id},participant2_id.eq.${user.id})`
            )
            .single();

          if (convError && convError.code !== 'PGRST116') {
            throw convError;
          }

          let conversationId;
          if (!existingConv) {
            const { data: newConv, error: createError } = await supabase
              .from('conversations')
              .insert({
                participant1_id: user.id,
                participant2_id: follower.follower_id,
              })
              .select()
              .single();

            if (createError) throw createError;
            conversationId = newConv.id;
          } else {
            conversationId = existingConv.id;
          }

          return {
            conversation_id: conversationId,
            sender_id: user.id,
            text: content,
            message_type: type,
            is_deleted: false,
            blah_id: blah.id,
          };
        })
      );

      const { error: messagesError } = await supabase
        .from('messages')
        .insert(messages);

      if (messagesError) throw messagesError;

      Alert.alert('Success', 'Your Blah has been sent to your followers!');
      router.back();
    } catch (error) {
      console.error('Error sending Blah:', error);
      Alert.alert('Error', 'Failed to send Blah. Please try again.');
    }
  };

  // Modify the text message send button
  const handleSendTextMessage = async () => {
    if (!finishedMessage.trim()) return;
    await sendBlah(finishedMessage, 'text');
  };

  // Modify the audio message send button
  const handleSendAudioMessage = async (recordingLine: RecordingLine) => {
    if (!recordingLine.file) return;
    await sendBlah(recordingLine.file, 'audio');
  };

  useEffect(() => {
    if (error && text.trim()) {
      setError('');
    }
  }, [text]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (recordings.length > 0) {
        recordings.forEach(async (recordingLine) => {
          try {
            if (isPlaying) {
              await recordingLine.sound.stopAsync();
            }
            await recordingLine.sound.unloadAsync();
          } catch (error) {
            console.error('Error cleaning up recording on unmount:', error);
          }
        });
      }
    };
  }, []);

  function handleTap() {
    // Only allow tap if we're not recording and don't have any recordings
    if (recording || recordings.length > 0) return;
    if (!isHolding) {
      setIsTyping(true);
    }
  }

  function handlePressIn() {
    // Only allow press if we're not recording, typing, or have existing recordings
    if (recording || isTyping || recordings.length > 0) return;
    setIsTyping(false);
    holdTimeoutRef.current = setTimeout(() => {
      setIsHolding(true);
      startRecording();
    }, 500);
  }

  function handlePressOut() {
    // Only handle press out if we're not in a restricted state
    if (recordings.length > 0 || isTyping) return;
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    if (isHolding) {
      stopRecording();
    } else {
      handleTap();
    }
  }

  const cleanupRecording = async () => {
    try {
      if (recordings.length > 0) {
        const recordingLine = recordings[0];
        if (isPlaying) {
          await recordingLine.sound.stopAsync();
          setIsPlaying(false);
        }
        await recordingLine.sound.unloadAsync(); // Unload the sound from memory
      }
      setRecordings([]);
      setPlaybackPosition(0);
      setPlaybackDuration(0);

      setIsHolding(false); // Reset holding state
    } catch (error) {
      console.error('Error cleaning up recording:', error);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (recording) {
      timer = setInterval(() => {
        setRecordingTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTimer(0);
      if (timer) clearInterval(timer);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [recording]);

  async function startRecording() {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        console.warn('Permission denied');
        return;
      }
      if (recording) {
        console.warn('Recording already in progress');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const { sound, status } = await recording.createNewLoadedSoundAsync();

      if (status.isLoaded) {
        const newRecording: RecordingLine = {
          sound,
          duration: getDurationFormatted(status.durationMillis || 0),
          file: recording.getURI(),
        };

        sound.setOnPlaybackStatusUpdate((status) =>
          handlePlaybackStatusUpdate(status, sound)
        );

        setRecordings([newRecording]);
      } else {
        console.error('Failed to load playback status');
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    } finally {
      setRecording(null);
      setIsHolding(false); // Reset holding state when recording stops
    }
  }

  const [finishedMessage, setFinishedMessage] = useState('');

  const handleDonePress = () => {
    if (!text.trim()) {
      setError('Message cannot be empty');
      return;
    }
    Keyboard.dismiss();
    setIsTyping(false);
    setFinishedMessage(text.trim());
    setError('');
  };

  const handleBlur = () => {
    if (!text.trim()) {
      setError('Message cannot be empty');
      // Keep typing mode active if message is empty
      setIsTyping(true);
      return;
    }
    setIsTyping(false);
    setFinishedMessage(text.trim());
    setError('');
  };

  // Clear message function
  const clearMessage = () => {
    setFinishedMessage('');
    setText('');
  };

  function getDurationFormatted(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / 1000 / 60);
    const seconds = Math.round((milliseconds / 1000) % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  async function handlePlaybackStatusUpdate(
    status: AVPlaybackStatus,
    sound: Audio.Sound
  ) {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis ?? 0);
      setPlaybackDuration(status.durationMillis ?? 0);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPlaybackPosition(0);
        await sound.setPositionAsync(0); // Reset for replay
      }
    } else if (status.error) {
      console.error(`Playback error: ${status.error}`);
    }
  }

  async function togglePlayback(recordingLine: RecordingLine) {
    if (isPlaying) {
      await recordingLine.sound.pauseAsync();
      setIsPlaying(false);
    } else {
      await recordingLine.sound.playAsync();
      setIsPlaying(true);
    }
  }

  function renderRecording() {
    if (recordings.length === 0) return null;
    const recordingLine = recordings[0];
    return (
      <>
        <View style={styles.recordingRow}>
          <AudioWaveform
            recording={recording}
            isRecording={isRecording}
            playbackPosition={playbackPosition}
            playbackDuration={playbackDuration}
            onSeek={handleSeek}
            recordingTimer={recordingTimer}
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.button}
            onPress={cleanupRecording} // Changed from the inline function to use cleanupRecording
          >
            <Delete />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => togglePlayback(recordingLine)}
          >
            {isPlaying ? (
              <Ionicons name="pause" size={24} color="#fff" />
            ) : (
              <Play />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => handleSendAudioMessage(recordingLine)}
          >
            <Send fill={'#FF325E'} />
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const handleSeek = async (position: number) => {
    if (recordings.length > 0) {
      const recordingLine = recordings[0];
      try {
        await recordingLine.sound.setPositionAsync(position);
        setPlaybackPosition(position);
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessible={false}
    >
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity
          onPress={() => {
            if (isPlaying || isTyping || recordings.length > 0) return;
            router.back();
          }}
          style={styles.backButton}
        >
          <ProfileBackButton fill={'#fff'} />
        </TouchableOpacity>
        <View
          style={[
            styles.container,
            // Add pointerEvents prop to prevent interactions when recording exists
            recordings.length > 0 ? { pointerEvents: 'box-none' } : {},
          ]}
        >
          {!finishedMessage &&
            !isTyping &&
            !recording &&
            !recordings.length && (
              <Text style={styles.initialText}>
                BlahBlah...{'\n'}Tap to type a{' '}
                <Text style={{ color: '#FF325E' }}>message</Text>
                {'\n'}or hold to record a{' '}
                <Text style={{ color: '#FF325E' }}>voice message</Text>
              </Text>
            )}
          {finishedMessage && !isTyping && (
            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>{finishedMessage}</Text>
              <View style={[styles.buttonRow, { marginTop: 30 }]}>
                <TouchableOpacity
                  style={[styles.button]}
                  onPress={clearMessage}
                >
                  <Delete />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleSendTextMessage}
                >
                  <Send fill={'#FF325E'} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          {isTyping && (
            <TouchableWithoutFeedback>
              <View>
                <CustomTextInput
                  textStyle={styles.textInput}
                  value={text}
                  onChangeText={setText}
                  selectionColor={'#fff'}
                  multiLine={false}
                  autoFocus={true}
                  onBlur={handleBlur}
                  returnKeyType="done"
                  onSubmitEditing={handleDonePress}
                  styleContainer={styles.inputContainer}
                  blurOnSubmit={true}
                />
              </View>
            </TouchableWithoutFeedback>
          )}
          {recording && (
            <>
              <AudioWaveform
                recording={recording}
                isRecording={true}
                recordingTimer={recordingTimer}
              />
            </>
          )}
          {renderRecording()}
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'green',
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  backButton: {
    padding: 30,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 60,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 60,
  },
  sliderContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 50,
  },
  recordingRow: {
    justifyContent: 'center',
    alignContent: 'center',
    alignSelf: 'center',
    alignItems: 'center',
    width: '100%',
    marginVertical: 30,
  },
  textInput: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'InterBold',
  },
  inputContainer: {
    alignContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',

    paddingHorizontal: 50,
  },
  timerText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'InterBold',
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    margin: 10,
  },
  messageContainer: {
    width: '80%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  messageText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'InterBold',
  },
});
