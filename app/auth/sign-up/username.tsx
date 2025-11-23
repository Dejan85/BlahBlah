import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase";
import CustomTextInput from "@/components/CustomTextInput";
import { LogoWhite, Username } from "@/assets/images";
import AsyncStorage from "@react-native-async-storage/async-storage";
const UsernameStep = () => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const isValidUsername = (
    username: string,
  ): { isValid: boolean; message: string } => {
    if (username.length < 1) {
      return {
        isValid: false,
        message: "Username must be at least 1 characters",
      };
    }
    if (username.length > 30) {
      return {
        isValid: false,
        message: "Username must not exceed 30 characters",
      };
    }
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return {
        isValid: false,
        message: "Username can only contain letters, numbers, and underscores",
      };
    }
    return { isValid: true, message: "" };
  };

  const checkUsernameAvailability = async (
    username: string,
  ): Promise<boolean> => {
    const { data: existingUsers, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error("Error checking username availability");
    }

    return !existingUsers;
  };

  const handleNext = async () => {
    try {
      setLoading(true);
      setError("");

      // Validate username format
      const validation = isValidUsername(username);
      if (!validation.isValid) {
        setError(validation.message);
        return;
      }

      // Check if username is available
      const isAvailable = await checkUsernameAvailability(username);
      if (!isAvailable) {
        setError("Username is already taken");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Update profile with username and complete onboarding
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          username,
          updated_at: new Date().toISOString(),
          onboarding_completed: true,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Update metadata in auth.users
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { username },
      });

      if (metadataError) throw metadataError;

      // Store user id for welcome back
      await AsyncStorage.setItem("lastLoggedInUser", user.id);

      // Navigate to home
      router.replace("/home");
    } catch (error) {
      console.error("Error updating username:", error);
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Error", "Failed to update username");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LogoWhite />
        <Text style={styles.headerText}>BlahBlah</Text>
      </View>

      <Text style={styles.title}>
        Start with a name! Don’t stress, you can change it anytime!
      </Text>

      <CustomTextInput
        style={styles.input}
        styleContainer={[styles.inputContainer]}
        placeholder="Username"
        value={username}
        onChangeText={(text) => {
          setUsername(text);
          setError("");
        }}
        autoCapitalize="none"
        editable={!loading}
        returnKeyType="done"
      />
      <Text style={styles.characterCount}>{username.length}/30</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        style={[
          styles.buttonContainer,
          (loading || !username) && styles.buttonDisabled,
        ]}
        onPress={handleNext}
        disabled={loading || !username}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Continue</Text>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  headerText: {
    textAlign: "center",
    fontFamily: "InterBold",
    color: "#FFFFFF",
    fontSize: 28,
    top: -10,
  },
  characterCount: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "InterMedium",
    textAlign: "left",
    paddingHorizontal: 20,
    marginTop: -5,
  },
  header: {
    alignContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  container: {
    flex: 1,
    backgroundColor: "#FF325E",
    padding: 20,
  },
  title: {
    fontSize: 20,
    textAlign: "center",
    fontFamily: "InterMedium",
    color: "#fff",
    marginBottom: 20,
    paddingHorizontal: 87,
    paddingTop: 54,
  },
  inputContainer: {
    backgroundColor: "#fff",
    borderRadius: 50,
    marginVertical: 15,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: "InterMedium",
    fontSize: 14,
    color: "#000",
  },
  inputError: {
    borderColor: "#fff",
    borderWidth: 1,
  },
  errorText: {
    color: "#fff",
    fontSize: 12,
    marginTop: -10,
    marginLeft: 15,
    fontFamily: "InterRegular",
  },
  buttonContainer: {
    marginTop: 30,
    alignSelf: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  btnText: {
    fontFamily: "InterBold",
    fontSize: 22,
    color: "#fff",
    textAlign: "center",
  },
});

export default UsernameStep;
