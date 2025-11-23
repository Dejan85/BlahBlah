// components/NotificationSetup.tsx
import React, { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform, Alert } from "react-native";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert(
        "Permission Required",
        "Push notifications are required to receive important updates.",
        [{ text: "OK" }],
      );
      return;
    }

    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        throw new Error("Project ID not found");
      }

      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;

      console.log("Push token:", token);
    } catch (e) {
      console.error("Error getting push token:", e);
    }
  } else {
    Alert.alert(
      "Physical Device Required",
      "Push notifications require a physical device.",
      [{ text: "OK" }],
    );
  }

  return token;
}

export function NotificationSetup() {
  const { user } = useAuth();
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    async function setupNotifications() {
      if (user?.id) {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ expo_push_token: token })
            .eq("id", user.id);

          if (updateError) {
            console.error("Error storing push token:", updateError);
          }
        }
      }
    }

    setupNotifications();

    // Set up notification listeners
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Received notification:", notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification response:", response);
        const data = response.notification.request.content.data;

        if (data?.type === "MESSAGE") {
          router.push({
            pathname: "/chats/chat-room/[id]",
            params: { id: data.conversationId },
          });
        }
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current,
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user]);

  return null;
}
