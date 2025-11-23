// components/TypingIndicator.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { supabase } from "@/utils/supabase";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface TypingIndicatorProps {
  userId: string;
  currentUserId: string;
}

interface OnlineUserTyping {
  id: string;
  typing_in: string | null;
  last_typed: string | null;
}

export const TypingIndicator = ({
  userId,
  currentUserId,
}: TypingIndicatorProps) => {
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const channel = supabase.channel(`typing:${userId}`);

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "online_users",
          filter: `id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<OnlineUserTyping>) => {
          const newData = payload.new as OnlineUserTyping;
          if (newData) {
            setIsTyping(newData.typing_in === currentUserId);
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId, currentUserId]);

  if (!isTyping) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>typing...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  text: {
    color: "#666",
    fontSize: 12,
    fontStyle: "italic",
  },
});
