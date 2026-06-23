// app/test/[id].tsx
import React, { useState, useEffect, useCallback, useMemo, FC } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Pressable,
  Alert,
  Platform,
  StatusBar,
  Dimensions,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';
import { IconButton } from '@/components/IconButton';
import {
  ProfileBackButton,
  ProfileOptions,
  Block,
  MuteAction,
  Report,
  Eye,
} from '@/assets/images';
import Avatar from '@/components/Avatar';
import BottomModal from '@/components/BottomModal';

import ReportMenu from '@/components/ReportMenu';
import PremiumModal from '@/components/PremiumModal';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';
import SettingItem from '@/components/SettingItem';
import { useMessage } from '@/context/MessageContext';
import { BlockBadge } from '@/components/BlockBadge';

const { height: windowHeight } = Dimensions.get('window');

// --- INITIAL STATES ---
interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  website_url: string;
  location_enabled: boolean;
  latitude?: number;
  longitude?: number;
  updated_at?: string;
  profileLocked?: boolean;
}

interface ProfileState {
  loading: boolean;
  profile: Profile | null;
  followersCount: number;
  followingCount: number;
  loggingOut: boolean;
  savingProfile: boolean;
}

interface EditFormState {
  username: string;
  fullName: string;
  bio: string;
  avatarUrl: string;
  websiteUrl: string;
  locationEnabled: boolean;
}

// ---------- Initial States ----------
const initialState: ProfileState = {
  loading: true,
  profile: null,
  followersCount: 0,
  followingCount: 0,
  loggingOut: false,
  savingProfile: false,
};

const initialEditForm: EditFormState = {
  username: '',
  fullName: '',
  bio: '',
  avatarUrl: '',
  websiteUrl: '',
  locationEnabled: false,
};

interface ProfileDetailsProps {
  lockProfile?: boolean;
}

