import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PostUserInfoProps } from '@/types';
import { supabase } from '@/utils';
import { useAuth } from '@/context/AuthContext';

const formatTimestamp = (timestamp: string) => {
  const now = new Date();
  const postDate = new Date(timestamp);
  const diffInHours = Math.abs(now.getTime() - postDate.getTime()) / 36e5;

  if (diffInHours < 24) {
    return 'Today';
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }
};

export const PostUserInfo: React.FC<PostUserInfoProps> = ({
  username,
  profilePhoto,
  comments,
  hashtags,
  music,
  createdAt,
  userId,
}) => {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const navigateToProfile = async () => {
    if (!userId) {
      console.error('User ID is undefined');
      return;
    }

    // Own post → own profile screen (index.tsx, loads from auth); skip fetch.
    if (userId === currentUser?.id) {
      router.push('/profile');
      return;
    }

    try {
      const [profileResponse, followersCount, followingCount] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).single(),
          supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('followed_id', userId),
          supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', userId),
        ]);

      if (profileResponse.error) throw profileResponse.error;

      const profileData = {
        ...profileResponse.data,
        followers_count: followersCount.count || 0,
        following_count: followingCount.count || 0,
      };

      router.push({
        pathname: '/profile/profile-details/[id]',
        params: {
          id: userId,
          username: profileData.username || username,
          image: profileData.avatar_url || profilePhoto,
          bio: profileData.bio || '',
          lockProfile: 'false',
          fullName: profileData.full_name || '',
          website_url: profileData.website_url || '',
          followers_count: String(profileData.followers_count),
          following_count: String(profileData.following_count),
        },
      });
    } catch (error) {
      console.error('Error fetching profile data:', error);
      router.push({
        pathname: '/profile/profile-details/[id]',
        params: {
          id: userId,
          username: username,
          image: profilePhoto,
          bio: '',
          lockProfile: 'false',
          fullName: '',
          website_url: '',
        },
      });
    }
  };

  return (
    <>
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        style={styles.topGradient}
      >
        <Text style={styles.timestamp}>{formatTimestamp(createdAt)}</Text>
      </LinearGradient>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.bottomGradient}
      >
        <View style={styles.container}>
          <View style={styles.userContainer}>
            <TouchableOpacity onPress={navigateToProfile}>
              <Image
                source={{ uri: profilePhoto }}
                style={styles.profilePhoto}
              />
            </TouchableOpacity>

            <View style={styles.textContainer}>
              <Text style={styles.username} onPress={navigateToProfile}>
                {username}
              </Text>
              <Text style={styles.comments}>{comments}</Text>
              <Text style={styles.hashtags}>{hashtags}</Text>
            </View>
          </View>
        </View>

        {music && (
          <View style={styles.musicContainer}>
            <Ionicons name="play" size={15} color="white" />
            <Text style={styles.musicText}>{music}</Text>
          </View>
        )}
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  timestamp: {
    position: 'absolute',
    left: 26,
    top: 70,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'InterBold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    zIndex: 11,
    overflow: 'hidden',
  },
  container: {
    marginLeft: 30,
    width: '50%',
    marginBottom: 110,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profilePhoto: {
    width: 45,
    height: 45,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textContainer: {
    flexDirection: 'column',
    paddingLeft: 15,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  username: {
    fontFamily: 'InterBold',
    fontSize: 18,
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  musicContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 30,
  },
  musicText: {
    fontFamily: 'InterBold',
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  comments: {
    fontFamily: 'InterBold',
    fontSize: 12,
    color: '#fff',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  hashtags: {
    fontFamily: 'InterBold',
    fontSize: 12,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
