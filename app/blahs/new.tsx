import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
  Animated,
  Alert,
} from "react-native";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import CustomTextInput from "@/components/CustomTextInput";
import AudioWaveform from "@/components/AudioWaveForm";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/context/AuthContext";

interface BlahBroadcastProps {
  onSend?: () => void;
}

export default function BlahBroadcast({ onSend }: BlahBroadcastProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const bunnyAnimation = useRef(new Animated.Value(0)).current;

  // Check if user has sent a Blah in the last 24 hours
  useEffect(() => {
    const checkLastBlah = async () => {
      if (!user?.id) return;

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from("blahs")
        .select("created_at")
        .eq("sender_id", user.id)
        .gte("created_at", twentyFourHoursAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error checking last blah:", error);
        return;
      }

      if (data && data.length > 0) {
        try {
          const lastBlahTime = new Date(data[0].created_at);
          const now = Date.now();
          const lastBlahTimeMs = lastBlahTime.getTime();

          if (!isNaN(lastBlahTimeMs)) {
            const timeUntilReset = 24 * 60 * 60 * 1000 - (now - lastBlahTimeMs);

            // Ensure timeUntilReset is within reasonable bounds
            if (timeUntilReset >= 0 && timeUntilReset <= 24 * 60 * 60 * 1000) {
              setTimeRemaining(timeUntilReset);

              // Set urgent flag if less than 3 hours remaining
              if (timeUntilReset <= 3 * 60 * 60 * 1000) {
                setIsUrgent(true);
                startBunnyAnimation();
              }
            }
          }
        } catch (error) {
          console.error("Error calculating time:", error);
          setTimeRemaining(null);
          setIsUrgent(false);
        }
      }
    };

    checkLastBlah();
    const interval = setInterval(checkLastBlah, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user?.id]);

  // Bunny animation
  const startBunnyAnimation = () => {
    Animated.sequence([
      Animated.timing(bunnyAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(bunnyAnimation, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (isUrgent) {
        startBunnyAnimation();
      }
    });
  };

  // Recording timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTimer(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  // Start recording function
  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert(
          "Permission required",
          "Please grant microphone permission to record audio.",
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("Error", "Failed to start recording");
    }
  };

  // Stop recording function
  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error("No recording URI");

      await sendBlah(uri, "audio");
    } catch (err) {
      console.error("Failed to stop recording", err);
      Alert.alert("Error", "Failed to stop recording");
    } finally {
      setRecording(null);
      setIsRecording(false);
    }
  };

  // Send Blah function
  const sendBlah = async (content: string, type: "text" | "audio" = "text") => {
    if (!user?.id) {
      Alert.alert("Error", "You must be logged in to send Blahs");
      return;
    }

    try {
      // Get all followers except those marked as "No Blahs"
      const { data: followers, error: followersError } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("followed_id", user.id)
        .eq("receive_blahs", true);

      if (followersError) throw followersError;

      if (!followers || followers.length === 0) {
        Alert.alert(
          "No recipients",
          "You don't have any followers who can receive Blahs",
        );
        return;
      }

      // Create the Blah record
      const { data: blah, error: blahError } = await supabase
        .from("blahs")
        .insert({
          sender_id: user.id,
          content,
          type,
          recipient_count: followers.length,
        })
        .select()
        .single();

      if (blahError) throw blahError;

      // Create individual messages for each follower
      const messages = await Promise.all(
        followers.map(async (follower) => {
          // First check if a conversation exists between these users
          const { data: existingConv, error: convError } = await supabase
            .from("conversations")
            .select("id")
            .or(
              `and(participant1_id.eq.${user.id},participant2_id.eq.${follower.follower_id}),` +
                `and(participant1_id.eq.${follower.follower_id},participant2_id.eq.${user.id})`,
            )
            .single();

          if (convError && convError.code !== "PGRST116") {
            throw convError;
          }

          let conversationId;
          if (!existingConv) {
            // Create new conversation
            const { data: newConv, error: createError } = await supabase
              .from("conversations")
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
        }),
      );

      const { error: messagesError } = await supabase
        .from("messages")
        .insert(messages);

      if (messagesError) throw messagesError;

      setText("");
      onSend?.();
      Alert.alert("Success", "Your Blah has been sent to your followers!");
    } catch (error) {
      console.error("Error sending Blah:", error);
      Alert.alert("Error", "Failed to send Blah. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {timeRemaining !== null && (
          <View style={styles.timerContainer}>
            <Text style={[styles.timerText, isUrgent && styles.urgentText]}>
              {`${Math.floor(timeRemaining / (1000 * 60 * 60))}h ${Math.floor((timeRemaining / (1000 * 60)) % 60)}m`}
            </Text>
            {isUrgent && (
              <Animated.View
                style={[
                  styles.bunny,
                  { transform: [{ scale: bunnyAnimation }] },
                ]}
              >
                <Text style={styles.bunnyEmoji}>🐰</Text>
              </Animated.View>
            )}
          </View>
        )}

        {isRecording ? (
          <View style={styles.recordingContainer}>
            <AudioWaveform
              recording={recording}
              isRecording={isRecording}
              recordingTimer={recordingTimer}
            />
            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <CustomTextInput
              value={text}
              onChangeText={setText}
              placeholder="Type your Blah..."
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.recordButton}
                onPress={startRecording}
              >
                <Text style={styles.buttonText}>Record</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendButton, !text && styles.sendButtonDisabled]}
                onPress={() => text && sendBlah(text)}
                disabled={!text}
              >
                <Text style={styles.buttonText}>Send Blah</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  timerText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  urgentText: {
    color: "#FF325E",
  },
  bunny: {
    marginLeft: 10,
  },
  bunnyEmoji: {
    fontSize: 24,
  },
  inputContainer: {
    flex: 1,
  },
  recordingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  recordButton: {
    backgroundColor: "#FF325E",
    padding: 15,
    borderRadius: 25,
    flex: 1,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#FF325E",
    padding: 15,
    borderRadius: 25,
    flex: 1,
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
  },
  stopButton: {
    backgroundColor: "#FF325E",
    padding: 15,
    borderRadius: 25,
    marginTop: 20,
    width: 200,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
  stopButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