// --- MAIN COMPONENT ---
const ProfileScreen: FC<ProfileDetailsProps> = () => {
  // Read the optional id from the route.
  // If no id is provided, assume it's your own profile.
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { createOrNavigateToChat } = useMessage();
  // Ensure a boolean value for "isOwnProfile"
  const isOwnProfile: boolean = !id || (user ? user.id === id : false);
  const profileId: string | undefined = id || user?.id;
  const currentUser = user?.id;

  // State for profile data and UI flags
  const [state, setState] = useState<ProfileState>(initialState);
  const [editForm, setEditForm] = useState<EditFormState>(initialEditForm);
  const [modalStates, setModalStates] = useState({ main: false, edit: false });
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showBlahModal, setShowBlahModal] = useState(false);

  // Additional state for follow/block/mute actions (for public profiles)
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasUnfollowed, setHasUnfollowed] = useState(false);
  const [blockState, setBlockState] = useState({
    isBlocked: false,
    isBlockedBy: false,
  });
  const [isMuted, setIsMuted] = useState(false);

  // State for posts (grid)
  const [, setPosts] = useState<any[]>([]);
  const [, setLoadingPosts] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const goToSettings = () => {
    router.push({
      pathname: '/settings/[id]',
      params: { id: currentUser ?? 'default' },
    });
  };

  // Derived display values (fallbacks)
  const displayValues = useMemo(
    () => ({
      username: state.profile?.username ?? 'Guest',
      fullName: state.profile?.full_name ?? '',
      bio: state.profile?.bio ?? 'Welcome!',
      url: state.profile?.website_url ?? 'https://example.com',
    }),
    [state.profile]
  );

  const fetchProfileData = useCallback(async () => {
    if (!user || !profileId) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }
    try {
      // Run parallel queries: profile data and follow counts
      const [profileResponse, followersResponse, followingResponse] =
        await Promise.all([
          supabase
            .from('profiles')
            .select(
              'username, full_name, avatar_url, bio, website_url, location_enabled, latitude, longitude'
            )
            .eq('id', profileId)
            .single(),
          supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('followed_id', profileId),
          supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', profileId),
        ]);
      if (profileResponse.error) throw profileResponse.error;

      // If location is enabled, request permission and update coordinates
      let currentLocation: Location.LocationObject | null = null;
      if (profileResponse.data?.location_enabled) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            currentLocation = await Location.getCurrentPositionAsync({});
            if (currentLocation) {
              await supabase
                .from('profiles')
                .update({
                  latitude: currentLocation.coords.latitude,
                  longitude: currentLocation.coords.longitude,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);
            }
          }
        } catch (error) {
          console.error('Error getting location:', error);
        }
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        profile: {
          id: profileId, // <-- include the id!
          ...profileResponse.data,
          latitude:
            currentLocation?.coords.latitude ?? profileResponse.data.latitude,
          longitude:
            currentLocation?.coords.longitude ?? profileResponse.data.longitude,
        },
        followersCount: followersResponse.count || 0,
        followingCount: followingResponse.count || 0,
      }));

      // If it's your own profile, prefill the edit form.
      if (isOwnProfile) {
        setEditForm({
          username: profileResponse.data.username || '',
          fullName: profileResponse.data.full_name || '',
          bio: profileResponse.data.bio || '',
          websiteUrl: profileResponse.data.website_url || '',
          avatarUrl: profileResponse.data.avatar_url || '',
          locationEnabled: profileResponse.data.location_enabled || false,
        });
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [profileId, user, isOwnProfile]);

  const checkBlockStatus = async () => {
    // Ensure both current user and target id are defined.
    if (!user || !id) return;

    try {
      // Check if the current user has blocked the target profile.
      const { data: blockedByMe } = await supabase
        .from('blocks')
        .select('*')
        .eq('blocker_id', user.id)
        .eq('blocked_id', id)
        .single();

      // Check if the target profile has blocked the current user.
      const { data: blockedMe } = await supabase
        .from('blocks')
        .select('*')
        .eq('blocker_id', id)
        .eq('blocked_id', user.id)
        .single();

      setBlockState({
        isBlocked: !!blockedByMe,
        isBlockedBy: !!blockedMe,
      });
    } catch (error) {
      console.error('Error checking block status:', error);
    }
  };

  useEffect(() => {
    if (profileId) fetchProfileData();
  }, [profileId, fetchProfileData]);

  useEffect(() => {
    if (profileId) checkBlockStatus();
  }, [profileId, checkBlockStatus]);

  // ---------- FETCH POSTS ----------
  const fetchUserPosts = useCallback(async () => {
    if (!user || !profileId) return;
    try {
      setLoadingPosts(true);
      const { data: postsData, error } = await supabase
        .from('posts')
        .select(
          `
            id, main_media_url, media_type, created_at,
            additional_media, music, hashtags,
            profile:profiles (id, username, avatar_url)
          `
        )
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const transformedPosts = (postsData || []).map((post: any) => ({
        id: post.id,
        image: post.main_media_url,
        timestamp: new Date(post.created_at).getTime(),
        type: post.media_type,
        uri: post.main_media_url,
        user: post.profile
          ? {
              id: post.profile.id,
              username: post.profile.username,
              profilePhoto: post.profile.avatar_url,
            }
          : undefined,
        images: post.additional_media,
        music: post.music,
        hashtags: post.hashtags,
      }));
      setPosts(transformedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  }, [profileId, user]);

  useEffect(() => {
    if (profileId) fetchUserPosts();
  }, [profileId, fetchUserPosts]);

  // ---------- FOLLOW STATUS (for public profiles) ----------
  const checkFollowStatus = useCallback(async () => {
    if (!user || isOwnProfile || !profileId) return;
    const { data, error } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
      .eq('followed_id', profileId)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking follow status:', error);
    }
    setIsFollowing(!!data);
  }, [user, profileId, isOwnProfile]);

  useEffect(() => {
    if (!isOwnProfile && profileId) {
      checkFollowStatus();
    }
  }, [isOwnProfile, profileId, checkFollowStatus]);

  // --- EDIT PROFILE (OWN PROFILE) ---
  const handleEditProfile = useCallback(() => {
    setModalStates((prev) => ({ ...prev, main: false, edit: true }));
    if (state.profile) {
      setEditForm({
        username: state.profile.username,
        fullName: state.profile.full_name,
        bio: state.profile.bio || '',
        avatarUrl: state.profile.avatar_url,
        websiteUrl: state.profile.website_url || '',
        locationEnabled: state.profile.location_enabled || false,
      });
    }
  }, [state.profile]);

  const handleSaveProfileEdit = useCallback(async () => {
    if (!user) return;
    try {
      setState((prev) => ({ ...prev, savingProfile: true }));
      const updates = {
        id: user.id,
        username: editForm.username,
        full_name: editForm.fullName,
        avatar_url: editForm.avatarUrl,
        bio: editForm.bio,
        website_url: editForm.websiteUrl,
        location_enabled: editForm.locationEnabled,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('profiles')
        .upsert(updates, { onConflict: 'id' });
      if (error) throw error;
      setState((prev) => ({ ...prev, profile: updates, savingProfile: false }));
      setModalStates((prev) => ({ ...prev, edit: false }));
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Unexpected error'
      );
      setState((prev) => ({ ...prev, savingProfile: false }));
    }
  }, [user, editForm]);

  // --- FOLLOW / UNFOLLOW (for public profiles) ---
  const handleFollowAction = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to follow users');
      return;
    }
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('followed_id', profileId);
        if (error) throw error;
        setIsFollowing(false);
        setHasUnfollowed(true);
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: user.id, followed_id: profileId });
        if (error) throw error;
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  // --- BLOCK USER ---
  const handleBlockUser = async () => {
    if (!currentUser || !id) {
      Alert.alert('Error', 'You must be logged in to block users');
      return;
    }
    try {
      // Check if a block record already exists
      const { data: existingBlock, error: checkError } = await supabase
        .from('blocks')
        .select('*')
        .eq('blocker_id', currentUser)
        .eq('blocked_id', id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking block status:', checkError);
        return;
      }

      if (existingBlock) {
        // Block exists: so we delete it (i.e. unblock)
        const { error: deleteError } = await supabase
          .from('blocks')
          .delete()
          .eq('blocker_id', currentUser)
          .eq('blocked_id', id);

        if (deleteError) {
          console.error('Error unblocking:', deleteError);
          throw deleteError;
        }

        setBlockState((prev) => ({ ...prev, isBlocked: false }));
        if (isFollowing) {
          await handleFollowAction();
        }
        Alert.alert('Success', 'User has been unblocked');
        return;
      }

      // Otherwise, insert a new block record (block the user)
      const { error } = await supabase.from('blocks').insert({
        blocker_id: currentUser,
        blocked_id: id,
      });
      if (error) {
        console.error('Error blocking:', error);
        throw error;
      }

      setBlockState((prev) => ({ ...prev, isBlocked: true }));
      if (isFollowing) {
        await handleFollowAction();
      }
      Alert.alert('Success', 'User has been blocked');
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to update block status');
    }
  };

  // --- MESSAGE (navigate to chat room) ---
  const handleMessage = async () => {
    if (!user || !profileId) {
      Alert.alert('Error', 'You must be logged in to send messages');
      return;
    }
    // Call the context function, passing the current user’s id and a target user object
    await createOrNavigateToChat(user.id, {
      id: profileId,
      username: displayValues.username,
      image: state?.profile?.avatar_url ?? '',

      bio: state.profile?.bio,
    });
  };

  // --- PREMIUM HANDLERS ---
  const handlePlanSelection = (plan: 'monthly' | 'yearly' | 'onetime') => {
    console.log('Selected plan:', plan);
  };
  const handleContinue = () => {
    setShowPremiumModal(false);
  };

  // --- RENDERING ---
  if (state.loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FF325E" />
      </View>
    );
  }

  const handleModal = () => {
    if (isOwnProfile) {
      // setModalStates((prev) => ({ ...prev, main: true }));
      goToSettings();
    } else {
      setModalVisible(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with back and options */}
        <View style={styles.header}>
          <IconButton
            icon={<ProfileBackButton fill="#000" />}
            onPress={() => router.back()}
            size={34}
          />
          <IconButton
            icon={<ProfileOptions />}
            onPress={handleModal}
            size={34}
          />
        </View>

        {/* Profile header: avatar, username, bio, website link */}
        <View style={styles.profileUsername}>
          <Avatar size={60} url={state.profile?.avatar_url ?? null} />
          <View style={styles.profileUsernameColumn}>
            <Text style={styles.profileUname}>{displayValues.username}</Text>
            <Text style={styles.profileStatus}>{displayValues.bio}</Text>
            <Pressable
              onPress={() => {
                const urlToOpen =
                  state.profile?.website_url || displayValues.url;
                if (urlToOpen) {
                  const fullUrl = urlToOpen.startsWith('http')
                    ? urlToOpen
                    : `https://${urlToOpen}`;
                  Linking.openURL(fullUrl).catch(() =>
                    Alert.alert('Error', 'Could not open the website')
                  );
                }
              }}
            >
              <Text
                style={[styles.website, { textDecorationLine: 'underline' }]}
              >
                {state.profile?.website_url || displayValues.url}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Stats row: Blahs, Followers, Following */}
        <View style={styles.blahRow}>
          <TouchableOpacity
            style={styles.textContainer}
            onPress={() => setShowBlahModal(true)}
          >
            <Text style={styles.blahs}>10.7k</Text>
            <Text style={styles.subtitle}>Blahs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.textContainer}
            onPress={() => router.push('/followers-list')}
          >
            <Text style={styles.blahs}>{state.followersCount}</Text>
            <Text style={styles.subtitle}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.textContainer}
            onPress={() => router.push('/following-list')}
          >
            <Text style={styles.blahs}>{state.followingCount}</Text>
            <Text style={styles.subtitle}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* Action buttons */}

        {isOwnProfile ? (
          <View style={styles.editProfileContainer}>
            <TouchableOpacity
              onPress={handleEditProfile}
              style={styles.editProfile}
            >
              <FontAwesome5 name="edit" color="#111" size={24} />
              <Text style={[styles.fullName, styles.editName]}>
                Edit profile
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPremiumModal(true)}
            >
              <Eye />
            </TouchableOpacity>
          </View>
        ) : blockState.isBlocked ? (
          <BlockBadge />
        ) : (
          <>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.button,
                  isFollowing ? styles.unfollowButton : styles.followButton,
                ]}
                onPress={handleFollowAction}
              >
                <Text style={styles.unffolow}>
                  {isFollowing
                    ? 'Unfollow'
                    : hasUnfollowed
                      ? 'Follow Back'
                      : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.messageButton]}
                onPress={handleMessage}
              >
                <Text style={styles.buttonText}>Message</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fullName}>{displayValues.fullName}</Text>

            <View style={styles.postListContainer}>
              {/* <GridPosts userId={profileId} isPersonalProfile={isOwnProfile} /> */}
            </View>
          </>
        )}

        {isOwnProfile && (
          <>
            <Text style={styles.fullName}>{displayValues.fullName}</Text>

            <View style={styles.postListContainer}>
              {/* <GridPosts userId={profileId} isPersonalProfile={isOwnProfile} /> */}
            </View>
          </>
        )}

        {/* Bottom modal for options */}

        <BottomModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          line={false}
          modalStyle={styles.modalContainer}
          height={windowHeight * 0.8}
        >
          <View style={styles.modalContent}>
            <SettingItem
              icon={<MuteAction />}
              title="Mute Notifications"
              value={isMuted}
              style={styles.item}
              onValueChange={setIsMuted}
            />

            <SettingItem
              icon={<Block />}
              title={blockState.isBlocked ? 'Unblock' : 'Block'}
              value={blockState.isBlocked}
              style={styles.item}
              onValueChange={handleBlockUser}
            />

            <SettingItem
              style={styles.item}
              isSwitch={false}
              title="Report Account"
              icon={<Report />}
            />
            <ReportMenu onClose={() => setModalVisible(false)} />
          </View>
        </BottomModal>

        {/* Bottom modal for editing profile (only for own profile) */}
        {isOwnProfile && (
          <BottomModal
            visible={modalStates.edit}
            onClose={() => setModalStates((prev) => ({ ...prev, edit: false }))}
            height={windowHeight * 0.9}
          >
            <View style={styles.editContainer}>
              <Text style={styles.editTitle}>Edit Profile</Text>
              <TextInput
                style={styles.input}
                placeholder="Username"
                value={editForm.username}
                onChangeText={(text) =>
                  setEditForm((prev) => ({ ...prev, username: text }))
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={editForm.fullName}
                onChangeText={(text) =>
                  setEditForm((prev) => ({ ...prev, fullName: text }))
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Bio"
                value={editForm.bio}
                onChangeText={(text) =>
                  setEditForm((prev) => ({ ...prev, bio: text }))
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Website URL"
                value={editForm.websiteUrl}
                onChangeText={(text) =>
                  setEditForm((prev) => ({ ...prev, websiteUrl: text }))
                }
              />
              <View style={styles.locationContainer}>
                <Text style={styles.locationText}>Location</Text>
                <Switch
                  trackColor={{ false: '#B3B3B3', true: '#FF325E' }}
                  thumbColor={editForm.locationEnabled ? '#fff' : '#fff'}
                  onValueChange={(value) =>
                    setEditForm((prev) => ({ ...prev, locationEnabled: value }))
                  }
                  value={editForm.locationEnabled}
                />
              </View>
              <Avatar
                size={60}
                url={editForm.avatarUrl}
                onUpload={(path) =>
                  setEditForm((prev) => ({ ...prev, avatarUrl: path }))
                }
              />
              <Pressable
                style={[
                  styles.button,
                  state.savingProfile && styles.buttonDisabled,
                ]}
                onPress={handleSaveProfileEdit}
                disabled={state.savingProfile}
              >
                {state.savingProfile ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnText}>Save</Text>
                )}
              </Pressable>
            </View>
          </BottomModal>
        )}

        {/* Premium Modal */}
        <PremiumModal
          isVisible={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          onPlanSelection={handlePlanSelection}
          onContinue={handleContinue}
          isPremium={true}
          isBlahs={false}
        />

        <PremiumModal
          isVisible={showBlahModal}
          onClose={() => setShowBlahModal(false)}
          onPlanSelection={handlePlanSelection}
          onContinue={handleContinue}
          isPremium={false}
          isBlahs={true}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  modalContent: {
    paddingLeft: 18,
    paddingRight: 37,
    marginTop: 48,
  },
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 30,
    height: 60,
  },
  profileUsername: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginVertical: 40,
  },
  profileUsernameColumn: {
    marginLeft: 15,
  },
  profileUname: {
    fontFamily: 'InterSemiBold',
    fontSize: 20,
    color: '#000',
  },
  buttonRow: {
    flexDirection: 'row',
    alignContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  profileStatus: {
    fontFamily: 'InterMedium',
    fontSize: 12,
    color: '#000',
  },
  website: {
    color: '#FF325E',
    fontFamily: 'InterMedium',
    fontSize: 12,
  },
  item: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  blahRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  textContainer: {
    marginHorizontal: 12,
  },
  blahs: {
    fontFamily: 'InterBold',
    fontSize: 18,
    color: '#000',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'InterSemiBold',
    fontSize: 15,
    color: '#B3B3B3',
    textAlign: 'center',
  },
  eyeButton: {
    marginLeft: 7,
  },
  editProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignContent: 'center',
    alignSelf: 'center',
    marginTop: 40,
  },
  editName: {
    textAlign: 'left',
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 5,
    top: 2,
  },
  editProfile: {
    flexDirection: 'row',
  },
  fullName: {
    fontFamily: 'InterMedium',
    fontSize: 18,
    textAlign: 'center',
    paddingTop: 40,
    paddingBottom: 10,
  },
  button: {
    backgroundColor: '#B3B3B3',
    borderRadius: 40,
    paddingVertical: 8,
    marginHorizontal: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  followButton: {
    backgroundColor: '#fff',
  },
  unfollowButton: {
    backgroundColor: '#fff',
  },
  messageButton: {
    backgroundColor: '#fff',
  },
  blockButton: {
    backgroundColor: '#fff',
  },
  unffolow: {
    fontFamily: 'InterMedium',
    fontSize: 18,
    color: '#FF325E',
  },
  buttonText: {
    fontFamily: 'InterMedium',
    fontSize: 18,
    color: '#000',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  postListContainer: {
    flex: 1,
  },
  btnText: {
    fontFamily: 'InterSemiBold',
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    paddingVertical: 8,
  },
  modalContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontFamily: 'InterSemiBold',
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
    color: '#FF325E',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: 'InterMedium',
    fontSize: 16,
    marginBottom: 15,
    color: '#000',
  },
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 15,
  },
  locationText: {
    fontFamily: 'InterMedium',
    fontSize: 16,
    color: '#000',
  },
  editContainer: {
    padding: 20,
  },
  editTitle: {
    fontFamily: 'InterSemiBold',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  skeletonContainer: {
    flex: 1,
    margin: 50,
    marginTop: 100,
  },
  avatarSkeleton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E1E1E1',
    marginBottom: 10,
  },
  contentSkeleton: {
    height: 100,
    backgroundColor: '#E1E1E1',
    borderRadius: 8,
  },
});

export default ProfileScreen;
