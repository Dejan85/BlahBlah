import React, { useCallback, useEffect, useState } from "react";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import { AuthProvider } from "@/context/AuthContext";
import { View, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "react-native";
import { FriendRequestProvider } from "@/context/FriendRequestContext";
// Initialize Firebase (needed for push notifications on Android)
import "@/utils/firebase";

import { MessageProvider } from "@/context/MessageContext";
import { CameraProvider } from "@/context/CameraContext";
import { PostProvider } from "@/context/PostContext";
import { NotificationSetup } from "@/components/NT";

// Configure notification handler

SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        await Promise.all([
          AsyncStorage.multiRemove([
            "signUpStep",
            "signUpEmail",
            "signUpPassword",
          ]),
          Font.loadAsync({
            InterBold: require("@/assets/fonts/Inter-Bold.ttf"),
            InterMedium: require("@/assets/fonts/Inter-Medium.ttf"),
            InterSemiBold: require("@/assets/fonts/Inter-SemiBold.ttf"),
            InterRegular: require("@/assets/fonts/Inter-Regular.ttf"),
          }),
        ]);

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (e) {
        console.warn(e);
        setError(
          e instanceof Error
            ? e
            : new Error("An error occurred while loading the app"),
        );
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "red" }}>Error loading app</Text>
        <Text style={{ color: "red" }}>{error.message}</Text>
      </View>
    );
  }

  if (!appIsReady) {
    return null;
  }

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      <GestureHandlerRootView style={styles.container}>
        <AuthProvider>
          <FriendRequestProvider>
            <MessageProvider>
              <CameraProvider>
                <PostProvider>
                  <NotificationSetup />
                  <Slot />
                </PostProvider>
              </CameraProvider>
            </MessageProvider>
          </FriendRequestProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
