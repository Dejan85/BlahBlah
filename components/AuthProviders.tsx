import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Text,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/utils/supabase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import SignInWithOtp from './SignUpWithOtp';

WebBrowser.maybeCompleteAuthSession();

// Configure Google Sign-in
GoogleSignin.configure({
  webClientId:
    '307003980819-g7e1fmdhbiu7lurl6j044oi83gi1hvtg.apps.googleusercontent.com',
  scopes: ['email', 'profile'],
  iosClientId: '',
});

const redirectTo = makeRedirectUri({
  scheme: 'blahblah',
  path: 'auth/callback',
});

type Provider = {
  id: string;
  name: string;
  icon: string;
  color: string;
  platform?: 'android' | 'ios' | 'all';
};

const providers: Provider[] = [
  {
    id: 'phone',
    name: 'Phone',
    icon: 'phone-portrait-outline',
    color: '#fff',
    platform: 'all',
  },
  {
    id: 'google',
    name: 'Google',
    icon: 'logo-google',
    color: '#fff',
    platform: 'android',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'logo-facebook',
    color: '#fff',
    platform: 'all',
  },
  {
    id: 'twitter',
    name: 'Twitter',
    icon: 'logo-twitter',
    color: '#fff',
    platform: 'all',
  },
];

const createInitialProfile = async (
  userId: string,
  avatarUrl: string | null,
  full_name: string | null
) => {
  try {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      username: null,
      full_name: full_name,
      avatar_url: avatarUrl,
      bio: null,
      expo_push_token: null,
      birthday: null,
      onboarding_completed: false,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      throw profileError;
    }

    return true;
  } catch (error) {
    console.error('Error in createInitialProfile:', error);
    throw error;
  }
};

const createSessionFromUrl = async (url: string) => {
  try {
    const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
    let accessToken = params.get('access_token');
    let refreshToken = params.get('refresh_token');

    if (Array.isArray(accessToken)) accessToken = accessToken[0];
    if (Array.isArray(refreshToken)) refreshToken = refreshToken[0];

    if (!accessToken) {
      throw new Error('Access token not found');
    }

    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken ?? '',
    });

    if (error) throw error;
    return data.session;
  } catch (error) {
    if (error instanceof Error) {
      Alert.alert('Error', error.message || 'Could not create session');
    } else {
      Alert.alert('Error', 'Could not create session');
    }
  }
};

interface AuthProvidersProps {
  onAuthStart?: () => void;
  onAuthComplete?: () => void;
  containerStyle?: object;
}

