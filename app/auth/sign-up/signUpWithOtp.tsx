// SignUpWithPhone.tsx
import React, { useState } from "react";
import { View, Text, Alert, StyleSheet, Pressable } from "react-native";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import CustomTextInput from "@/components/CustomTextInput";

const SignUpWithPhone = () => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const router = useRouter();
  const requestOtp = async () => {
    const { error } = await supabase.auth.signInWithOtp({ phone });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setIsOtpSent(true);
      Alert.alert("OTP sent!", "Check your phone for the verification code.");
    }
  };

  const verifyOtp = async () => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "You have signed up successfully!");
      // Navigate to your home screen or another page after successful signup
      router.replace("/auth/sign-up/permissionsStep");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up with Phone</Text>

      <CustomTextInput
        style={styles.input}
        styleContainer={styles.inputContainer}
        placeholder="Phone number"
        value={phone}
        onChangeText={setPhone}
        autoCapitalize="none"
        selectionColor={"#000"}
        textStyle={styles.textInputStyle}
        returnKeyType="done"
        placeholderTextColor="#ccc"
      />

      <Pressable
        style={styles.buttonContainer}
        disabled={isOtpSent}
        onPress={requestOtp}
      >
        <Text style={styles.btnText}>Request OTP</Text>
      </Pressable>

      {isOtpSent && (
        <>
          <CustomTextInput
            style={styles.input}
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            selectionColor={"#000"}
            textStyle={styles.textInputStyle}
          />
          <Pressable
            style={styles.buttonContainer}
            onPress={verifyOtp}
            disabled={otp.length < 6}
          >
            <Text style={styles.btnText}>Verify Otp</Text>
          </Pressable>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",

    backgroundColor: "#FF325E",
  },
  textInputStyle: {
    fontFamily: "InterMedium",
    fontSize: 14,
    color: "#000",
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  inputContainer: {
    backgroundColor: "#fff",
    borderRadius: 50,
    marginVertical: 15,
    paddingHorizontal: 14,
  },
  title: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: "InterMedium",
    color: "#fff",
  },

  input: {
    flex: 1,
    paddingVertical: 14,
  },
  buttonContainer: {
    marginTop: 20,
    alignContent: "center",
    alignSelf: "center",
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 50,
    paddingHorizontal: 30,
    paddingVertical: 14,
  },
  btnText: {
    fontFamily: "InterSemiBold",
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
  },
});

export default SignUpWithPhone;
