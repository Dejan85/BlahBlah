import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  Animated,
  Text,
  Platform,
} from "react-native";
import SearchComponent from "@/components/SearchComponent";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Header from "@/components/Header";
import { useRouter } from "expo-router";
import { User } from "@/types";
import { runOnJS } from "react-native-reanimated";
import UserListComponent from "@/components/UserListComponent";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/context/AuthContext";

const SEARCH_HEIGHT = 60;
const SWIPE_THRESHOLD = 50;

interface FriendProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  full_name: string | null; // Add this field
}

interface FriendshipRecord {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  friend_profile: FriendProfile;
}

type Friend = User & {
  requestStatus: "friend";
};

const FriendsList: React.FC = () => {
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const searchOpacity = useRef(new Animated.Value(1)).current;
  const lastScrollPosition = useRef(0);
  const scrollDirection = useRef("");
  const isSearchHidden = useRef(false);

  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  const handleMessageUser = async (user: User) => {
    if (!currentUserId) return;

    // Order IDs lexicographically to ensure consistency
    const sorted = [currentUserId, user.id].sort();
    const participant1_id = sorted[0];
    const participant2_id = sorted[1];

    // Check if conversation already exists
    const { data: existingConv, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .or(
        `and(participant1_id.eq.${participant1_id},participant2_id.eq.${participant2_id}),and(participant1_id.eq.${participant2_id},participant2_id.eq.${participant1_id})`,
      )
      .single();

    if (convError && convError.code !== "PGRST116") {
      console.error("Error checking conversation:", convError);
      return;
    }

    let conversationId = existingConv?.id;

    // If no conversation, create one
    if (!conversationId) {
      const { data: newConv, error: newConvError } = await supabase
        .from("conversations")
        .insert({
          participant1_id,
          participant2_id,
        })
        .select()
        .single();

      if (newConvError) {
        console.error("Error creating conversation:", newConvError);
        return;
      }

      conversationId = newConv.id;
    }

    // Navigate to chat-room
    router.push({
      pathname: "/chats/chat-room/[id]",
      params: {
        id: conversationId,
        username: user.username,
        bio: user.bio,
        image: user.image,
      },
    });
  };

  const fetchFriends = async () => {
    if (!currentUserId) return;

    try {
      setIsLoading(true);

      const { data: friendships, error: friendsError } = await supabase
        .from("friends")
        .select(
          `
          id,
          user_id,
          friend_id,
          created_at,
          friend_profile:profiles!friends_friend_id_fkey (
            id,
            username,
            avatar_url,
            bio,
            full_name
          )
        `,
        )
        .eq("user_id", currentUserId);

      if (friendsError) {
        console.error("Error fetching friends:", friendsError);
        return;
      }

      const transformedFriends: Friend[] = [];
      const processedFriendIds = new Set<string>();

      (friendships as unknown as FriendshipRecord[])?.forEach((friendship) => {
        if (
          !friendship.friend_profile?.id ||
          processedFriendIds.has(friendship.friend_profile.id)
        ) {
          return;
        }

        processedFriendIds.add(friendship.friend_profile.id);

        transformedFriends.push({
          id: friendship.friend_profile.id,
          username: friendship.friend_profile.username || "",
          image:
            friendship.friend_profile.avatar_url ||
            "https://via.placeholder.com/150",
          bio: friendship.friend_profile.bio || "",
          full_name: friendship.friend_profile.full_name || "", // Add this field
          requestStatus: "friend",
        });
      });

      setFriends(transformedFriends);
    } catch (error) {
      console.error("Error in fetchFriends:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();

    const friendsChannel = supabase
      .channel("friends-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friends",
          filter: `user_id=eq.${currentUserId} OR friend_id=eq.${currentUserId}`,
        },
        () => fetchFriends(),
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
        lockProfile: user.requestStatus === "friend" ? "false" : "true",
        fullName: user.full_name || "", // Add this field
      },
    });
  };

  const filteredFriends = friends.filter((friend) =>
    friend.username?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        <StatusBar
          translucent
          backgroundColor="#FF325E"
          barStyle="light-content"
        />
        <Header title="Friends" onBackPress={handleBack} />

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
              <Text>Loading friends...</Text>
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.centerContent}>
              <Text>No friends yet</Text>
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

export default FriendsList;
