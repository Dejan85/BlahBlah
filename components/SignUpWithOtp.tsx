import React, { useState, useRef } from 'react';
import { View, Text, Alert, StyleSheet, Pressable } from 'react-native';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'expo-router';
import CustomTextInput from '@/components/CustomTextInput';
import PhoneInput, {
  IPhoneInputRef,
} from 'react-native-international-phone-number';

interface SignInWithOtpProps {
  onClose?: () => void;
}

const SignInWithOtp: React.FC<SignInWithOtpProps> = ({ onClose }) => {
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isValidNumber, setIsValidNumber] = useState(true);
  const phoneInputRef = useRef<IPhoneInputRef>(null);
  const router = useRouter();

  const requestOtp = async () => {
    if (!phoneInputRef.current?.isValid) {
      setIsValidNumber(false);
      return;
    }

    const phoneNumber = phoneInputRef.current?.fullPhoneNumber;
    const { error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setIsOtpSent(true);
      setIsValidNumber(true);
      Alert.alert('OTP sent!', 'Check your phone for the verification code.');
    }
  };

  const verifyOtp = async () => {
    const phoneNumber = phoneInputRef.current?.fullPhoneNumber;
    if (!phoneNumber) {
      setIsValidNumber(false);
      return;
    }

    const { error } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token: otp,
      type: 'sms',
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'You have signed in successfully!');
      router.replace('/home');
    }
  };

  console.log(isValidNumber, 'valid');

  return (
    <View style={styles.container}>
      <View style={styles.phoneInputContainer}>
        <PhoneInput
          ref={phoneInputRef}
          autoFocus
          placeholder="Enter phone number"
          phoneInputStyles={{
            container: {
              backgroundColor: '#fff',
              borderWidth: 0,
              borderStyle: 'solid',
              borderColor: '#F3F3F3',
              borderRadius: 20,
            },
            flagContainer: {
              borderTopLeftRadius: 20,
              borderBottomLeftRadius: 20,
              backgroundColor: '#fff',
              justifyContent: 'center',
            },
            input: {
              color: '#111',
              paddingLeft: 0,
            },
            caret: {
              color: '#111',
              fontSize: 15,
            },
            divider: {
              backgroundColor: '#B3B3B3',
            },
          }}
          onChange={() => setIsValidNumber(true)}
          modalStyles={{
            modal: {
              backgroundColor: '#fff',
            },
            backdrop: {},
            divider: {
              backgroundColor: 'transparent',
            },
            countriesList: {},
            searchInput: {
              borderRadius: 20,
              color: '#111',
              backgroundColor: '#B3B3B3',
              paddingHorizontal: 15,
            },
            countryButton: {
              borderWidth: 0,

              backgroundColor: '#B3B3B3',
              marginVertical: 4,
              paddingVertical: 0,
            },
            noCountryText: {},
            noCountryContainer: {},
            flag: {
              fontSize: 26,
            },
            callingCode: {
              color: '#111',
              fontFamily: 'InterSemibold',
              fontSize: 14,
            },
            countryName: {
              color: '#111',
              fontFamily: 'InterMedium',
              fontSize: 16,
            },
            sectionTitle: {
              color: '#111',
            },
          }}
        />
        {!isValidNumber && (
          <Text style={styles.errorText}>
            Please enter a valid phone number
          </Text>
        )}
      </View>

      <Pressable
        style={[styles.buttonContainer]}
        disabled={!isValidNumber && isOtpSent}
        onPress={requestOtp}
      >
        <Text style={styles.btnText}>Request OTP</Text>
      </Pressable>

      {isOtpSent && (
        <>
          <CustomTextInput
            style={styles.input}
            styleContainer={styles.inputContainer}
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            selectionColor={'#000'}
            textStyle={styles.textInputStyle}
            placeholderTextColor="#ccc"
            maxLength={6}
          />
          <Pressable
            style={styles.buttonContainer}
            onPress={verifyOtp}
            disabled={otp.length < 6}
          >
            <Text style={styles.btnText}>Verify OTP</Text>
          </Pressable>
        </>
      )}

      <Pressable style={styles.cancelButton} onPress={onClose}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
      <View style={styles.line} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#FF325E',
  },
  phoneInputContainer: {
    width: '100%',
    marginVertical: 10,
  },
  phoneInput: {
    backgroundColor: '#fff',
    borderRadius: 50,
    paddingHorizontal: 14,
    width: '100%',
  },
  errorText: {
    color: '#111',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 14,
    fontFamily: 'InterMedium',
  },
  textInputStyle: {
    fontFamily: 'InterMedium',
    fontSize: 14,
    color: '#000',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 50,
    paddingHorizontal: 14,
    marginVertical: 10,
    width: '100%',
  },
  input: {
    paddingVertical: 14,
    width: '100%',
  },
  buttonContainer: {
    alignSelf: 'center',
    paddingHorizontal: 30,
    paddingVertical: 14,
    marginTop: 10,
  },
  btnText: {
    fontFamily: 'InterSemiBold',
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
  btnTextDisabled: {
    fontFamily: 'InterSemiBold',
    fontSize: 18,
    color: '#ccc',
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 20,
    alignSelf: 'center',
    marginBottom: 20,
  },
  cancelText: {
    fontFamily: 'InterMedium',
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  line: {
    width: '100%',
    height: 2,
    backgroundColor: '#fff',
    marginBottom: 34,
  },
});

export default SignInWithOtp;
