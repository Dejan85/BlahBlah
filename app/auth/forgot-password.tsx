import React, { useState } from "react";
import {
  View,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  Button,
  Pressable,
} from "react-native";
import { supabase } from "@/utils/supabase";
import Header from "@/components/Header";
import { useRouter } from "expo-router";
import CustomTextInput from "@/components/CustomTextInput";
import { Envelope } from "@/assets/images";

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState("");
  const router = useRouter();
  const handleForgotPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "com.supabase://auth/reset-password", // The deep link for password reset
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Password reset email sent!");
    }
  };

  return (
    <>
      <Header title="Forgot Password" onBackPress={() => router.back()} />
      <View style={styles.container}>
        <CustomTextInput
          value={email}
          leftIcon={<Envelope />}
          placeholder="Email"
          style={styles.input}
          styleContainer={styles.inputContainer}
          placeholderTextColor="#000"
          onChangeText={(text) => setEmail(text)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Pressable onPress={handleForgotPassword} style={styles.loginBtn}>
          <Text style={styles.btnText}>Send reset password link</Text>
        </Pressable>
      </View>
    </>
  );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,

    justifyContent: "center",
    backgroundColor: "#FF325E",
  },
  input: {
    fontFamily: "InterMedium",
    fontSize: 14,
    color: "#000000",
    paddingVertical: 14,

    flex: 1,
  },
  inputContainer: {
    backgroundColor: "#fff",
    borderRadius: 50,
    justifyContent: "center",
    marginVertical: 24,
  },
  btnText: {
    fontFamily: "InterMedium",
    color: "#000",
    fontSize: 18,
    textAlign: "center",
    paddingVertical: 18,
  },
  loginBtn: {
    marginTop: 100,
    backgroundColor: "#fff",
    borderRadius: 50,
  },
});
