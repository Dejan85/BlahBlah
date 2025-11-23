import { ScrollView, StyleSheet, Text, View } from "react-native";
import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useRouter } from "expo-router";
import { supabase } from "@/utils";
import { useAuth } from "@/context/AuthContext";
import { NotificationsList } from "@/components/Push";
import { Notification, Profile } from "@/components/Push";

const Index = () => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      // First fetch notifications with sender profiles
      const { data, error } = await supabase
        .from("notifications")
        .select(
          `
          id,
          type,
          recipient_id,
          sender_id,
          created_at,
          is_read,
          payload,
          sender:profiles!notifications_sender_id_fkey (
            id,
            username,
            avatar_url,
            full_name
          )
        `,
        )
        .eq("recipient_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        // Transform the data with proper type checking
        const formattedNotifications: Notification[] = data
          .filter((notification) => notification.sender) // Filter out notifications with missing sender data
          .map((notification) => ({
            id: notification.id,
            type: notification.type as "FOLLOW_REQUEST" | "MESSAGE",
            sender: {
              username: notification.sender.username,
              avatar_url: notification.sender.avatar_url,
              full_name: notification.sender.full_name,
            },
            username: notification.sender.username, // Add these fields to match your Notification interface
            avatar_url: notification.sender.avatar_url,
            created_at: notification.created_at,
            is_read: notification.is_read,
            payload: {
              ...notification.payload,
              conversationId: notification.payload?.conversationId,
              sender: {
                username: notification.sender.username,
                avatar_url: notification.sender.avatar_url,
                full_name: notification.sender.full_name,
              },
            },
          }));

        setNotifications(formattedNotifications);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      // Handle navigation based on notification type
      if (
        notification.type === "MESSAGE" &&
        notification.payload?.conversationId
      ) {
        router.push({
          pathname: "/chats/chat-room/[id]",
          params: {
            id: notification.payload.conversationId,
            username: notification.username, // Use the flattened username
            image: notification.avatar_url, // Use the flattened avatar_url
          },
        });
      }

      // Mark as read if not already
      if (!notification.is_read) {
        const { error } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", notification.id);

        if (error) throw error;

        // Update local state
        setNotifications((prevNotifications) =>
          prevNotifications.map((n) =>
            n.id === notification.id ? { ...n, is_read: true } : n,
          ),
        );
      }
    } catch (error) {
      console.error("Error handling notification:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Header onBackPress={() => router.back()} title="Notifications" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <NotificationsList
          notifications={notifications}
          onNotificationPress={handleNotificationPress}
        />
      </ScrollView>
    </View>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  title: {
    fontFamily: "InterSemiBold",
    fontSize: 16,
    textAlign: "center",
    paddingTop: 20,
  },
});
