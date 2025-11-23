import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  View,
  Text,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomText from "@/components/CustomText";
import { LogoWhite } from "@/assets/images";
import AuthProviders from "@/components/AuthProviders";
import WelcomeBack from "@/components/WelcomeBack";
import { supabase } from "@/utils/supabase";

export default function Index() {
  const { user } = useAuth();
  const router = useRouter();
  const { verified } = useLocalSearchParams<{ verified: string }>();
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAppState = async () => {
      try {
        const hasLaunched = await AsyncStorage.getItem("hasLaunched");
        const lastLoggedInUser = await AsyncStorage.getItem("lastLoggedInUser");

        if (isMounted) {
          setIsFirstLaunch(!hasLaunched);

          if (!hasLaunched) {
            await AsyncStorage.setItem("hasLaunched", "true");
          }

          // Check if user needs to complete profile
          if (user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("birthday, username,onboarding_completed")
              .eq("id", user.id)
              .single();

            // First time user flow
            if (!profile?.birthday) {
              router.replace("/auth/sign-up/birthday");
              return;
            }

            if (!profile?.username) {
              router.replace("/auth/sign-up/username");
              return;
            }

            // Returning user flow
            if (lastLoggedInUser === user.id) {
              setShowWelcomeBack(true);
              // Short delay to show welcome back message
            }

            // Store current user id for next login
            await AsyncStorage.setItem("lastLoggedInUser", user.id);
            router.replace("/home");
            setShowWelcomeBack(true);
            return;
          }

          setIsLoading(false);
        }
      } catch (error) {
        console.error("App state check error:", error);
        setIsLoading(false);
      }
    };

    checkAppState();

    return () => {
      isMounted = false;
    };
  }, [user, verified]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#fff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <LogoWhite />
        <CustomText
          variant="h2"
          weight="bold"
          color="#fff"
          align="center"
          style={styles.headerText}
        >
          BlahBlah
        </CustomText>
      </View>
      {showWelcomeBack && <WelcomeBack />}
      <AuthProviders />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FF325E",
  },
  header: {
    alignContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    textAlign: "center",
    fontFamily: "InterBold",
    color: "#FFFFFF",
    fontSize: 28,
    top: -10,
  },
});