const AuthProviders: React.FC<AuthProvidersProps> = ({
  onAuthStart,
  onAuthComplete,
  containerStyle,
}) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [showPhoneSignIn, setShowPhoneSignIn] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoadingProvider('google');
      onAuthStart?.();

      // Try Web-based OAuth flow instead of native
      console.log('Using web-based OAuth flow...');
      console.log('Redirect URL:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          skipBrowserRedirect: true, // We'll handle browser manually
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }

      if (!data?.url) {
        throw new Error('No authorization URL returned from Supabase');
      }

      console.log('Opening browser for OAuth...');

      // Open browser for authentication
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );

      console.log('Browser result:', result);

      if (result.type === 'success' && result.url) {
        console.log('OAuth successful, URL received');
        console.log('URL (first 100 chars):', result.url.substring(0, 100));

        // Supabase should automatically detect and set the session from the URL
        // because we enabled detectSessionInUrl: true

        // Wait a bit for Supabase to process the URL
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check if session was set
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        console.log('Session after OAuth:', {
          hasSession: !!sessionData?.session,
          userId: sessionData?.session?.user?.id,
          error: sessionError?.message,
        });

        if (sessionError || !sessionData?.session) {
          console.error('No session after OAuth, trying manual setSession...');

          // Fallback: Extract tokens manually
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));

          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            console.log('Manually setting session with extracted tokens...');

            const { data: manualSessionData, error: manualError } =
              await supabase.auth.setSession({
                access_token,
                refresh_token,
              });

            if (manualError) {
              console.error('Manual setSession error:', {
                name: manualError.name,
                message: manualError.message,
                status: manualError.status,
              });
              throw manualError;
            }

            if (!manualSessionData?.session) {
              throw new Error('No session returned from manual setSession');
            }

            console.log(
              'Manual session set successfully:',
              manualSessionData.session.user.id
            );
          } else {
            throw new Error('No session and no tokens available');
          }
        }

        // Get final session (either auto-detected or manually set)
        const { data: finalSession } = await supabase.auth.getSession();

        if (!finalSession?.session?.user) {
          throw new Error('No user session after OAuth');
        }

        const userId = finalSession.session.user.id;
        const userMetadata = finalSession.session.user.user_metadata;

        console.log('Final session confirmed:', userId);

        // Check if user has a profile
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile check error:', profileError);
          throw new Error(
            profileError.message || 'Error checking user profile.'
          );
        }

        if (!existingProfile) {
          // Create a new profile
          const avatarUrl =
            userMetadata?.avatar_url || userMetadata?.picture || null;
          const fullName =
            userMetadata?.full_name || userMetadata?.name || null;

          console.log('Creating profile:', { userId, avatarUrl, fullName });

          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              avatar_url: avatarUrl,
              full_name: fullName,
              // email field doesn't exist in profiles table
            });

          if (insertError) {
            console.error('Profile creation error:', insertError);
            throw new Error(
              insertError.message || 'Error creating user profile.'
            );
          }

          console.log('Profile created successfully');
        }

        console.log('Google sign-in completed successfully!');
      } else if (result.type === 'cancel') {
        throw new Error('Sign-in cancelled');
      } else {
        throw new Error('OAuth flow did not complete successfully');
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);

      let errorMessage = 'Sign-in failed.';

      if (error?.code === '12501') {
        errorMessage = 'Sign-in cancelled. Please try again.';
      } else if (error?.code === '10') {
        errorMessage =
          'Google Play Services not available on this device. Please use a physical device or emulator with Google Play.';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Alert.alert('Google Sign-In Error', errorMessage);
    } finally {
      setLoadingProvider(null);
      onAuthComplete?.();
    }
  };

  const handleOAuth = async (provider: Provider) => {
    try {
      setLoadingProvider(provider.id);
      onAuthStart?.();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider.id as any,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      const res = await WebBrowser.openAuthSessionAsync(
        data?.url ?? '',
        redirectTo
      );

      if (res.type === 'success' && res.url) {
        const session = await createSessionFromUrl(res.url);

        if (session?.user) {
          const userId = session.user.id;

          // Extract avatar URL (mock example, adapt for specific providers)
          const avatarUrl = session.user?.user_metadata?.avatar_url || null;

          const fullName = session.user?.user_metadata?.name || null;

          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (!existingProfile) {
            await createInitialProfile(userId, avatarUrl, fullName);
          }
        }
      }
    } catch (error) {
      console.error('OAuth sign-in error:', error);
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'OAuth session did not complete successfully'
      );
    } finally {
      setLoadingProvider(null);
      onAuthComplete?.();
    }
  };

  const shouldShowProvider = (provider: Provider) => {
    if (provider.platform === 'all') return true;
    if (provider.platform === 'android' && Platform.OS === 'android')
      return true;
    if (provider.platform === 'ios' && Platform.OS === 'ios') return true;
    return false;
  };

  const handleProviderPress = (provider: Provider) => {
    console.log('Provider pressed:', provider.id); // Debug log
    if (provider.id === 'phone') {
      setShowPhoneSignIn(true);
    } else if (provider.id === 'google') {
      handleGoogleSignIn();
    } else {
      handleOAuth(provider);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {showPhoneSignIn && (
        <View>
          <SignInWithOtp onClose={() => setShowPhoneSignIn(false)} />
        </View>
      )}
      <View style={styles.providersContainer}>
        {providers.filter(shouldShowProvider).map((provider) => (
          <Pressable
            key={provider.id}
            style={styles.providerButton}
            onPress={() => handleProviderPress(provider)}
            disabled={loadingProvider !== null}
          >
            {loadingProvider === provider.id ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={provider.icon as any}
                  size={24}
                  color={provider.color}
                />
                <Text style={styles.signInText}>
                  Sign in with {provider.name}
                </Text>
              </>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '90%',

    alignSelf: 'center',
  },
  phoneSignInContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  providersContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    width: '100%',
    marginTop: 30,
  },
  providerButton: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    alignContent: 'center',
  },
  signInText: {
    fontFamily: 'InterMedium',
    fontSize: 18,
    color: '#fff',
    paddingLeft: 5,
  },
});

export default AuthProviders;
