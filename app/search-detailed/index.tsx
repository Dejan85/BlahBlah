import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Animated,
  StatusBar,
  Platform,
  Switch,
  Text,
  Alert,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { runOnJS } from "react-native-reanimated";
import Header from "@/components/Header";
import SearchComponent from "@/components/SearchComponent";
import UserListComponent from "@/components/UserListComponent";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/context/AuthContext";
import { useFriendRequests } from "@/context/FriendRequestContext";
import { User } from "@/types";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { UserWithDistance, NearbyUserData } from "@/types";
import { useMessage } from "@/context/MessageContext";
import { useLocation } from "@/hooks/useLocation";

const SEARCH_HEIGHT = 60;
const SWIPE_THRESHOLD = 50;

interface FriendRequestPayload {
  id: string;
  // Old names: requester_id & recipient_id; now they are:
  follower_id: string;
  followed_id: string;
  status: "pending" | "accepted" | "denied";
  created_at: string;
}

interface DatabaseChangePayload {
  commit_timestamp: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  schema: string;
  table: string;
  old: FriendRequestPayload | null;
  new: FriendRequestPayload | null;
}

type FriendRequestChanges = {
  id: string;
  follower_id: string;
  followed_id: string;
  status: "pending" | "accepted" | "denied";
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
  const {
    isLocationEnabled,
    toggleLocationSharing,
    startLocationUpdates,
    location,
  } = useLocation(currentUserId);

  // We will store normal search results in `filteredUsers` but if location is on, we'll store “nearby” data in `nearbyUsers`.
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<UserWithDistance[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // For the search bar animations
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const searchOpacity = useRef(new Animated.Value(1)).current;
  const lastScrollPosition = useRef(0);
  const scrollDirection = useRef("");
  const isSearchHidden = useRef(false);

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  const fetchData = async () => {
    if (!currentUserId) return;

    try {
      // Get all users except the current user
      const { data: allProfiles, error: allError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio, full_name, latitude, longitude")
        .neq("id", currentUserId);

      if (allError) {
        console.error("Error fetching users:", allError);
        return;
      }

      // Get all follow relationships (old "friends" logic) – adjust if you now use the follows table
      const { data: followsData, error: followsError } = await supabase
        .from("follows")
        .select("follower_id, followed_id")
        .or(`follower_id.eq.${currentUserId},followed_id.eq.${currentUserId}`);

      if (followsError) {
        console.error("Error fetching follows:", followsError);
        return;
      }

      // Create a set of IDs for the "other" users in the relationship
      const friendIds = new Set(
        followsData?.map((f) =>
          f.follower_id === currentUserId ? f.followed_id : f.follower_id,
        ),
      );

      // Updated: For follow requests, use new column names:
      const pendingRequestIds = new Set(
        pendingRequests.map((req) => req.followed_id),
      );
      const receivedRequestIds = new Set(
        friendRequests.map((req) => req.follower_id),
      );

      // Build the users list with status information
      let usersWithStatus = [];

      if (isLocationEnabled && location?.coords) {
        const currentLat = location.coords.latitude;
        const currentLng = location.coords.longitude;

        usersWithStatus =
          allProfiles?.map((u) => {
            let distance;
            if (u.latitude && u.longitude) {
              distance = calculateDistance(
                currentLat,
                currentLng,
                u.latitude,
                u.longitude,
              );
            }

            return {
              id: u.id,
              username: u.username,
              image: u.avatar_url ?? "https://via.placeholder.com/150",
              bio: u.bio ?? "",
              full_name: u.full_name ?? "",
              distance: distance,
              requestStatus: friendIds.has(u.id)
                ? "friend"
                : pendingRequestIds.has(u.id)
                  ? "pending"
                  : receivedRequestIds.has(u.id)
                    ? "received"
                    : "none",
            };
          }) || [];
      } else {
        usersWithStatus =
          allProfiles?.map((u) => ({
            id: u.id,
            username: u.username,
            image: u.avatar_url ?? "https://via.placeholder.com/150",
            bio: u.bio ?? "",
            full_name: u.full_name ?? "",
            requestStatus: friendIds.has(u.id)
              ? "friend"
              : pendingRequestIds.has(u.id)
                ? "pending"
                : receivedRequestIds.has(u.id)
                  ? "received"
                  : "none",
          })) || [];
      }

      setAllUsers(usersWithStatus);

      const filtered = usersWithStatus.filter((user) =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredUsers(filtered);
    } catch (error) {
      console.error("Error in fetchData:", error);
    }
  };

  // -------------- Fetch Nearby Users (if location is on) ---------------
  const fetchNearbyUsers = async () => {
    if (!currentUserId) return;

    try {
      const { data, error } = (await supabase.rpc("get_nearby_users", {
        user_id: currentUserId,
        radius_km: 10,
      })) as { data: NearbyUserData[] | null; error: any };

      if (error) {
        console.error("Error fetching nearby users:", error);
        return;
      }
      if (!data) return;

      const nearbyUserIds = data.map((item) => item.id);

      const { data: nearbyProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio, full_name")
        .in("id", nearbyUserIds);

      if (profilesError) {
        console.error("Error fetching nearby profiles:", profilesError);
        return;
      }
      if (!nearbyProfiles) return;

      const usersWithDistance: UserWithDistance[] = nearbyProfiles.map(
        (profile) => {
          const distanceData = data.find((d) => d.id === profile.id);
          return {
            id: profile.id,
            username: profile.username,
            image: profile.avatar_url ?? "https://via.placeholder.com/150",
            bio: profile.bio ?? "",
            full_name: profile.full_name ?? "",
            distance: distanceData?.distance,
            requestStatus: "none",
          };
        },
      );

      let filteredBySearch: UserWithDistance[] = usersWithDistance;
      if (searchQuery.trim().length > 0) {
        filteredBySearch = usersWithDistance.filter((user) =>
          user.username.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      }

      setNearbyUsers(filteredBySearch);
    } catch (error) {
      console.error("Error in fetchNearbyUsers:", error);
    }
  };

  // ----------------- effect: manage location updates & fetch nearby ------------
  useEffect(() => {
    if (isLocationEnabled) {
      const setupLocation = async () => {
        const subscription = await startLocationUpdates();
        await fetchNearbyUsers();
        return () => {
          subscription?.remove?.();
        };
      };
      setupLocation();
    }
  }, [isLocationEnabled]);

  useEffect(() => {
    if (location && isLocationEnabled) {
      // Optionally refresh nearby users on location change
    }
  }, [location, isLocationEnabled]);

  // -------------- Listen for follow request updates (denied, etc.) -------------
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("search-follow-status")
      .on(
        "postgres_changes" as const,
        {
          event: "*",
          schema: "public",
          table: "follow_requests",
          // For sent requests (initiated by current user), now use follower_id
          filter: `follower_id=eq.${currentUserId}`,
        },
        (payload: RealtimePostgresChangesPayload<FriendRequestChanges>) => {
          console.log("Follow request status change:", payload);
          if (
            payload.eventType === "UPDATE" &&
            payload.new.status === "denied"
          ) {
            // Update local state when a request is denied
            setAllUsers((prevUsers) =>
              prevUsers.map((user) =>
                user.id === payload.new.followed_id
                  ? { ...user, requestStatus: "none" }
                  : user,
              ),
            );
            setFilteredUsers((prevUsers) =>
              prevUsers.map((user) =>
                user.id === payload.new.followed_id
                  ? { ...user, requestStatus: "none" }
                  : user,
              ),
            );
          }
        },
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
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setFilteredUsers(filtered);

    if (isLocationEnabled) {
      const filteredNear = nearbyUsers.filter((u) =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setNearbyUsers(filteredNear);
    }
  }, [searchQuery]);

  // -------------- Follow Request: Add follow request -------------
  const handleAddFriend = async (targetUser: User) => {
    try {
      if (!currentUserId) return;

      // Check for existing follow requests in the new table using updated column names
      const { data: existingRequests, error: checkError } = await supabase
        .from("follow_requests")
        .select("*")
        .or(
          `and(follower_id.eq.${currentUserId},followed_id.eq.${targetUser.id}),` +
            `and(follower_id.eq.${targetUser.id},followed_id.eq.${currentUserId})`,
        )
        .eq("status", "pending");

      if (checkError) {
        console.error("Error checking existing follow requests:", checkError);
        return;
      }

      if (existingRequests && existingRequests.length > 0) {
        Alert.alert("Info", "Follow request is already pending.");
        return;
      }

      // Insert a new follow request using the new table and column names
      const { data: newRequest, error } = await supabase
        .from("follow_requests")
        .insert({
          follower_id: currentUserId,
          followed_id: targetUser.id,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding follow request:", error);
        return;
      }

      // Create a notification for the recipient
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          recipient_id: targetUser.id,
          type: "follow_request",
          payload: {
            follower_id: currentUserId,
          },
          is_read: false,
        });

      if (notificationError) {
        console.error("Error creating notification:", notificationError);
      }

      // Update local state immediately
      setAllUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === targetUser.id
            ? { ...user, requestStatus: "pending" }
            : user,
        ),
      );
      setFilteredUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === targetUser.id
            ? { ...user, requestStatus: "pending" }
            : user,
        ),
      );
    } catch (error) {
      console.error("Error in handleAddFriend:", error);
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
      scrollDirection.current = "down";

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
      scrollDirection.current = "up";

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
        "worklet";
        if (event.velocityX > SWIPE_THRESHOLD) {
          runOnJS(handleBack)();
        }
      }),
    Gesture.Native(),
  );

  console.log(isLocationEnabled, "location enabled");

  const handleUserPress = (user: User) => {
    router.push({
      pathname: "/profile/profile-details/[id]",
      params: {
        id: user.id,
        username: user.username,
        bio: user.bio,
        image: user.image,
        fullName: user.full_name || "",
        lockProfile: user.requestStatus === "friend" ? "false" : "true",
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
          isBio={isLocationEnabled ? false : true}
          isCloseBy={isLocationEnabled}
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
    backgroundColor: "#fff",
  },
  locationToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: Platform.OS === "android" ? 100 : 60,
  },
  locationToggleText: {
    fontSize: 16,
    marginRight: 8,
    color: "#000",
    fontFamily: "InterMedium",
  },
  myLocation: {
    fontSize: 14,
    color: "#FF325E",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    fontFamily: "InterMedium",
  },
  searchWrapper: {
    position: "absolute",
    top: Platform.OS === "android" ? 120 : 140,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
