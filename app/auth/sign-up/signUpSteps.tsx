import React, { useRef, useState, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Envelope, Username, Lock, ShowPassword } from "@/assets/images";
import CustomTextInput from "@/components/CustomTextInput";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPassword = (
  password: string,
): { isValid: boolean; message: string } => {
  if (password.length < 6) {
    return {
      isValid: false,
      message: "Password must be at least 6 characters",
    };
  }
  // if (!/[A-Z]/.test(password)) {
  //   return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  // }
  // if (!/[a-z]/.test(password)) {
  //   return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  // }
  // if (!/\d/.test(password)) {
  //   return { isValid: false, message: 'Password must contain at least one number' };
  // }
  return { isValid: true, message: "" };
};

const isValidUsername = (
  username: string,
): { isValid: boolean; message: string } => {
  if (username.length < 3) {
    return {
      isValid: false,
      message: "Username must be at least 3 characters",
    };
  }
  if (username.length > 20) {
    return {
      isValid: false,
      message: "Username must not exceed 20 characters",
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

const isValidFullName = (
  fullName: string,
): { isValid: boolean; message: string } => {
  if (fullName.trim().length < 2) {
    return {
      isValid: false,
      message: "Full name must be at least 2 characters",
    };
  }
  const nameRegex = /^[a-zA-Z\s]+$/;
  if (!nameRegex.test(fullName)) {
    return {
      isValid: false,
      message: "Full name can only contain letters and spaces",
    };
  }
  const words = fullName.trim().split(/\s+/);
  if (words.length < 2) {
    return { isValid: false, message: "Please enter both first and last name" };
  }
  return { isValid: true, message: "" };
};
type SignUpProps = {
  initialStep?: number;
};

const SignUp: React.FC<SignUpProps> = ({ initialStep = 1 }) => {
  const router = useRouter();
  const { signUp, updateUsername, updateFullName } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [fullNameError, setFullNameError] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const { verified } = useLocalSearchParams<{ verified: string }>();
  const [fullName, setFullName] = useState("");

  // First, add the resend function near your other auth functions
  const handleResendEmail = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: "blahblah://",
        },
      });

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Success", "Verification email has been resent");
      }
    } catch (error) {
      console.error("Error resending email:", error);
      Alert.alert("Error", "Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    const valid = isValidEmail(text);
    setIsEmailValid(valid);
    setEmailError(valid ? "" : "Please enter a valid email address");
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    const validation = isValidPassword(text);
    setPasswordError(validation.message);
  };

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    const validation = isValidUsername(text);
    setUsernameError(validation.message);
  };

  const handleFullNameChange = (text: string) => {
    setFullName(text);
    const validation = isValidFullName(text);
    setFullNameError(validation.message);
  };

  // Check for stored signup state on mount
  useEffect(() => {
    const checkStoredState = async () => {
      try {
        const storedStep = await AsyncStorage.getItem("signUpStep");
        const storedEmail = await AsyncStorage.getItem("signUpEmail");
        const storedPassword = await AsyncStorage.getItem("signUpPassword");

        if (storedStep && storedEmail && storedPassword) {
          setStep(parseInt(storedStep));
          setEmail(storedEmail);
          setPassword(storedPassword);
        }
      } catch (error) {
        console.error("Error reading stored state:", error);
      }
    };

    checkStoredState();
  }, []);

  // Handle verification
  useEffect(() => {
    const handleVerification = async () => {
      if (verified === "true") {
        try {
          setLoading(true);

          const storedEmail = await AsyncStorage.getItem("signUpEmail");
          const storedPassword = await AsyncStorage.getItem("signUpPassword");

          if (!storedEmail || !storedPassword) {
            throw new Error("Missing stored credentials");
          }

          setEmail(storedEmail);
          setPassword(storedPassword);

          const { error: signInError } = await supabase.auth.signInWithPassword(
            {
              email: storedEmail,
              password: storedPassword,
            },
          );

          if (signInError) throw signInError;

          setStep(4);
          await AsyncStorage.setItem("signUpStep", "4");
        } catch (error) {
          console.error("Error handling verification:", error);
          Alert.alert(
            "Error",
            "Failed to complete verification. Please try signing in manually.",
            [{ text: "OK", onPress: () => router.replace("/") }],
          );
        } finally {
          setLoading(false);
        }
      }
    };

    handleVerification();
  }, [verified]);

  const handleTogglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev);
  };

  const isNextButtonDisabled = () => {
    switch (step) {
      case 1:
        return !email || !isEmailValid;
      case 2:
        return !password || !isValidPassword(password).isValid;
      case 4:
        return !username || !isValidUsername(username).isValid;
      case 5:
        return !fullName || !isValidFullName(fullName).isValid;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!email) {
        Alert.alert("Error", "Please enter your email");
        return;
      }
      try {
        await AsyncStorage.setItem("signUpStep", "2");
        await AsyncStorage.setItem("signUpEmail", email);
        setStep(2);
      } catch (error) {
        console.error("Error saving signup state:", error);
      }
    } else if (step === 2) {
      if (!password) {
        Alert.alert("Error", "Please enter a password.");
        return;
      }

      try {
        setLoading(true);
        await AsyncStorage.setItem("signUpPassword", password);
        await AsyncStorage.setItem("signUpStep", "3");
        // Remove the signUp call here since we just want to show verification screen
        await signUp(email, password);
        setStep(3); // This will show the verification message
      } catch (error) {
        console.error("Error during signup:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUsernameSubmit = async () => {
    if (!username) {
      Alert.alert("Error", "Please enter a username");
      return;
    }

    try {
      setLoading(true);
      await updateUsername(username);
      setStep(5);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFullNameSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }

    try {
      setLoading(true);
      await updateFullName(fullName);
      await AsyncStorage.multiRemove([
        "signUpStep",
        "signUpEmail",
        "signUpPassword",
      ]);
      router.replace("/auth/sign-up/permissionsStep");
    } catch (error) {
      console.error("Error updating full name:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.title}>Enter Email</Text>
            <CustomTextInput
              style={styles.input}
              styleContainer={[
                styles.inputContainer,
                !isEmailValid && email.length > 0 && styles.inputError,
              ]}
              placeholder="Email"
              value={email}
              showBorderLeft={true}
              onChangeText={handleEmailChange}
              autoCapitalize="none"
              keyboardType="email-address"
              leftIcon={<Envelope />}
              returnKeyType="done"
            />
            {emailError !== "" && (
              <Text style={styles.errorText}>{emailError}</Text>
            )}
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.title}>Create a Password</Text>
            <CustomTextInput
              style={styles.input}
              styleContainer={[
                styles.inputContainer,
                passwordError !== "" &&
                  password.length > 0 &&
                  styles.inputError,
              ]}
              placeholder="Password"
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry={!isPasswordVisible}
              isPassword={true}
              passwordVisible={isPasswordVisible}
              showBorderLeft={true}
              leftIcon={<Lock />}
              rightIcon={<ShowPassword />}
              autoCapitalize="none"
              onRightIconPress={handleTogglePasswordVisibility}
              returnKeyType="done"
            />
            {passwordError !== "" && (
              <Text style={styles.errorText}>{passwordError}</Text>
            )}
          </>
        );
      case 3:
        return (
          <View
            style={{ justifyContent: "center", flex: 1, marginHorizontal: 20 }}
          >
            <Text style={styles.title}>Verify your email address</Text>
            <Text style={[styles.title, styles.subtitle]}>
              We have sent a verification link to {email}. Please check your
              inbox.
            </Text>
            <Pressable
              style={[styles.resendButton, loading && styles.disabledButton]}
              onPress={handleResendEmail}
              disabled={loading}
            >
              <Text style={styles.resendButtonText}>
                {loading ? "Sending..." : "Resend email"}
              </Text>
            </Pressable>
          </View>
        );
      case 4:
        return (
          <View
            style={{ justifyContent: "center", flex: 1, marginHorizontal: 20 }}
          >
            <Text style={styles.title}>Pick a username for your account</Text>
            <CustomTextInput
              style={styles.input}
              styleContainer={[
                styles.inputContainer,
                usernameError !== "" &&
                  username.length > 0 &&
                  styles.inputError,
              ]}
              placeholder="Username"
              value={username}
              showBorderLeft={true}
              onChangeText={handleUsernameChange}
              autoCapitalize="none"
              leftIcon={<Username />}
              returnKeyType="done"
            />
            {usernameError !== "" && (
              <Text style={styles.errorText}>{usernameError}</Text>
            )}
          </View>
        );
      case 5:
        return (
          <View
            style={{ justifyContent: "center", flex: 1, marginHorizontal: 20 }}
          >
            <Text style={styles.title}>Enter your full name</Text>
            <CustomTextInput
              style={styles.input}
              styleContainer={[
                styles.inputContainer,
                fullNameError !== "" &&
                  fullName.length > 0 &&
                  styles.inputError,
              ]}
              placeholder="Full Name"
              value={fullName}
              showBorderLeft={true}
              onChangeText={handleFullNameChange}
              autoCapitalize="words"
              returnKeyType="done"
            />
            {fullNameError !== "" && (
              <Text style={styles.errorText}>{fullNameError}</Text>
            )}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
      {renderContent()}
      {/* {step !== 3 &&
        step !== 4 &&
        step !== 5 && ( // Added step !== 5 here
          <Pressable
          style={[
            styles.buttonContainer,
            (loading ||
              (step === 1 && (!email || !isEmailValid)) ||
              (step === 2 && !password)) &&
              styles.disabledButton,
          ]}
          onPress={handleNext}
          disabled={
            loading || 
            (step === 1 && (!email || !isEmailValid)) || 
            (step === 2 && !password)
          }
        >
          <Text style={styles.btnText}>
            {loading ? "Loading..." : "Next"}
          </Text>
        </Pressable>
        )}
      {step === 4 && (
        <Pressable
          style={[
            styles.whiteButtonContainer,
            (!username || loading) && styles.disabledButton,
          ]}
          onPress={handleUsernameSubmit}
          disabled={!username || loading}
        >
          <Text style={styles.btnText}>{loading ? "Loading..." : "Next"}</Text>
        </Pressable>
      )}
      {step === 5 && (
        <Pressable
          style={[
            styles.whiteButtonContainer,
            (!fullName || loading) && styles.disabledButton,
          ]}
          onPress={handleFullNameSubmit}
          disabled={!fullName || loading}
        >
          <Text style={styles.btnText}>{loading ? "Loading..." : "Next"}</Text>
        </Pressable>
      )} */}

      {step !== 3 && (
        <Pressable
          style={[
            styles.buttonContainer,
            (loading || isNextButtonDisabled()) && styles.disabledButton,
          ]}
          onPress={
            step === 4
              ? handleUsernameSubmit
              : step === 5
                ? handleFullNameSubmit
                : handleNext
          }
          disabled={loading || isNextButtonDisabled()}
        >
          <Text style={styles.btnText}>{loading ? "Loading..." : "Next"}</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: "#FF325E",
  },
  inputContainer: {
    backgroundColor: "#fff",
    borderRadius: 50,
    marginVertical: 15,
  },
  title: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: "InterMedium",
    color: "#fff",
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.8,
  },
  resendButton: {
    marginTop: 20,
    alignContent: "center",
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  resendButtonText: {
    fontFamily: "InterRegular",
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
  },
  whiteButtonContainer: {
    marginTop: 20,
    alignContent: "center",
    alignSelf: "center",
    borderRadius: 50,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderWidth: 1,
    color: "#000",
    borderColor: "#fff",
    marginBottom: 100,
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
    marginTop: 20,
    alignContent: "center",
    alignSelf: "center",
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 50,
    paddingHorizontal: 30,
    paddingVertical: 14,
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  btnText: {
    fontFamily: "InterSemiBold",
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 12,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
});

export default SignUp;
