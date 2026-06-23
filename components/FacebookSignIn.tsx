import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = makeRedirectUri();

const createSessionFromUrl = async (url: string) => {
  try {
    const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1]); // Handles fragments and queries
    let accessToken = params.get('access_token');
    let refreshToken = params.get('refresh_token');

    // Ensure tokens are strings
    if (Array.isArray(accessToken)) accessToken = accessToken[0];
    if (Array.isArray(refreshToken)) refreshToken = refreshToken[0];

    if (!accessToken) {
      throw new Error('Access token not found');
    }

    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken ?? '', // fallback if refreshToken is null
    });

    if (error) {
      throw error;
    }

    return data.session;
  } catch (error) {
    if (error instanceof Error) {
      Alert.alert('Error', error.message || 'Could not create session');
    } else {
      Alert.alert('Error', 'Could not create session');
    }
  }
};

const performOAuth = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw error;
    }

    const res = await WebBrowser.openAuthSessionAsync(
      data?.url ?? '',
      redirectTo
    );

    if (res.type === 'success' && res.url) {
      await createSessionFromUrl(res.url);
    } else {
      Alert.alert('OAuth session did not complete successfully');
    }
  } catch (error) {
    if (error instanceof Error) {
      Alert.alert(
        'Error',
        error.message || 'Oauth session did not complete successfully'
      );
    } else {
      Alert.alert('Error', 'Oauth session did not complete successfully');
    }
  }
};

const LoginWithProviders = () => {
  const [loading, setLoading] = useState(false);

  // Handle deep linking into the app
  useEffect(() => {
    const handleRedirect = async (event: any) => {
      const url = event.url;
      if (url) {
        await createSessionFromUrl(url);
      }
    };

    const subscription = Linking.addEventListener('url', handleRedirect);
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <Pressable
          style={styles.button}
          onPress={() => {
            setLoading(true);
            performOAuth().finally(() => setLoading(false));
          }}
        >
          <Ionicons size={24} name="logo-facebook" />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 100,
    alignContent: 'center',
  },
  button: {
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    marginTop: 10,
  },
});

export default LoginWithProviders;
