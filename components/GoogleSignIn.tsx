import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { useState } from "react";
import { supabase } from "@/utils/supabase";
import { Alert, View, Platform, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
GoogleSignin.configure({
  webClientId:
    "307003980819-g7e1fmdhbiu7lurl6j044oi83gi1hvtg.apps.googleusercontent.com",
  scopes: ["email", "profile"],
  iosClientId: "",
});

const GoogleLogin = () => {
  const [loading, setLoading] = useState(false);

  const onGoogleLogin = async () => {
    setLoading(true);

    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      if (userInfo?.data?.idToken) {
        const { error, data } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: userInfo?.data?.idToken,
        });

        if (!data.user) {
          Alert.alert("Error signing in with Google");
          return;
        }

        if (error) {
          throw error;
        }
      }
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as any).code === "string"
      ) {
        const err = error as { code: string };

        if (err.code === statusCodes.SIGN_IN_CANCELLED) {
          // user cancelled the login flow
        } else if (err.code === statusCodes.IN_PROGRESS) {
          // operation (e.g. sign in) is in progress already
        } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          // play services not available or outdated
        } else {
          // some other error happened
        }
      } else {
        // Handle other types of errors
        Alert.alert("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      {Platform.OS === "android" ? (
        <>
          <Pressable
            style={styles.button}
            disabled={loading}
            onPress={onGoogleLogin}
          >
            <Ionicons name="logo-google" size={24} />
          </Pressable>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#fff",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 10,
    marginTop: 10,
  },
});

export default GoogleLogin;
