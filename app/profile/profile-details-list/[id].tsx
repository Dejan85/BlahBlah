import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';
import { useMessage } from '@/context/MessageContext';
import Header from '@/components/Header';
import UserListComponent from '@/components/UserListComponent';
import { User } from '@/types';
interface Follower extends User {
  created_at: string;
  isNewFollower?: boolean;
}

const ProfileDetailsList = () => {
  const { id, username } = useLocalSearchParams<{
    id: string;
    username: string;
  }>();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [, setLoading] = useState(true);
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { createOrNavigateToChat } = useMessage();

  const fetchFollowers = async () => {
    if (!id) return;

    try {
      const { data: followersData, error } = await supabase
        .from('friends')
        .select(
          '*, profiles!friends_user_id_fkey(id, username, avatar_url, bio)'
        )
        .eq('friend_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (followersData) {
        const processedFollowers: Follower[] = await Promise.all(
          followersData.map(async (follower) => {
            // Check if the current user is following this follower
            const { data: friendshipData } = await supabase
              .from('friends')
              .select('*')
              .eq('user_id', currentUser?.id)
              .eq('friend_id', follower.profiles.id)
              .single();

            // Check if there's a pending request
            const { data: pendingData } = await supabase
              .from('friend_requests')
              .select('*')
              .eq('sender_id', currentUser?.id)
              .eq('receiver_id', follower.profiles.id)
              .single();

            const requestStatus = friendshipData
              ? 'friend'
              : pendingData
                ? 'pending'
                : 'none';

            // Calculate if this is a new follower (within last 24h)
            const isNewFollower =
              new Date(follower.created_at) >
              new Date(Date.now() - 24 * 60 * 60 * 1000);

            return {
              id: follower.profiles.id,
              username: follower.profiles.username || '',
              image:
                follower.profiles.avatar_url ||
                'https://via.placeholder.com/150',
              bio: follower.profiles.bio || '',
              created_at: follower.created_at,
              requestStatus,
              isNewFollower,
            };
          })
        );
        console.log(processedFollowers);
        setFollowers(processedFollowers);
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowers();
  }, [id, currentUser]);

  const handleMessage = async (follower: User) => {
    if (!currentUser) return;
    try {
      await createOrNavigateToChat(currentUser.id, follower);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const handleFollow = async (follower: User) => {
    if (!currentUser) return;
    try {
      const { error } = await supabase.from('friend_requests').insert({
        sender_id: currentUser.id,
        receiver_id: follower.id,
      });

      if (error) throw error;

      // Update local state
      setFollowers(
        followers.map((f) =>
          f.id === follower.id ? { ...f, requestStatus: 'pending' } : f
        )
      );
    } catch (error) {
      console.error('Error sending follow request:', error);
    }
  };

  const handleUserPress = (user: User) => {
    router.push({
      pathname: '/profile/profile-details/[id]',
      params: {
        id: user.id,
        username: user.username,
        bio: user.bio,
        image: user.image,
        lockProfile: user.requestStatus === 'friend' ? 'false' : 'true',
      },
    });
  };

  const renderFollower = (follower: Follower) => ({
    ...follower,
    subtitle: follower.isNewFollower ? 'Newest Follower • 24h' : undefined,
    // Only show Message action if they are friends
    requestStatus:
      follower.requestStatus === 'friend' ? 'friend' : follower.requestStatus,
    shouldShowMessageOnly: follower.requestStatus === 'friend',
  });

  return (
    <View style={styles.safeArea}>
      <StatusBar
        translucent
        backgroundColor="#FF325E"
        barStyle="light-content"
      />
      <Header
        title={`${username}'s Followers`}
        onBackPress={() => router.back()}
      />
      <UserListComponent
        data={followers.map(renderFollower)}
        onItemPress={handleUserPress}
        isSearchAction={true}
        onMessageAction={handleMessage}
        onAddAction={handleFollow}
        isMessageAction={true}
        isAddAction={true}
        isBio={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
});

export default ProfileDetailsList;
