import React, { useState } from 'react';
import { View, Alert, StyleSheet, Text } from 'react-native';
import { supabase } from '@/utils/supabase';
import Header from '@/components/Header';
import CustomTextInput from '@/components/CustomTextInput';
import { useRouter } from 'expo-router';
import { Lock, ShowPassword } from '@/assets/images';
import { Pressable } from 'react-native';

const ResetPasswordScreen = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleTogglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev);
  };
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  const handleToggleConfirmPassVisibility = () => {
    setIsConfirmPasswordVisible((prev) => !prev);
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Password has been reset successfully!');

      router.replace('/');
      // Optionally navigate to login screen
    }
  };

  return (
    <>
      <Header title="Reset Password" onBackPress={() => router.back()} />
      <View style={styles.container}>
        <CustomTextInput
          placeholder="Enter new password"
          secureTextEntry
          leftIcon={<Lock />}
          style={styles.input}
          value={newPassword}
          rightIcon={<ShowPassword />}
          onChangeText={(text) => setNewPassword(text)}
          styleContainer={styles.inputContainer}
          isPassword
          passwordVisible={isPasswordVisible}
          autoCapitalize="none"
          onRightIconPress={handleTogglePasswordVisibility}
        />
        <CustomTextInput
          placeholder="Confirm new password"
          secureTextEntry
          style={styles.input}
          leftIcon={<Lock />}
          value={confirmPassword}
          autoCapitalize="none"
          rightIcon={<ShowPassword />}
          onChangeText={(text) => setConfirmPassword(text)}
          styleContainer={styles.inputContainer}
          isPassword
          passwordVisible={isConfirmPasswordVisible}
          onRightIconPress={handleToggleConfirmPassVisibility}
        />

        <Pressable onPress={handleResetPassword} style={styles.loginBtn}>
          <Text style={styles.btnText}>Reset Password</Text>
        </Pressable>
      </View>
    </>
  );
};

export default ResetPasswordScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    backgroundColor: '#FF325E',
  },
  input: {
    fontFamily: 'InterMedium',
    fontSize: 14,
    color: '#000000',
    marginVertical: 15,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 50,
    justifyContent: 'center',
    marginVertical: 24,
  },
  btnText: {
    fontFamily: 'InterMedium',
    color: '#000',
    fontSize: 18,
    textAlign: 'center',
    paddingVertical: 18,
  },
  loginBtn: {
    marginTop: 50,
    backgroundColor: '#fff',
    borderRadius: 50,
  },
});
