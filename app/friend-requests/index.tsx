import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { runOnJS } from 'react-native-reanimated';
import Header from '@/components/Header';
import SearchComponent from '@/components/SearchComponent';
import UserListComponent from '@/components/UserListComponent';
import { useAuth } from '@/context/AuthContext';
import { User } from '@/types';
import { useFriendRequests } from '@/context/FriendRequestContext';

const SEARCH_HEIGHT = 60;
const SWIPE_THRESHOLD = 50;

const FriendRequests: React.FC = () => {
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const searchOpacity = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const lastScrollPosition = useRef(0);
  const scrollDirection = useRef('');
  const isSearchHidden = useRef(false);

  const [searchQuery, setSearchQuery] = useState('');

  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  const { friendRequests, updateRequestStatus } = useFriendRequests();

  console.log('Current follow requests:', friendRequests);

  // Transform follow requests to match User type.
  // We assume the related profile data comes in under the "profiles" key.
  const transformedRequests = friendRequests.map((request) => ({
    id: request.id,
    username: request.profiles?.username || '',
    image: request.profiles?.avatar_url || 'https://via.placeholder.com/150',
    subtitle: 'Wants to follow you',
    full_name: request.profiles?.full_name || '',
    // Using the new column name: follower_id
    follower_id: request.follower_id,
  }));

  // Filter requests based on search
  const filteredRequests = transformedRequests.filter((req) =>
    req.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleUserPress = (user: User) => {
    router.push({
      pathname: '/profile/profile-details/[id]',
      params: {
        id: user.id,
        username: user.username,
        subtitle: user.subtitle,
        image: user.image,
        fullName: user.full_name || '',
      },
    });
  };

  const handleAcceptRequest = async (user: User) => {
    try {
      await updateRequestStatus(user.id, 'accepted');
    } catch (error) {
      console.error('Error accepting follow request:', error);
    }
  };

  const handleDeclineRequest = async (user: User) => {
    try {
      await updateRequestStatus(user.id, 'denied');
    } catch (error) {
      console.error('Error declining follow request:', error);
    }
  };

  const handleGoNext = () => {
    router.push('/search-detailed');
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
        if (event.velocityX < -SWIPE_THRESHOLD) {
          runOnJS(handleGoNext)();
        }
      }),
    Gesture.Native()
  );

  if (!currentUserId) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.mainContainer}>
        <StatusBar
          translucent
          backgroundColor="#FF325E"
          barStyle="light-content"
        />
        <Header title="Follow requests" onBackPress={handleBack} />
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

          <UserListComponent
            data={filteredRequests}
            onItemPress={handleUserPress}
            onScroll={handleScroll}
            contentInset={SEARCH_HEIGHT}
            isAddAction={true}
            isFriendRequest={true}
            onAcceptAction={handleAcceptRequest}
            onDeclineAction={handleDeclineRequest}
          />
        </View>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mainContainer: {
    flex: 1,
  },
  searchWrapper: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FriendRequests;
