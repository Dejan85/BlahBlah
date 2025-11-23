import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  StyleSheet,
  Animated,
  StatusBar,
  Platform,
  Text,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
  Alert,
  GestureResponderEvent,
  TouchableWithoutFeedback,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  AddImage,
  Delete,
  Gallery,
  ProfileBackButton,
  ProfileOptions,
  RecordAudio,
  SendChat,
  TakePhoto,
} from "@/assets/images";
import { useAuth } from "@/context/AuthContext";
import CustomTextInput from "@/components/CustomTextInput";
import { MessageType } from "@/types/chat";
import { useTypingStatus } from "@/hooks/useTypingStatus";
import { useMessage } from "@/context/MessageContext";
import { Message } from "@/types/chat";
import { supabase } from "@/utils/supabase";

import { Audio } from "expo-av";
import AudioMessage from "@/components/AudioMessage";
import AudioWaveform from "@/components/AudioWaveForm";

import ProfileOptionsModal from "@/components/ChatAdditionalMedia";
import MediaSelector from "@/components/MediaSelector";
import ImageMessage from "@/components/ImageMessage";
import DocumentMessage from "@/components/DocumentMessage";
import { TypingIndicator } from "@/components/Chat/TypingIndicator";
import { usePresence } from "@/hooks/usePresence";
import { UserPresence } from "@/components/Chat/UserPresence";
import { MessagetMenu, QuotedMessage } from "@/components/Chat/MessageMenu";
import ReactionMenu, { MessageReactions } from "@/components/Chat/MR";
import MessageContextMenu from "@/components/Chat/MC";

