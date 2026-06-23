import React, { useState, FC, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Linking,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import {
  ProfileBackButton,
  ProfileLock,
  ProfileOptions,
  Block,
  MuteAction,
  Report,
} from '@/assets/images';
import BottomModal from '@/components/BottomModal';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';
import { useMessage } from '@/context/MessageContext';
import SettingItem from '@/components/SettingItem';
import ReportMenu from '@/components/ReportMenu';
import { BlockState } from '@/types';
import { BlockBadge } from '@/components/BlockBadge';
import GridPosts from '@/components/GridPost';
const { height: windowHeight } = Dimensions.get('window');
const postsData = [
  { id: '1', image: 'https://via.placeholder.com/300', timestamp: Date.now() },
  {
    id: '2',
    image: 'https://via.placeholder.com/300',
    timestamp: Date.now() - 10000,
  },
];

interface ProfileDetailsProps {
  lockProfile?: boolean;
}

const ProfileDetails: FC<ProfileDetailsProps> = () => {
  const {
    id,
    username,
    image,
    bio,
    lockProfile: lockString,
    fullName,
    website_url,
    followers_count,
    following_count,
  } = useLocalSearchParams<{
    id: string;
    username: string;
    image: string;
    bio: string;
    lockProfile: string;
    fullName: string;
    website_url: string;
    followers_count: string;
    following_count: string;
  }>();

  const { user: currentUser } = useAuth();
  const { createOrNavigateToChat } = useMessage();
  const [modalVisible, setModalVisible] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasUnfollowed, setHasUnfollowed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postCount] = useState('10,9K'); // You can make this dynamic
  const isProfileLocked = lockString === 'true';
  const [isMuted, setIsMuted] = useState(false);

  const router = useRouter();

  const [, setState] = useState({
    followerCount: parseInt(followers_count || '0'),
    followingCount: parseInt(following_count || '0'),
    profile: {
      id: id,
      username: username,
      full_name: fullName,
      avatar_url: image,
      bio: bio,
      website_url: website_url,
    },
    loading: false,
  });

  useEffect(() => {
    // Refresh data in background to ensure it's up to date
    const refreshProfileData = async () => {
      if (!id) return;

      try {
        setState((prev) => ({ ...prev, loading: true }));

        const [profileResponse, followersCount, followingCount] =
          await Promise.all([
            supabase.from('profiles').select('*').eq('id', id).single(),
            supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('followed_id', id),
            supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('follower_id', id),
          ]);

        if (profileResponse.error) throw profileResponse.error;

        setState({
          followerCount: followersCount.count || 0,
          followingCount: followingCount.count || 0,
          profile: profileResponse.data,
          loading: false,
        });
      } catch (error) {
        console.error('Error refreshing profile data:', error);
        setState((prev) => ({ ...prev, loading: false }));
      }
    };

    refreshProfileData();
  }, [id]);

  const [blockState, setBlockState] = useState<BlockState>({
    isBlocked: false,
    isBlockedBy: false,
  });

  useEffect(() => {
    if (currentUser && id) {
      checkFollowStatus();
      fetchFollowCounts();
    }
  }, [currentUser, id]);

  const checkFollowStatus = async () => {
    if (!currentUser) return;
    try {
      // Query the "follows" table where current user is the follower and the viewed profile is being followed.
      const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', currentUser.id)
        .eq('followed_id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking follow status:', error);
        return;
      }
      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Fetch follower and following counts for the viewed profile.
  const fetchFollowCounts = async () => {
    try {
      // Follower count: how many users follow this profile.
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('followed_id', id);
      // Following count: how many users this profile follows.
      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', id);
      setFollowerCount(followers || 0);
      setFollowingCount(following || 0);
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  const navigateToFollowers = () => {
    router.push({
      pathname: '/profile/profile-followers/[id]',
      params: {
        id: id,
        username: username,
        subtitle: bio,
        image: image,
        fullName: fullName,
        website_url: website_url,
      },
    });
  };

  const navigateToFollowing = () => {
    router.push({
      pathname: '/profile/profile-following/[id]',
      params: {
        id: id,
        username: username,
        subtitle: bio,
        image: image,
        fullName: fullName,
        website_url: website_url,
      },
    });
  };

  const checkBlockStatus = async () => {
    if (!currentUser || !id) return;

    try {
      // Check if current user has blocked the profile
      const { data: blockedByMe } = await supabase
        .from('blocks')
        .select('*')
        .eq('blocker_id', currentUser.id)
        .eq('blocked_id', id)
        .single();

      // Check if profile has blocked current user
      const { data: blockedMe } = await supabase
        .from('blocks')
        .select('*')
        .eq('blocker_id', id)
        .eq('blocked_id', currentUser.id)
        .single();

      setBlockState({
        isBlocked: !!blockedByMe,
        isBlockedBy: !!blockedMe,
      });
    } catch (error) {
      console.error('Error checking block status:', error);
    }
  };

  const handleBlockUser = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to block users');
      return;
    }

    try {
      if (blockState.isBlocked) {
        // Unblock user
        const { error } = await supabase
          .from('blocks')
          .delete()
          .eq('blocker_id', currentUser.id)
          .eq('blocked_id', id);

        if (error) throw error;

        setBlockState((prev) => ({ ...prev, isBlocked: false }));
        Alert.alert('Success', 'User has been unblocked');
      } else {
        // Block user
        const { error } = await supabase.from('blocks').insert({
          blocker_id: currentUser.id,
          blocked_id: id,
        });

        if (error) throw error;

        setBlockState((prev) => ({ ...prev, isBlocked: true }));
        Alert.alert('Success', 'User has been blocked');

        // Unfollow if following
        if (isFollowing) {
          await handleFollowAction();
        }
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to update block status');
    }
  };

  console.log(postsData, followerCount, followingCount);

  // Add to useEffect
  useEffect(() => {
    if (currentUser && id) {
      checkBlockStatus();
    }
  }, [currentUser, id]);

  const handleFollowAction = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to follow users');
      return;
    }
    setLoading(true);
    try {
      if (isFollowing) {
        // Unfollow: delete from follows table.
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('followed_id', id);
        if (error) throw error;
        setIsFollowing(false);
        setHasUnfollowed(true);
        setFollowerCount((prev) => prev - 1);
      } else {
        // Follow: insert into follows table.
        const { error } = await supabase.from('follows').insert({
          follower_id: currentUser.id,
          followed_id: id,
        });
        if (error) throw error;
        setIsFollowing(true);
        setFollowerCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to send messages');
      return;
    }

    try {
      await createOrNavigateToChat(currentUser.id, {
        id,
        username,
        image,
        bio,
      });
    } catch (error) {
      console.error('Error creating chat:', error);
      Alert.alert('Error', 'Failed to create chat');
    }
  };

  const displayBio = bio || 'wowish';
  const displayUrl = website_url || 'https://blahblah.com';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <ProfileBackButton fill={'#000'} />
          </Pressable>

          <Pressable
            onPress={() => setModalVisible(true)}
            style={styles.pressableArea}
          >
            <ProfileOptions />
          </Pressable>
        </View>

        <View style={styles.profileUsername}>
          <ExpoImage source={{ uri: image }} style={styles.profileImage} />
          <View style={styles.profileUsernameColumn}>
            <Text style={styles.profileUname}>{username}</Text>
            <Text style={styles.profileBio}>{displayBio}</Text>
            <Pressable
              onPress={() => {
                const urlToOpen = website_url || displayUrl;
                if (urlToOpen) {
                  // Add http:// if the URL doesn't start with a protocol
                  const fullUrl = urlToOpen.startsWith('http')
                    ? urlToOpen
                    : `https://${urlToOpen}`;
                  Linking.openURL(fullUrl).catch(() =>
                    Alert.alert('Error', 'Could not open the website')
                  );
                }
              }}
            >
              <Text style={[styles.website]}>{website_url || displayUrl}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{postCount.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Blahs</Text>
          </View>
          <TouchableOpacity
            style={styles.statItem}
            onPress={navigateToFollowers}
          >
            <Text style={styles.statNumber}>{followerCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statItem}
            onPress={navigateToFollowing}
          >
            <Text style={styles.statNumber}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {blockState.isBlocked ? (
          <BlockBadge />
        ) : (
          <>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.button,
                  isFollowing ? styles.unfollowButton : styles.followButton,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleFollowAction}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.unffolow}>
                    {isFollowing
                      ? 'Unfollow'
                      : hasUnfollowed
                        ? 'Follow Back'
                        : 'Follow'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.messageButton]}
                onPress={handleMessage}
              >
                <Text style={styles.buttonText}>Message</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fullName}>{fullName}</Text>

            {isProfileLocked ? (
              <View style={styles.lock}>
                <ProfileLock />
                <Text style={styles.lockText}>Private Account</Text>
              </View>
            ) : (
              <GridPosts
                userId={id}
                isPersonalProfile={currentUser?.id === id}
              />
            )}
          </>
        )}

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
  container: {
    flex: 1,
  },
  website: {
    color: '#FF325E',
    fontFamily: 'InterMedium',
    fontSize: 12,
  },
  modalContainer: {
    borderWidth: 0,
    paddingLeft: 0,
    paddingRight: 0,
  },
  item: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
  },
  profileUsername: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginVertical: 20,
    alignSelf: 'center',
    alignContent: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
  },
  profileUsernameColumn: {
    marginLeft: 15,
  },
  profileUname: {
    fontSize: 20,
    fontFamily: 'InterSemiBold',
  },
  profileBio: {
    fontFamily: 'InterMedium',
    color: '#000',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  statItem: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  statNumber: {
    fontSize: 18,
    fontFamily: 'InterBold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'InterRegular',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  messageButton: {
    backgroundColor: '#fff',
  },
  followButton: {
    backgroundColor: '#fff',
  },
  unfollowButton: {
    backgroundColor: '#fff',
  },
  unffolow: {
    fontSize: 18,
    fontFamily: 'InterMedium',
    color: '#FF325E',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontFamily: 'InterMedium',
  },
  fullName: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 15,
    fontFamily: 'InterMedium',
  },
  lock: {
    alignItems: 'center',
    marginTop: 40,
  },
  lockText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
    fontFamily: 'InterMedium',
  },
  modalContent: {
    paddingLeft: 18,
    paddingRight: 37,
    marginTop: 48,
  },
  modalButton: {
    backgroundColor: '#B3B3B3',
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
  },
  modalButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'InterSemiBold',
  },
  pressableArea: {
    padding: 10,
  },
});

export default ProfileDetails;
