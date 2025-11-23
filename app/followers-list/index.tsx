import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  Animated,
  Text,
  Platform,
  ActivityIndicator,
} from "react-native";
import SearchComponent from "@/components/SearchComponent";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Header from "@/components/Header";
import { useRouter } from "expo-router";
import { runOnJS } from "react-native-reanimated";
import UserListComponent from "@/components/UserListComponent";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/context/AuthContext";
import { User } from "@/types";

// Set constants for search animation
const SEARCH_HEIGHT = 60;
const SWIPE_THRESHOLD = 50;

// Define the type for the joined profile data from the follows query
interface FollowerProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  full_name: string | null;
}

// Define the type for a record from the follows table
interface FollowerRecord {
  id: string;
  follower_id: string;
  followed_id: string;
  created_at: string;
  // The joined profile from the foreign key relationship on follower_id.
  follower_profile: FollowerProfile;
}

// Extend your User type with a requestStatus (here we'll hardcode it as "friend")
type Follower = User & {
  requestStatus: "friend";
};

const FollowersList: React.FC = () => {
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const searchOpacity = useRef(new Animated.Value(1)).current;
  const lastScrollPosition = useRef(0);
  const scrollDirection = useRef("");
  const isSearchHidden = useRef(false);

  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  // Function to fetch followers: those who follow the current user.
  const fetchFollowers = async () => {
    if (!currentUserId) return;

    try {
      setIsLoading(true);

      // Query the follows table where followed_id equals currentUserId.
      // We join the profiles table via the foreign key on follower_id,
      // and alias the joined data as "follower_profile".
      const { data: followersData, error: followersError } = await supabase
        .from("follows")
        .select(
          `
            id,
            follower_id,
            followed_id,
            created_at,
            follower_profile:profiles!follows_follower_id_fkey (
              id,
              username,
              avatar_url,
              bio,
              full_name
            )
            `,
        )
        .eq("followed_id", currentUserId);

      if (followersError) {
        console.error("Error fetching followers:", followersError);
        return;
      }

      // Transform the data into our Follower type.
      const transformedFollowers: Follower[] = [];
      const processedFollowerIds = new Set<string>();

      (followersData as unknown as FollowerRecord[])?.forEach((record) => {
        if (
          !record.follower_profile?.id ||
          processedFollowerIds.has(record.follower_profile.id)
        ) {
          return;
        }
        processedFollowerIds.add(record.follower_profile.id);
        transformedFollowers.push({
          id: record.follower_profile.id,
          username: record.follower_profile.username || "",
          image:
            record.follower_profile.avatar_url ||
            "https://via.placeholder.com/150",
          bio: record.follower_profile.bio || "",
          full_name: record.follower_profile.full_name || "",
          requestStatus: "friend",
        });
      });

      setFollowers(transformedFollowers);
    } catch (error) {
      console.error("Error in fetchFollowers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowers();

    // Subscribe to realtime changes in the follows table for the current user.
    const followersChannel = supabase
      .channel("followers-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "follows",
          filter: `followed_id=eq.${currentUserId} OR follower_id=eq.${currentUserId}`,
        },
        () => fetchFollowers(),
      )
      .subscribe();

    return () => {
      followersChannel.unsubscribe();
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

  const filteredFollowers = followers.filter((follower) =>
    follower.username?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        <StatusBar
          translucent
          backgroundColor="#FF325E"
          barStyle="light-content"
        />
        <Header title="Followers" onBackPress={handleBack} />
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
              <Text>Loading followers...</Text>
            </View>
          ) : followers.length === 0 ? (
            <View style={styles.centerContent}>
              <Text>No followers yet</Text>
            </View>
          ) : (
            <UserListComponent
              data={filteredFollowers}
              onItemPress={handleUserPress}
              onScroll={handleScroll}
              contentInset={SEARCH_HEIGHT}
              isSearchAction={true}
              isBio={true}
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
    backgroundColor: "#FFFFFF",
  },
  searchWrapper: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default FollowersList;
