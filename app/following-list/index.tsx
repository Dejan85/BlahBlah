import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, Animated, Text } from 'react-native';
import SearchComponent from '@/components/SearchComponent';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Header from '@/components/Header';
import { useRouter } from 'expo-router';
import { runOnJS } from 'react-native-reanimated';
import UserListComponent from '@/components/UserListComponent';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';
import { User } from '@/types';

const SEARCH_HEIGHT = 60;
const SWIPE_THRESHOLD = 50;

// Define a type for the joined profile data from the follows query
interface FriendProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  full_name: string | null;
}

interface FollowingRecord {
  id: string;
  follower_id: string;
  followed_id: string;
  created_at: string;
  followed_profile: FriendProfile;
}

// We’ll use the Friend type from your types (or extend User)
type Friend = User & {
  requestStatus: 'friend'; // indicating that this is a following relationship
};

const FollowingList: React.FC = () => {
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const searchOpacity = useRef(new Animated.Value(1)).current;
  const lastScrollPosition = useRef(0);
  const scrollDirection = useRef('');
  const isSearchHidden = useRef(false);

  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  // Function to handle messaging (unchanged)
  const handleMessageUser = async (user: User) => {
    if (!currentUserId) return;

    // Order IDs lexicographically to ensure consistency
    const sorted = [currentUserId, user.id].sort();
    const participant1_id = sorted[0];
    const participant2_id = sorted[1];

    // Check if conversation already exists
    const { data: existingConv, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .or(
        `and(participant1_id.eq.${participant1_id},participant2_id.eq.${participant2_id}),and(participant1_id.eq.${participant2_id},participant2_id.eq.${participant1_id})`
      )
      .single();

    if (convError && convError.code !== 'PGRST116') {
      console.error('Error checking conversation:', convError);
      return;
    }

    let conversationId = existingConv?.id;

    // If no conversation, create one
    if (!conversationId) {
      const { data: newConv, error: newConvError } = await supabase
        .from('conversations')
        .insert({
          participant1_id,
          participant2_id,
        })
        .select()
        .single();

      if (newConvError) {
        console.error('Error creating conversation:', newConvError);
        return;
      }

      conversationId = newConv.id;
    }

    // Navigate to chat-room
    router.push({
      pathname: '/chats/chat-room/[id]',
      params: {
        id: conversationId,
        username: user.username,
        bio: user.bio,
        image: user.image,
      },
    });
  };

  // Fetch following relationships from the new follows table
  const fetchFollowing = async () => {
    if (!currentUserId) return;

    try {
      setIsLoading(true);

      // Query the follows table where current user is the follower
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select(
          `
            id,
            follower_id,
            followed_id,
            created_at,
            followed_profile:profiles!follows_followed_id_fkey (
              id,
              username,
              avatar_url,
              bio,
              full_name
            )
            `
        )
        .eq('follower_id', currentUserId);

      if (followsError) {
        console.error('Error fetching following:', followsError);
        return;
      }

      // Transform the data into our Friend type. Use the joined alias "followed_profile".
      const transformedFollowing: Friend[] = [];
      const processedFollowingIds = new Set<string>();

      (followsData as unknown as FollowingRecord[])?.forEach((follow) => {
        if (
          !follow.followed_profile?.id ||
          processedFollowingIds.has(follow.followed_profile.id)
        ) {
          return;
        }
        processedFollowingIds.add(follow.followed_profile.id);
        transformedFollowing.push({
          id: follow.followed_profile.id,
          username: follow.followed_profile.username || '',
          image:
            follow.followed_profile.avatar_url ||
            'https://via.placeholder.com/150',
          bio: follow.followed_profile.bio || '',
          full_name: follow.followed_profile.full_name || '',
          requestStatus: 'friend',
        });
      });

      setFriends(transformedFollowing);
    } catch (error) {
      console.error('Error in fetchFollowing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowing();

    // Subscribe to changes on the follows table for current user
    const friendsChannel = supabase
      .channel('follows-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `follower_id=eq.${currentUserId} OR followed_id=eq.${currentUserId}`,
        },
        () => fetchFollowing()
      )
      .subscribe();

    return () => {
      friendsChannel.unsubscribe();
    };
  }, [currentUserId]);

  const handleScroll = (event: any) => {
    const currentScrollPosition = event.nativeEvent.contentOffset.y;
    const isScrollingDown = currentScrollPosition > lastScrollPosition.current;
    const isScrollingUp = currentScrollPosition < lastScrollPosition.current;
    const hasScrolledEnough =
      Math.abs(currentScrollPosition - lastScrollPosition.current) > 10;

    if (isScrollingDown && hasScrolledEnough && !isSearchHidden.current) {
      isSearchHidden.current = true;
      scrollDirection.current = 'down';

      Animated.sequence([
        Animated.timing(searchAnimation, {
          toValue: -20,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(searchAnimation, {
            toValue: -SEARCH_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(searchOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else if (isScrollingUp && hasScrolledEnough && isSearchHidden.current) {
      isSearchHidden.current = false;
      scrollDirection.current = 'up';

      Animated.sequence([
        Animated.parallel([
          Animated.timing(searchAnimation, {
            toValue: -20,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(searchOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(searchAnimation, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }

    lastScrollPosition.current = currentScrollPosition;
  };

  const handleBack = () => {
    router.back();
  };

  const gesture = Gesture.Race(
    Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-10, 10])
      .onEnd((event) => {
        'worklet';
        if (event.velocityX > SWIPE_THRESHOLD) {
          runOnJS(handleBack)();
        }
      }),
    Gesture.Native()
  );

  const handleUserPress = (user: User) => {
    router.push({
      pathname: '/profile/profile-details/[id]',
      params: {
        id: user.id,
        username: user.username,
        bio: user.bio,
        image: user.image,
        fullName: user.full_name || '',
        lockProfile: user.requestStatus === 'friend' ? 'false' : 'true',
      },
    });
  };

  const filteredFriends = friends.filter((friend) =>
    friend.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        <StatusBar
          translucent
          backgroundColor="#FF325E"
          barStyle="light-content"
        />
        <Header title="Following" onBackPress={handleBack} />

        <View style={styles.container}>
          <Animated.View
            style={[
              styles.searchWrapper,
              {
                transform: [{ translateY: searchAnimation }],
                opacity: searchOpacity,
              },
            ]}
          >
            <SearchComponent
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </Animated.View>

          {isLoading ? (
            <View style={styles.centerContent}>
              <Text>Loading following...</Text>
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.centerContent}>
              <Text>You are not following anyone yet.</Text>
            </View>
          ) : (
            <UserListComponent
              data={filteredFriends}
              onItemPress={handleUserPress}
              onScroll={handleScroll}
              isSearchAction={true}
              contentInset={SEARCH_HEIGHT}
              isBio={true}
              onMessageAction={handleMessageUser}
              isMessageAction={true}
            />
          )}
        </View>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchWrapper: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FollowingList;
