// app/auth/request-reset-password.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  TextInput,
  Pressable,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import CustomTextInput from "@/components/CustomTextInput";
import { Envelope } from "@/assets/images";

const RequestResetPasswordScreen = () => {
  const [email, setEmail] = useState("");
  const router = useRouter();

  const handleRequestReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "com.supabase://auth/reset-password",
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Password reset email has been sent!");
      router.replace("/");
    }
  };

  return (
    <>
      <Header onBackPress={() => router.back()} title="Forgot Password" />
      <View style={styles.container}>
        <Text style={styles.headerText}>Request Password Reset</Text>
        <CustomTextInput
          style={styles.input}
          placeholder="Enter your email"
          styleContainer={styles.inputContainer}
          leftIcon={<Envelope />}
          showBorderLeft
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Pressable onPress={handleRequestReset} style={styles.resetBtn}>
          <Text style={styles.btnText}>Send Reset Email</Text>
        </Pressable>
      </View>
    </>
  );
};

export default RequestResetPasswordScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#FF325E",
  },
  headerText: {
    fontSize: 20,
    fontFamily: "InterBold",
    textAlign: "center",
    marginBottom: 20,
    color: "#FFF",
  },
  inputContainer: {
    backgroundColor: "#fff",
    borderRadius: 50,
    marginVertical: 15,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 10,
    fontFamily: "InterSemibold",
    color: "#000",
  },
  resetBtn: {
    backgroundColor: "#FFF",
    borderRadius: 40,
    paddingVertical: 14,
    marginTop: 20,
  },
  btnText: {
    fontSize: 18,
    color: "#111",

    textAlign: "center",
    fontFamily: "InterBold",
  },
});
