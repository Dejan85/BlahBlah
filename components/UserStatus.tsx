// components/UserStatus.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { supabase } from "@/utils/supabase";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface UserStatusProps {
  userId?: string;
}
interface OnlineUser {
  id: string;
  status: string;
  last_seen: string;
}

export const UserStatus = ({ userId }: UserStatusProps) => {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`online_users:${userId}`);

    channel
      .on<OnlineUser>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "online_users",
          filter: `id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<OnlineUser>) => {
          const newData = payload.new as OnlineUser;
          if (newData) {
            setIsOnline(newData.status === "online");
            setLastSeen(newData.last_seen);
          }
        },
      )
      .subscribe();

    const getInitialStatus = async () => {
      const { data } = await supabase
        .from("online_users")
        .select("status, last_seen")
        .eq("id", userId)
        .single();

      if (data) {
        setIsOnline(data.status === "online");
        setLastSeen(data.last_seen);
      }
    };

    getInitialStatus();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  return (
    <View style={styles.container}>
      <View
        style={[styles.statusDot, isOnline ? styles.online : styles.offline]}
      />
      <Text style={styles.statusText}>
        {isOnline
          ? "Online"
          : lastSeen
            ? `Last seen ${formatLastSeen(lastSeen)}`
            : "Offline"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  online: {
    backgroundColor: "#4CAF50",
  },
  offline: {
    backgroundColor: "#9E9E9E",
  },
  statusText: {
    fontSize: 12,
    color: "#666",
  },
});
