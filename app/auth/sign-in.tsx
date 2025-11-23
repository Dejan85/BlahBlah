import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import React, { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { Lock, Envelope, ShowPassword } from "@/assets/images";
import CustomTextInput from "@/components/CustomTextInput";
import GoogleLogin from "@/components/GoogleSignIn";
import LoginWithProviders from "@/components/FacebookSignIn";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import TwitterLogin from "@/components/TwitterLogin";

const schema = yup.object({
  email: yup
    .string()
    .required("Email is required")
    .email("Please enter a valid email"),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type FormData = {
  email: string;
  password: string;
};

const SignIn = () => {
  const { signIn } = useAuth();
  const router = useRouter();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleTogglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev);
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      await signIn(data.email, data.password);
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <CustomTextInput
            value={value}
            leftIcon={<Envelope />}
            placeholder="Email"
            style={styles.input}
            styleContainer={[
              styles.inputContainer,
              errors.email && styles.inputError,
            ]}
            placeholderTextColor="#000"
            keyboardVerticalOffset={80}
            onChangeText={onChange}
            keyboardType="email-address"
            autoCapitalize="none"
            showBorderLeft={true}
            ref={emailRef}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!isLoading}
          />
        )}
      />
      {errors.email && (
        <Text style={styles.errorText}>{errors.email.message}</Text>
      )}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <CustomTextInput
            ref={passwordRef}
            value={value}
            leftIcon={<Lock />}
            placeholder="Password"
            rightIcon={<ShowPassword />}
            style={styles.input}
            styleContainer={[
              styles.inputContainer,
              errors.password && styles.inputError,
            ]}
            placeholderTextColor="#000"
            onChangeText={onChange}
            secureTextEntry={!isPasswordVisible}
            isPassword
            autoCapitalize="none"
            passwordVisible={isPasswordVisible}
            onRightIconPress={handleTogglePasswordVisibility}
            showBorderLeft={true}
            returnKeyType="done"
            keyboardVerticalOffset={80}
            editable={!isLoading}
          />
        )}
      />
      {errors.password && (
        <Text style={styles.errorText}>{errors.password.message}</Text>
      )}

      <Text
        style={styles.forgotPassword}
        onPress={() => router.push("/auth/forgot-password-noauth")}
      >
        Forgot Password?
      </Text>

      <Pressable
        onPress={handleSubmit(onSubmit)}
        style={[
          styles.loginBtn,
          (isLoading || Object.keys(errors).length > 0) &&
            styles.buttonDisabled,
        ]}
        disabled={isLoading || Object.keys(errors).length > 0}
      >
        {isLoading ? (
          <ActivityIndicator color="#000" style={styles.btnText} />
        ) : (
          <Text style={styles.btnText}>Login</Text>
        )}
      </Pressable>

      <View>
        <Text style={styles.title}>Or Login With</Text>
        <View style={styles.buttonRow}>
          <GoogleLogin />
          <LoginWithProviders />
          <TwitterLogin />
        </View>
      </View>
    </View>
  );
};

export default SignIn;

const styles = StyleSheet.create({
  input: {
    fontFamily: "InterMedium",
    fontSize: 14,
    color: "#000000",
    paddingVertical: 14,
    flex: 1,
    paddingLeft: 12,
  },
  inputContainer: {
    backgroundColor: "#fff",
    borderRadius: 50,
    justifyContent: "center",
    marginVertical: 24,
  },
  inputError: {
    borderColor: "#fff",
    borderWidth: 1,
  },
  errorText: {
    color: "#fff",
    fontSize: 12,
    marginTop: -20,
    marginBottom: 10,
    marginLeft: 15,
    fontFamily: "InterRegular",
  },
  forgotPassword: {
    fontFamily: "InterMedium",
    color: "#fff",
    fontSize: 14,
    textAlign: "right",
  },
  btnText: {
    fontFamily: "InterMedium",
    color: "#000",
    fontSize: 18,
    textAlign: "center",
    paddingVertical: 18,
  },
  loginBtn: {
    marginTop: 30,
    backgroundColor: "#fff",
    borderRadius: 50,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  title: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: "InterMedium",
    color: "#fff",
    paddingVertical: 10,
  },
  buttonRow: {
    flexDirection: "row",
  },
});
