import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { supabase } from "@/utils/supabase";
import type { User } from "@/types";

interface ChatListItemProps {
  item: User & {
    lastMessage?: string;
    timeAgo?: number;
    isMessageSeen?: boolean;
    unreadCount?: number;
    isPinned?: boolean;
    isMuted?: boolean;
  };
  currentUserId?: string;
  onPress: (user: User) => void;
  onPin?: (user: User) => void;
  onMute?: (user: User) => void;
  onDelete?: (user: User) => void;
  isPinned?: boolean;
  isMuted?: boolean;
  enableSwipe?: boolean;
}

interface TypingPayload {
  userId: string;
  isTyping: boolean;
}

const TYPING_TIMEOUT = 3000; // 3 seconds
const TYPING_ANIMATION_DELAY = 300; // 300ms for smooth transition

const ChatListItem: React.FC<ChatListItemProps> = React.memo(
  ({ item, currentUserId, onPress }) => {
    const [isTyping, setIsTyping] = useState(false);
    const [typingText, setTypingText] = useState("");

    // Memoize the typing animation function
    const animateTypingText = useCallback(() => {
      const dots = ["", ".", "..", "..."];
      let index = 0;

      const intervalId = setInterval(() => {
        setTypingText(`Typing${dots[index]}`);
        index = (index + 1) % dots.length;
      }, TYPING_ANIMATION_DELAY);

      return () => clearInterval(intervalId);
    }, []);

    // Memoize the format time function
    const formatTimeAgo = useCallback((timestamp: number): string => {
      const now = Date.now();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 60000);

      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      return `${hours}h ago`;
    }, []);

    useEffect(() => {
      if (!item.id || !currentUserId) return;

      let typingTimeoutId: NodeJS.Timeout;
      let animationCleanup: (() => void) | undefined;

      const channel = supabase
        .channel(`typing-${item.id}`)
        .on(
          "broadcast",
          { event: "typing" },
          ({ payload }: { payload: TypingPayload }) => {
            if (payload.userId !== currentUserId) {
              // Clear existing timeouts
              if (typingTimeoutId) clearTimeout(typingTimeoutId);
              if (animationCleanup) animationCleanup();

              setIsTyping(payload.isTyping);

              if (payload.isTyping) {
                // Start animation
                animationCleanup = animateTypingText();

                // Set timeout to clear typing status
                typingTimeoutId = setTimeout(() => {
                  setIsTyping(false);
                  if (animationCleanup) animationCleanup();
                }, TYPING_TIMEOUT);
              }
            }
          },
        )
        .subscribe();

      return () => {
        if (typingTimeoutId) clearTimeout(typingTimeoutId);
        if (animationCleanup) animationCleanup();
        supabase.removeChannel(channel);
      };
    }, [item.id, currentUserId, animateTypingText]);

    // Memoize the message preview component
    const messagePreview = useMemo(() => {
      if (isTyping) {
        return (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>{typingText}</Text>
          </View>
        );
      }

      return (
        <View style={styles.messagePreview}>
          <Text
            style={[
              styles.lastMessage,
              item.isMessageSeen ? styles.messageSeen : styles.messageUnseen,
            ]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
          {item.timeAgo && (
            <Text style={styles.timeAgo}>{formatTimeAgo(item.timeAgo)}</Text>
          )}
        </View>
      );
    }, [
      isTyping,
      typingText,
      item.lastMessage,
      item.isMessageSeen,
      item.timeAgo,
      formatTimeAgo,
    ]);

    // Memoize the press handler
    const handlePress = useCallback(() => {
      onPress(item);
    }, [onPress, item]);

    return (
      <TouchableOpacity onPress={handlePress} style={styles.container}>
        <ExpoImage
          source={{ uri: item.image }}
          style={styles.avatar}
          transition={300} // Add smooth image transition
        />
        <View style={styles.content}>
          <Text style={styles.username}>{item.username}</Text>
          {messagePreview}
        </View>
      </TouchableOpacity>
    );
  },
);

// Add display name for debugging purposes
ChatListItem.displayName = "ChatListItem";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  username: {
    fontSize: 16,
    fontFamily: "InterSemiBold",
    marginBottom: 4,
    color: "#000",
  },
  messagePreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    fontFamily: "InterRegular",
  },
  messageSeen: {
    color: "#B3B3B3",
  },
  messageUnseen: {
    color: "#B3B3B3",
  },
  timeAgo: {
    fontSize: 12,
    color: "#B3B3B3",
    marginLeft: 8,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  typingText: {
    fontSize: 14,
    color: "#FF325E",
    fontFamily: "InterRegular",
    marginRight: 4,
  },
});

export default ChatListItem;
