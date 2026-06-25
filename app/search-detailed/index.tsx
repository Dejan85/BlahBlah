import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { runOnJS } from 'react-native-reanimated';
import Header from '@/components/Header';
import SearchComponent from '@/components/SearchComponent';
import UserListComponent from '@/components/UserListComponent';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';
import { useFriendRequests } from '@/context/FriendRequestContext';
import { User } from '@/types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useMessage } from '@/context/MessageContext';
import { useLocation } from '@/hooks/useLocation';
import { closeByUsers, CLOSE_BY_RADIUS_M } from '@/lib/closeBy';

const SEARCH_HEIGHT = 60;
const SWIPE_THRESHOLD = 50;

type FriendRequestChanges = {
  id: string;
  follower_id: string;
  followed_id: string;
  status: 'pending' | 'accepted' | 'denied';
  created_at: string;
};

const Search: React.FC = () => {
  const router = useRouter();
  const { createOrNavigateToChat } = useMessage();
  const { user: currentUser } = useAuth();
  // Note: the follow-requests data comes from the FriendRequestContext (updated to use the new table)
  const { pendingRequests, friendRequests } = useFriendRequests();
  const currentUserId = currentUser?.id;

  // -------- Location Hook & Data -----------
  const { isLocationEnabled, location } = useLocation(currentUserId);

  // Search results; when location is on, „Close By" korisnici (≤30m) se obeleže i diže na vrh.
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // For the search bar animations
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const searchOpacity = useRef(new Animated.Value(1)).current;
  const lastScrollPosition = useRef(0);
  const scrollDirection = useRef('');
  const isSearchHidden = useRef(false);

  const fetchData = async () => {
    if (!currentUserId) return;

    try {
      // Get all users except the current user (geo polja za Close-By, T3.19)
      const { data: allProfiles, error: allError } = await supabase
        .from('profiles')
        .select(
          'id, username, avatar_url, bio, full_name, latitude, longitude, location_enabled'
        )
        .neq('id', currentUserId);

      if (allError) {
        console.error('Error fetching users:', allError);
        return;
      }

      // Get all follow relationships (old "friends" logic) – adjust if you now use the follows table
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select('follower_id, followed_id')
        .or(`follower_id.eq.${currentUserId},followed_id.eq.${currentUserId}`);

      if (followsError) {
        console.error('Error fetching follows:', followsError);
        return;
      }

      // Create a set of IDs for the "other" users in the relationship
      const friendIds = new Set(
        followsData?.map((f) =>
          f.follower_id === currentUserId ? f.followed_id : f.follower_id
        )
      );

      // Updated: For follow requests, use new column names:
      const pendingRequestIds = new Set(
        pendingRequests.map((req) => req.followed_id)
      );
      const receivedRequestIds = new Set(
        friendRequests.map((req) => req.follower_id)
      );

      const requestStatusFor = (id: string) =>
        friendIds.has(id)
          ? 'friend'
          : pendingRequestIds.has(id)
            ? 'pending'
            : receivedRequestIds.has(id)
              ? 'received'
              : 'none';

      // --- Close-By (T3.19): blizina kroz lib/closeBy (geo math ostaje u lib/).
      // Supabase upit gore nosi koordinate + location_enabled; uzimamo SAMO korisnike
      // koji dele lokaciju i imaju validne koordinate, pa closeByUsers filtrira na
      // radijus 20–30m (default 30m) i sortira po rastojanju. Bez moje lokacije → prazno.
      const closeByMap = new Map<string, number>();
      if (isLocationEnabled && location?.coords) {
        const candidates = (allProfiles ?? [])
          .filter(
            (u) =>
              u.location_enabled && u.latitude != null && u.longitude != null
          )
          .map((u) => ({
            id: u.id,
            latitude: u.latitude as number,
            longitude: u.longitude as number,
          }));

        for (const near of closeByUsers(
          {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          candidates,
          CLOSE_BY_RADIUS_M
        )) {
          closeByMap.set(near.id, near.distanceM);
        }
      }

      const usersWithStatus: User[] = (allProfiles ?? []).map((u) => ({
        id: u.id,
        username: u.username,
        image: u.avatar_url ?? 'https://via.placeholder.com/150',
        bio: u.bio ?? '',
        full_name: u.full_name ?? '',
        requestStatus: requestStatusFor(u.id),
        isCloseBy: closeByMap.has(u.id),
        distanceM: closeByMap.get(u.id),
      }));

      // „Close By" korisnici prvi (rastuće po rastojanju); ostali zadržavaju redosled
      // (stabilan sort: Infinity − Infinity = 0).
      usersWithStatus.sort(
        (a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity)
      );

      setAllUsers(usersWithStatus);

      const filtered = usersWithStatus.filter((user) =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } catch (error) {
      console.error('Error in fetchData:', error);
    }
  };

  // ----- effect: Close-By se osvežava kad se promeni moja lokacija/toggle -----
  // (useLocation hook već interno pokreće praćenje pozicije; ovde samo re-fetch
  // da bi closeByMap u fetchData dobio sveže koordinate.)
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, isLocationEnabled]);

  // -------------- Listen for follow request updates (denied, etc.) -------------
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('search-follow-status')
      .on(
        'postgres_changes' as const,
        {
          event: '*',
          schema: 'public',
          table: 'follow_requests',
          // For sent requests (initiated by current user), now use follower_id
          filter: `follower_id=eq.${currentUserId}`,
        },
        (payload: RealtimePostgresChangesPayload<FriendRequestChanges>) => {
          console.log('Follow request status change:', payload);
          if (
            payload.eventType === 'UPDATE' &&
            payload.new.status === 'denied'
          ) {
            // Update local state when a request is denied
            setAllUsers((prevUsers) =>
              prevUsers.map((user) =>
                user.id === payload.new.followed_id
                  ? { ...user, requestStatus: 'none' }
                  : user
              )
            );
            setFilteredUsers((prevUsers) =>
              prevUsers.map((user) =>
                user.id === payload.new.followed_id
                  ? { ...user, requestStatus: 'none' }
                  : user
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentUserId]);

  // -------------- Initial + subsequent data fetch -----------
  useEffect(() => {
    fetchData();
  }, [currentUserId, pendingRequests, friendRequests]);

  // -------------- If user toggles search query ------------
  useEffect(() => {
    const filtered = allUsers.filter((user) =>
      user.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // -------------- Follow Request: Add follow request -------------
  const handleAddFriend = async (targetUser: User) => {
    try {
      if (!currentUserId) return;

      // Check for existing follow requests in the new table using updated column names
      const { data: existingRequests, error: checkError } = await supabase
        .from('follow_requests')
        .select('*')
        .or(
          `and(follower_id.eq.${currentUserId},followed_id.eq.${targetUser.id}),` +
            `and(follower_id.eq.${targetUser.id},followed_id.eq.${currentUserId})`
        )
        .eq('status', 'pending');

      if (checkError) {
        console.error('Error checking existing follow requests:', checkError);
        return;
      }

      if (existingRequests && existingRequests.length > 0) {
        Alert.alert('Info', 'Follow request is already pending.');
        return;
      }

      // Insert a new follow request using the new table and column names
      const { error } = await supabase
        .from('follow_requests')
        .insert({
          follower_id: currentUserId,
          followed_id: targetUser.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding follow request:', error);
        return;
      }

      // Create a notification for the recipient
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          recipient_id: targetUser.id,
          type: 'follow_request',
          payload: {
            follower_id: currentUserId,
          },
          is_read: false,
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      // Update local state immediately
      setAllUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === targetUser.id
            ? { ...user, requestStatus: 'pending' }
            : user
        )
      );
      setFilteredUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === targetUser.id
            ? { ...user, requestStatus: 'pending' }
            : user
        )
      );
    } catch (error) {
      console.error('Error in handleAddFriend:', error);
    }
  };

  // -------------- Send message to user -------------
  const handleMessageUser = async (targetUser: User) => {
    if (!currentUserId) return;
    await createOrNavigateToChat(currentUserId, targetUser);
  };

  // -------------- Animate search bar on scroll -------------
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

  console.log(isLocationEnabled, 'location enabled');

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

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        <StatusBar
          translucent
          backgroundColor="#FF325E"
          barStyle="light-content"
        />
        <Header title="Search" onBackPress={() => router.back()} />
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
          data={filteredUsers}
          onItemPress={handleUserPress}
          onScroll={handleScroll}
          contentInset={SEARCH_HEIGHT}
          isSearchAction={true}
          isAddAction={true}
          isMessageAction={true}
          onAddAction={handleAddFriend}
          onMessageAction={handleMessageUser}
        />
      </View>
    </GestureDetector>
  );
};

export default Search;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  locationToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: Platform.OS === 'android' ? 100 : 60,
  },
  locationToggleText: {
    fontSize: 16,
    marginRight: 8,
    color: '#000',
    fontFamily: 'InterMedium',
  },
  myLocation: {
    fontSize: 14,
    color: '#FF325E',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    fontFamily: 'InterMedium',
  },
  searchWrapper: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 120 : 140,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