const ChatRoom = () => {
  const {
    id: conversationId,
    username,
    image,
  } = useLocalSearchParams<{
    id: string;
    username: string;
    image: string;
    bio: string;
  }>();

  const { user } = useAuth();
  const currentUserId = user?.id;
  const router = useRouter();

  // Get messaging context
  const {
    messages,
    sendMessage,
    markConversationAsRead,
    loading,
    error,
    initialized,
    setCurrentConversationId,
    setMessages,
    handleReaction,
  } = useMessage();

  // Local state
  const [inputText, setInputText] = useState("");
  const [containerHeight, setContainerHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollToNewMessage = useRef<boolean>(true);
  const initialLoadComplete = useRef<boolean>(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [isMediaSelectorVisible, setIsMediaSelectorVisible] = useState(false);

  const { getUserPresence } = usePresence(currentUserId ?? "");
  const [otherUserId, setOtherUserId] = useState<string | null>(null);

  // Get presence for the other user
  const [contextMenu, setContextMenu] = useState({
    isVisible: false,
    position: { x: 0, y: 0 },
    selectedMessage: null as Message | null,
  });

  const [reactionMenu, setReactionMenu] = useState({
    isVisible: false,
    position: { x: 0, y: 0 },
    selectedMessageId: null as string | null,
  });

  const [replyingTo, setReplyingTo] = useState<{
    message: Message;
    username: string;
  } | null>(null);

  const handleDelete = async () => {
    if (!contextMenu.selectedMessage || !currentUserId) return;

    try {
      // Instead of deleting, update the message to mark it as deleted
      const { error } = await supabase
        .from("messages")
        .update({
          is_deleted: true,
          text: "Deleted message...",
        })
        .match({
          id: contextMenu.selectedMessage.id,
          sender_id: currentUserId,
        });

      if (error) throw error;

      // Update the message locally
      const updatedMessages = messages.map((msg) =>
        msg.id === contextMenu.selectedMessage?.id
          ? { ...msg, text: "Deleted message...", is_deleted: true }
          : msg,
      );
      setMessages(updatedMessages);
    } catch (error) {
      console.error("Error deleting message:", error);
      Alert.alert("Error", "Failed to delete message");
    }

    setContextMenu({ ...contextMenu, isVisible: false });
    setReactionMenu({ ...reactionMenu, isVisible: false });
  };

  // Add this function to handle long press on messages
  const handleMessageLongPress = (
    message: Message,
    event: GestureResponderEvent,
  ) => {
    const { pageX, pageY } = event.nativeEvent;
    const isSender = message.senderId === currentUserId;

    // For sender messages (right side)
    if (isSender) {
      setContextMenu({
        isVisible: true,
        position: { x: pageX, y: pageY },
        selectedMessage: message,
      });

      setReactionMenu({
        isVisible: true,
        position: { x: pageX, y: pageY },
        selectedMessageId: message.id,
      });
    }
    // For receiver messages (left side)
    else {
      setContextMenu({
        isVisible: true,
        position: { x: pageX - 120, y: pageY }, // Offset for left alignment
        selectedMessage: message,
      });

      setReactionMenu({
        isVisible: true,
        position: { x: pageX - 150, y: pageY }, // Wider offset for reactions
        selectedMessageId: message.id,
      });
    }
  };

  // Add functions to handle context menu actions
  const handleReply = () => {
    if (contextMenu.selectedMessage) {
      setReplyingTo({
        message: contextMenu.selectedMessage,
        username: username, // assuming this is the other user's username
      });
    }
    setContextMenu({ ...contextMenu, isVisible: false });
    setReactionMenu({ ...reactionMenu, isVisible: false });
  };

  useEffect(() => {
    const fetchConversationDetails = async () => {
      if (!conversationId || !currentUserId) return;

      const { data: conversation, error } = await supabase
        .from("conversations")
        .select("participant1_id, participant2_id")
        .eq("id", conversationId)
        .single();

      if (error) {
        console.error("Error fetching conversation:", error);
        return;
      }

      if (conversation) {
        // Determine which participant is the other user
        const otherId =
          conversation.participant1_id === currentUserId
            ? conversation.participant2_id
            : conversation.participant1_id;
        setOtherUserId(otherId);
      }
    };

    fetchConversationDetails();
  }, [conversationId, currentUserId]);

  // Get presence for the other user using their actual ID
  const userPresence = useMemo(() => {
    if (!otherUserId) return null;
    const presence = getUserPresence(otherUserId);

    return presence;
  }, [otherUserId, getUserPresence]);

  // Add timer control functions
  const startTimer = () => {
    if (timerInterval.current) return;

    timerInterval.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  };

  const resetTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    setRecordingDuration(0);
  };

  // Add pause/resume recording function

  const { isOtherUserTyping, handleTyping } = useTypingStatus(
    currentUserId ?? "",
    conversationId ?? "",
  );
  const listRef = useRef<FlashList<any>>(null);

  // Initialize conversation when component mounts
  useEffect(() => {
    let subscription: any;

    const initConversation = async () => {
      await setCurrentConversationId(conversationId);
      subscription = supabase.channel(`messages-${conversationId}`);
    };

    initConversation();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [conversationId]);

  useEffect(() => {
    if (messages.length > 0) {
      // For initial load, wait a bit longer to ensure proper layout
      if (!initialLoadComplete.current) {
        initialLoadComplete.current = true;
        setTimeout(() => {
          scrollToBottom(false);
        }, 300); // Longer timeout for initial load
      }
      // For new messages, scroll if auto-scroll is enabled
      else if (scrollToNewMessage.current) {
        setTimeout(() => {
          scrollToBottom(true);
        }, 100);
      }
    }
  }, [messages]);

  const handleInputChange = useCallback(
    (text: string) => {
      setInputText(text);
      // Only trigger typing indicator if there's actual input
      if (text.trim().length > 0) {
        handleTyping();
      }
    },
    [handleTyping],
  );

  const typingIndicator = useMemo(
    () => (
      <TypingIndicator
        username={username}
        isVisible={isOtherUserTyping}
        avatar={image} // Pass the user's avatar
      />
    ),
    [username, isOtherUserTyping, image],
  );

  // In your ChatRoom component
  const onReaction = async (reaction: { emoji: string; name: string }) => {
    if (!reactionMenu.selectedMessageId || !currentUserId) return;

    try {
      // Since useMessage throws an error if used outside provider,
      // we can be confident handleReaction exists here
      await handleReaction(
        reactionMenu.selectedMessageId,
        reaction,
        currentUserId,
      );
    } catch (error) {
      console.error("Error handling reaction:", error);
    } finally {
      setReactionMenu({ ...reactionMenu, isVisible: false });
      setContextMenu({ ...contextMenu, isVisible: false });
    }
  };

  // Mark messages as read when they change
  // Example debug
  useEffect(() => {
    if (conversationId && currentUserId && messages.length > 0) {
      markConversationAsRead(conversationId, currentUserId);
    }
  }, [messages, conversationId, currentUserId]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !conversationId || !currentUserId) return;

    await sendMessage(inputText.trim(), conversationId, currentUserId);
    setInputText("");
    scrollToNewMessage.current = true;
  };

  const scrollToBottom = (animated = false) => {
    if (!listRef.current || !contentHeight || !containerHeight) return;

    try {
      const offset = Math.max(0, contentHeight - containerHeight + 80); // Add extra padding
      listRef.current.scrollToOffset({
        offset,
        animated,
      });
    } catch (error) {
      console.error("Error scrolling to bottom:", error);
    }
  };

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== "granted") {
        console.warn("Permission denied");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recordingOptions: Audio.RecordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          extension: ".m4a",
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
        },
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          extension: ".m4a",
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MAX,
        },
      };

      const { recording: newRecording } =
        await Audio.Recording.createAsync(recordingOptions);

      setRecording(newRecording);
      setIsRecording(true);
      startTimer(); // Start the timer
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    if (!recording || !conversationId || !currentUserId) return;

    try {
      resetTimer();
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        console.error("Failed to get recording URI");
        return;
      }

      // Check if file exists

      await sendMessage(uri, conversationId, currentUserId, "audio");
    } catch (err) {
      console.error("Failed to stop recording", err);
    } finally {
      setRecording(null);
      setIsRecording(false);
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;

    try {
      resetTimer(); // Reset timer
      await recording.stopAndUnloadAsync();
    } catch (err) {
      console.error("Failed to cancel recording", err);
    } finally {
      setRecording(null);
      setIsRecording(false);
    }
  };

  // Add cleanup on component unmount
  useEffect(() => {
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

  const handleMediaSelect = async (uri: string, type: MessageType) => {
    if (!conversationId || !currentUserId) return;

    try {
      await sendMessage(uri, conversationId, currentUserId, type);
    } catch (error) {
      console.error("Error handling media:", error);
      Alert.alert("Error", "Failed to send media. Please try again.");
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const maxOffset = contentHeight - containerHeight;
    const isNearBottom = maxOffset - offsetY < 100;

    setShowScrollButton(!isNearBottom);

    if (!isNearBottom) {
      scrollToNewMessage.current = false;
    }

    if (isNearBottom) {
      scrollToNewMessage.current = true;
    }
  };

  const formatMessageTime = (created_at: string) => {
    const date = new Date(created_at);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Add this to your handleReaction function

  // Add this to your onPress handler

  // Loading state
  if (!initialized || loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isSender = item.senderId === currentUserId;
    const isFirstInSequence =
      index === 0 || messages[index - 1]?.senderId !== item.senderId;
    console.log("Rendering message:", item.id, "Reactions:", item.reactions);

    const isLastInSequence =
      index === messages.length - 1 ||
      messages[index + 1]?.senderId !== item.senderId;
    const senderAvatar = image ?? "https://via.placeholder.com/100";

    const renderMessageContent = () => {
      switch (item.messageType) {
        case "image":
          return (
            <ImageMessage
              uri={item.text}
              isSender={isSender}
              style={!isSender && !isFirstInSequence && { marginLeft: 40 }}
            />
          );
        case "file":
          return (
            <DocumentMessage
              uri={item.text}
              isSender={isSender}
              style={!isSender && !isFirstInSequence && { marginLeft: 40 }}
            />
          );
        case "audio":
          return <AudioMessage audioUrl={item.text} isSender={isSender} />;
        default:
          return (
            <View
              style={[
                styles.messageBubble,
                isSender ? styles.senderBubble : styles.recipientBubble,
                !isSender && !isFirstInSequence && { marginLeft: 40 },
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  isSender ? styles.senderText : styles.recipientText,
                ]}
              >
                {item.text}
              </Text>
            </View>
          );
      }
    };

    return (
      <TouchableOpacity
        onLongPress={(event) => handleMessageLongPress(item, event)}
        delayLongPress={200}
      >
        <View
          style={[
            styles.messageRow,
            isSender ? styles.myMessage : styles.otherMessage,
          ]}
        >
          {/* Avatar - show only for first message in sequence from other user */}
          {!isSender && isFirstInSequence && (
            <Image source={{ uri: senderAvatar }} style={styles.chatAvatar} />
          )}

          <View>
            {renderMessageContent()}
            <MessageReactions
              reactions={item.reactions || []}
              messageId={item.id}
              currentUserId={currentUserId ?? ""}
              isSender={isSender}
            />
            {/* Timestamp - show on last message in sequence */}
            {isLastInSequence && (
              <Text
                style={[
                  styles.timestamp,
                  isSender ? styles.senderTimestamp : styles.recipientTimestamp,
                  !isSender && !isFirstInSequence && { paddingLeft: 45 },
                ]}
              >
                {formatMessageTime(item.created_at)}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleBackgroundPress = () => {
    setContextMenu({ ...contextMenu, isVisible: false });
    setReactionMenu({ ...reactionMenu, isVisible: false });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ProfileBackButton fill={"#000"} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Image source={{ uri: image }} style={styles.avatar} />
            <View style={styles.userInfo}>
              <Text style={styles.username}>{username}</Text>
              {userPresence && (
                <UserPresence
                  isOnline={userPresence.isOnline}
                  lastSeen={userPresence.lastSeen}
                />
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.galleryButton}
            onPress={() => setIsProfileModalVisible(true)}
          >
            <ProfileOptions />
          </TouchableOpacity>
        </View>

        <TouchableWithoutFeedback onPress={handleBackgroundPress}>
          <View
            style={styles.listContainer}
            onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
          >
            <FlashList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 10,
              }}
              ListFooterComponent={typingIndicator}
              estimatedItemSize={50}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              inverted={false}
              onContentSizeChange={(width, height) => {
                setContentHeight(height);
                if (
                  !initialLoadComplete.current ||
                  scrollToNewMessage.current
                ) {
                  setTimeout(() => scrollToBottom(false), 100);
                }
              }}
              onLayout={(e) => {
                const height = e.nativeEvent.layout.height;
                setContainerHeight(height);
                if (
                  !initialLoadComplete.current ||
                  scrollToNewMessage.current
                ) {
                  setTimeout(() => scrollToBottom(false), 100);
                }
              }}
            />
          </View>
        </TouchableWithoutFeedback>

        {showScrollButton && (
          <Pressable
            style={styles.scrollButton}
            onPress={() => scrollToBottom(true)}
          >
            <View style={styles.scrollButtonInner}>
              <Ionicons name="chevron-down" size={24} color="#fff" />
            </View>
          </Pressable>
        )}

        {replyingTo && (
          <QuotedMessage
            message={replyingTo.message.text}
            username={replyingTo.username}
            onCancelReply={() => setReplyingTo(null)}
          />
        )}

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            {!isRecording && (
              <>
                {inputText.trim().length < 1 && (
                  <TouchableOpacity
                    style={styles.leftButton}
                    onPress={() => {
                      // <== Navigate to your camera route
                      router.push({
                        pathname: "/camera", // Or the exact route name to your Camera
                        params: {
                          from: "chat",
                          conversationId: conversationId,
                          // ...any other data you might want, like conversationId, etc.
                        },
                      });
                    }}
                  >
                    <TakePhoto />
                  </TouchableOpacity>
                )}

                <CustomTextInput
                  style={[
                    styles.input,
                    inputText.trim().length < 1 && styles.inputWithButtons,
                  ]}
                  placeholder="Type..."
                  value={inputText}
                  onChangeText={handleInputChange}
                  multiLine
                  placeholderTextColor="#666"
                />

                {inputText.trim().length > 0 ? (
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={handleSendMessage}
                  >
                    <SendChat width={37} height={24} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.rightButtons}>
                    {inputText.trim().length < 1 && (
                      <TouchableOpacity
                        style={styles.rightButtonLeft}
                        onPress={startRecording}
                      >
                        <RecordAudio />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.rightButton}
                      onPress={() => setIsMediaSelectorVisible(true)}
                    >
                      <AddImage />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {isRecording && (
              <View style={styles.recordingContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={cancelRecording}
                >
                  <Ionicons name="trash" color={"#fff"} size={16} />
                </TouchableOpacity>

                <AudioWaveform
                  recording={recording}
                  isRecording={isRecording}
                  recordingTimer={recordingDuration}
                  style={styles.wave}
                  waveStyle={styles.waveContainer}
                  recordingIndicatorStyle={styles.rec}
                  timerStyle={styles.timer}
                  recordingContainerStyle={styles.recContainer}
                />

                <TouchableOpacity
                  style={styles.sendButtonAudio}
                  onPress={stopRecording}
                >
                  <SendChat width={37} height={24} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* <MessagetMenu
          isVisible={contextMenu.isVisible}
          position={contextMenu.position}
          onReply={handleReply}
          onDelete={handleDelete}
          isSender={contextMenu.selectedMessage?.senderId === currentUserId}
        /> */}

        <MessageContextMenu
          isVisible={contextMenu.isVisible}
          position={contextMenu.position}
          onReply={handleReply}
          onDelete={handleDelete}
          isSender={contextMenu.selectedMessage?.senderId === currentUserId}
        />

        <ReactionMenu
          isVisible={reactionMenu.isVisible}
          position={reactionMenu.position}
          onReaction={onReaction}
          messageReactions={
            messages.find((m) => m.id === reactionMenu.selectedMessageId)
              ?.reactions
          }
          currentUserId={currentUserId ?? ""}
          onClose={() => setReactionMenu({ ...reactionMenu, isVisible: false })}
        />
      </View>
      <ProfileOptionsModal
        visible={isProfileModalVisible}
        onClose={() => setIsProfileModalVisible(false)}
        username={username}
        avatar={image}
        chatImages={messages
          .filter((msg) => msg.messageType === "image")
          .map((msg) => msg.text)}
      />

      <MediaSelector
        visible={isMediaSelectorVisible}
        onClose={() => setIsMediaSelectorVisible(false)}
        onMediaSelect={handleMediaSelect}
      />
    </SafeAreaView>
  );
};

export default ChatRoom;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  userReactionBadge: {
    backgroundColor: "#FFE4E9", // or any color to indicate user's reaction
  },
  typingIndicatorContainer: {
    padding: 8,
    marginLeft: 16,
    marginBottom: 8,
  },
  myMessage: {
    justifyContent: "flex-end",
  },
  waveContainer: {
    height: 14,
    margin: 5,
  },
  chatAvatar: {
    height: 30,
    width: 30,
    borderRadius: 15,

    marginRight: -30,
  },
  recordingContainer: {
    flexDirection: "row",
    alignContent: "center",
    alignItems: "center",
    marginHorizontal: 0,
  },
  cancelButton: {
    padding: 8,
    backgroundColor: "#FF325E",
    borderRadius: 50,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignContent: "center",
    alignItems: "center",
  },
  presenceDotContainer: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 2,
  },
  presenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineDot: {
    backgroundColor: "#4CAF50",
  },
  offlineDot: {
    backgroundColor: "#6C757D",
  },
  otherMessage: {
    justifyContent: "flex-start",
  },
  senderTimestamp: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  pauseButton: {
    padding: 8,
  },
  wave: {
    backgroundColor: "#FF325E",
    borderWidth: 0,
    flex: 1,
    left: -20,
  },
  onlineStatus: {
    color: "#4CAF50",
    fontSize: 12,
    fontFamily: "InterMedium",
  },
  offlineStatus: {
    color: "#6C757D",
    fontSize: 12,
    fontFamily: "InterMedium",
  },
  recipientTimestamp: {
    color: "#6C757D",
    paddingLeft: 45,
    paddingTop: 3,
  },

  bubble: {
    maxWidth: "70%",
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: "#ececec",
  },

  typingBubble: {
    backgroundColor: "#f0f0f0",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  typingText: {
    fontSize: 12,
    color: "#666",
    marginRight: 8,
  },
  dotContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#666",
    marginHorizontal: 2,
  },
  dot1: {
    opacity: 0.45,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 0.8,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  typingStatus: {
    color: "#666",
    fontSize: 12,
    fontFamily: "InterRegular",
  },
  listContainer: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // Push back button and gallery button to opposite ends
    height: 81,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    marginRight: 32,
  },
  backButton: {
    marginRight: 7, // Space between back button and avatar
    marginLeft: 28,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "red",
    textAlign: "center",
  },
  headerCenter: {
    flex: 1, // Allow the center content to take the remaining space
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 54,
    marginRight: 10, // Space between avatar and text
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
  },
  username: {
    fontSize: 16,
    fontFamily: "InterBold",
    color: "#202020",
    marginBottom: 2,
  },
  bio: {
    fontSize: 12,
    fontFamily: "InterRegular",
    color: "#6C757D",
  },
  galleryButton: {},
  // -------------
  // LIST & MESSAGE STYLES
  // -------------

  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: "#fff",
    paddingBottom: 20, // Add extra padding at bottom
  },
  messageRow: {
    flexDirection: "row",

    alignItems: "center",
  },
  senderContainer: {
    alignItems: "flex-end",
  },
  recipientContainer: {
    alignItems: "flex-start",
  },
  messageBubble: {
    borderRadius: 20,
    marginTop: 9,
  },
  senderBubble: {
    backgroundColor: "#FF325E",
    borderRadius: 20,
    marginLeft: "auto",
  },
  recipientBubble: {
    backgroundColor: "#E5E5E5",
    borderRadius: 20,
    marginLeft: 40,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    padding: 8,
    fontFamily: "InterRegular",
  },
  senderText: {
    color: "#FFFFFF",
  },
  recipientText: {
    color: "#202020",
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 2,
  },
  timestamp: {
    fontSize: 11,
    color: "#6C757D",
    fontFamily: "InterRegular",
    marginRight: 4,
  },

  seenLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    fontFamily: "InterRegular",
  },
  seenLabelActive: {
    color: "#40E0D0",
  },
  // -------------
  // SCROLL BUTTON
  // -------------
  scrollButton: {
    position: "absolute",
    left: "50%",
    bottom: 100,
    zIndex: 2,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    transform: [{ translateX: -20 }], // negative half of the button’s width
  },
  scrollButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  // -------------
  // INPUT BAR
  // -------------
  inputContainer: {
    paddingVertical: 24,
    paddingHorizontal: 17,
    backgroundColor: "#fff",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E5E5",
    borderRadius: 20,
    paddingHorizontal: 16,
    position: "relative",
    minHeight: 44,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "InterRegular",
    color: "#919191",
    minHeight: 44,
  },
  sendButtonAudio: {
    position: "absolute",
    right: -10,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  sendButton: {
    position: "absolute",
    right: 12,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  inputWithButtons: {
    paddingLeft: 30, // Space for left button
    paddingRight: 80, // Space for right buttons
  },
  leftButton: {
    position: "absolute",
    left: 12,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  rightButtons: {
    position: "absolute",
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rightButtonLeft: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  rightButton: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  rec: {
    paddingLeft: 0,
    backgroundColor: "#fff",
  },
  timer: {
    paddingRight: 0,
  },
  recContainer: {
    paddingLeft: 10,
  },
  reactionTouchable: {
    flexDirection: "row",
    alignItems: "center",
  },
  messageContainer: {
    flex: 1,
  },
});
