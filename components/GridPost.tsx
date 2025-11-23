// components/GridPosts.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Dimensions,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  StatusBar,
  Alert,
  Pressable,
  Platform,
} from "react-native";
import SettingItem from "./SettingItem";
import { Image } from "expo-image";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  withSpring,
  runOnJS,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase";
import Post from "@/components/Post";
import { FeedItem } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import CustomButton from "./CustomButton";
import Text from "./CustomText";
import BottomModal from "./BottomModal";
import {
  DeleteAction,
  NoComments,
  NoLikes,
  NoShares,
  RedBunny,
} from "@/assets/images";
import { ResizeMode, Video } from "expo-av";
import { RealtimeChannel } from "@supabase/supabase-js";

const { width, height } = Dimensions.get("window");
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;
const SWIPE_THRESHOLD = 50;
const SWIPE_ZONE_WIDTH = width * 0.1; // 20% of screen width for swipe zone

interface GridPostsProps {
  userId: string | undefined;
  isPersonalProfile?: boolean;
}

export interface GridPost {
  id: string;
  uri: string;
  type: "video" | "image";
  images?: string[];
  user?: {
    id: string;
    username: string;
    profilePhoto: string;
  };
  createdAt: string;
  music?: string;
  hashtags?: string[];
  hide_likes?: boolean; // Changed from hideLikes
  hide_shares?: boolean; // Changed from hideShares
  hide_comments?: boolean; // Changed from hideComments
}

const VideoThumbnail = ({ uri }: { uri: string }) => {
  return (
    <View style={styles.thumbnailContainer}>
      <Video
        source={{ uri }}
        style={styles.thumbnailVideo}
        shouldPlay={false}
        isMuted={true}
        resizeMode={ResizeMode.COVER}
        usePoster={true}
        posterSource={{ uri }}
      />
      <View style={styles.videoOverlay}>
        <MaterialCommunityIcons
          name="play-circle"
          size={32}
          color="white"
          style={styles.playIcon}
        />
      </View>
    </View>
  );
};

const GridPosts: React.FC<GridPostsProps> = ({
  userId,
  isPersonalProfile = false,
}) => {
  const [posts, setPosts] = useState<GridPost[]>([]);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const router = useRouter();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [isInSwipeZone, setIsInSwipeZone] = useState(false);
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const realtimeChannel = useRef<RealtimeChannel | null>(null);

  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [hideLikes, setHideLikes] = useState(false);
  const [hideComments, setHideComments] = useState(false);
  const [hideShares, setHideShares] = useState(false);
  const [lockPost, setLockPost] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchPosts();
    }
  }, [userId]);

  useEffect(() => {
    const fetchPostSettings = async () => {
      if (currentPostId) {
        const { data, error } = await supabase
          .from("posts")
          .select("hide_likes, hide_shares, hide_comments")
          .eq("id", currentPostId)
          .single();

        if (!error && data) {
          setHideLikes(data.hide_likes);
          setHideShares(data.hide_shares);
          setHideComments(data.hide_comments);
        }
      }
    };

    if (actionsModalVisible && selectedPostIndex !== null) {
      const post = posts[selectedPostIndex];
      setCurrentPostId(post.id);
      fetchPostSettings();
    }
  }, [actionsModalVisible, selectedPostIndex]);

  useEffect(() => {
    if (!userId) return;

    realtimeChannel.current = supabase
      .channel("posts-channel")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "posts",
          filter: `profile_id=eq.${userId}`,
        },
        (payload) => {
          setPosts((currentPosts) =>
            currentPosts.map((post) =>
              post.id === payload.new.id
                ? {
                    ...post,
                    hide_likes: payload.new.hide_likes,
                    hide_shares: payload.new.hide_shares,
                    hide_comments: payload.new.hide_comments,
                  }
                : post,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
      }
    };
  }, [userId]);

  const handleHideLikes = async (value: boolean) => {
    if (!currentPostId) return;

    setHideLikes(value);
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === currentPostId ? { ...post, hide_likes: value } : post,
      ),
    );

    try {
      const { error } = await supabase
        .from("posts")
        .update({ hide_likes: value })
        .eq("id", currentPostId);

      if (error) throw error;
    } catch (error) {
      setHideLikes(!value); // Revert change if failed
    }
  };

  const handleHideShares = async (value: boolean) => {
    if (!currentPostId) return;

    // Update local state immediately
    setHideShares(value);
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === currentPostId
          ? {
              ...post,
              hide_shares: value,
            }
          : post,
      ),
    );

    try {
      const { error } = await supabase
        .from("posts")
        .update({ hide_shares: value })
        .eq("id", currentPostId);

      if (error) throw error;
    } catch (error) {
      // Revert local state if update fails
      setHideShares(!value);
      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === currentPostId
            ? {
                ...post,
                hide_shares: !value,
              }
            : post,
        ),
      );
      console.error("Error updating hide shares:", error);
      Alert.alert("Error", "Failed to update shares visibility");
    }
  };

  const handleHideComments = async (value: boolean) => {
    if (!currentPostId) return;

    // Update local state immediately
    setHideComments(value);
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === currentPostId
          ? {
              ...post,
              hide_comments: value,
            }
          : post,
      ),
    );

    try {
      const { error } = await supabase
        .from("posts")
        .update({ hide_comments: value })
        .eq("id", currentPostId);

      if (error) throw error;
    } catch (error) {
      // Revert local state if update fails
      setHideComments(!value);
      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === currentPostId
            ? {
                ...post,
                hide_comments: !value,
              }
            : post,
        ),
      );
      console.error("Error updating hide comments:", error);
      Alert.alert("Error", "Failed to update comments visibility");
    }
  };

  const handleDelete = async () => {
    setActionsModalVisible(false);

    if (!selectedPostIndex) return;

    Alert.alert(
      "Delete Post",
      "Are you sure?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: async () => {
            try {
              const currentPost = posts[selectedPostIndex];
              const { error } = await supabase
                .from("posts")
                .delete()
                .eq("id", currentPost.id);

              if (error) throw error;

              // Remove post from state
              setPosts((currentPosts) =>
                currentPosts.filter((post) => post.id !== currentPost.id),
              );

              if (posts.length === 1) {
                setIsModalVisible(false);
              }
            } catch (error) {
              Alert.alert("Error", "Failed to delete post. Please try again.");
            }
          },
          style: "destructive",
        },
      ],
      { cancelable: true },
    );
  };

  const fetchPosts = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data: postsData, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          profile:profiles (
            id,
            username,
            avatar_url
          )
        `,
        )
        .eq("profile_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformedPosts: GridPost[] = (postsData || []).map((post) => ({
        id: post.id,
        uri: post.main_media_url,
        type: post.media_type as "video" | "image",
        images:
          post.media_type === "image"
            ? [post.main_media_url, ...(post.additional_media || [])]
            : undefined,
        user: post.profile
          ? {
              id: post.profile.id,
              username: post.profile.username,
              profilePhoto: post.profile.avatar_url,
            }
          : undefined,
        createdAt: post.created_at,
        music: post.music,
        hashtags: post.hashtags,
        hideLikes: post.hide_likes,
        hideShares: post.hide_shares,
        hideComments: post.hide_comments,
      }));

      setPosts(transformedPosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePress = (userId?: string) => {
    if (!userId) return;
    router.push({
      pathname: "/profile",
      params: { id: userId },
    });
  };

  // const handleProfilePress = (userId?: string) => {
  //     if (!userId) return;
  //     // Push to the dynamic profile page
  //     router.push({
  //       pathname: `app/profile/test/[id]`,
  //       params: { id: userId },
  //     });
  //   };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedPostIndex(null);
  };

  const leftZoneGesture = Gesture.Pan()
    .onBegin((event) => {
      "worklet";
      if (event.x <= SWIPE_ZONE_WIDTH) {
        runOnJS(setIsInSwipeZone)(true);
      }
    })
    .onUpdate((event) => {
      "worklet";
      if (isInSwipeZone && event.translationX > 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      "worklet";
      if (event.translationX > SWIPE_THRESHOLD && isInSwipeZone) {
        runOnJS(closeModal)();
      }
      translateX.value = withSpring(0);
      runOnJS(setIsInSwipeZone)(false);
    });

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const renderGridItem = ({
    item,
    index,
  }: {
    item: GridPost;
    index: number;
  }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedPostIndex(index);
        setIsModalVisible(true);
      }}
      style={styles.gridItem}
    >
      {item.type === "video" ? (
        <VideoThumbnail uri={item.uri} />
      ) : (
        <Image
          source={{ uri: item.uri }}
          style={styles.gridImage}
          contentFit="cover"
        />
      )}
      <View style={styles.timestampContainer}>
        <Text style={styles.timestamp}>{formatTimestamp(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFullScreenPosts = () => (
    <Modal
      visible={isModalVisible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={closeModal}
    >
      <View style={styles.modalContainer}>
        <GestureDetector gesture={leftZoneGesture}>
          <Animated.View style={[styles.fullScreenContainer, animatedStyle]}>
            <StatusBar barStyle="light-content" />
            <View style={styles.leftSwipeZone} pointerEvents="none" />

            <FlatList
              data={posts}
              initialScrollIndex={selectedPostIndex}
              onScrollToIndexFailed={() => {}}
              renderItem={({ item, index }) => (
                <Post
                  item={
                    {
                      ...item,
                      type: item.type,
                      comments: [],
                      hide_likes: item.hide_likes, // These should match your database column names
                      hide_shares: item.hide_shares,
                      hide_comments: item.hide_comments,
                    } as FeedItem
                  }
                  index={index}
                  isVisible={index === selectedPostIndex}
                  isOwnProfile={isPersonalProfile}
                />
              )}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              snapToInterval={height}
              decelerationRate="fast"
              onMomentumScrollEnd={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.y / height,
                );
                setSelectedPostIndex(index);
              }}
              keyExtractor={(item) => item.id}
              getItemLayout={(data, index) => ({
                length: height,
                offset: height * index,
                index,
              })}
            />

            {isPersonalProfile && (
              <Pressable
                style={styles.actionButton}
                onPress={() => setActionsModalVisible(true)}
              >
                <MaterialCommunityIcons
                  name="dots-vertical"
                  color={"#fff"}
                  size={24}
                />
              </Pressable>
            )}

            <CustomButton
              variant="primary"
              size="sm"
              style={styles.blahButton}
              onPress={() => router.push("/blahs")}
            >
              <Text variant="body" weight="semibold" color="#fff">
                Blahs
              </Text>
            </CustomButton>
          </Animated.View>
        </GestureDetector>

        <BottomModal
          visible={actionsModalVisible}
          onClose={() => setActionsModalVisible(false)}
          height={height * 0.5}
          line={false}
          modalStyle={styles.modalStyle}
        >
          <View style={styles.actionsContainer}>
            <SettingItem
              value={hideLikes}
              title="Hide Likes"
              onValueChange={handleHideLikes}
              icon={<NoLikes />}
            />
            <SettingItem
              value={hideShares}
              title="Hide Shares"
              onValueChange={handleHideShares}
              icon={<NoShares />}
            />
            <SettingItem
              value={hideComments}
              title="Hide Comments"
              onValueChange={handleHideComments}
              icon={<NoComments />}
            />
            <SettingItem
              value={lockPost}
              title="Lock Post"
              onValueChange={setLockPost}
              subtitle="Post remain visible even after 24 hours (3 posts max)"
              icon={<RedBunny />}
            />
          </View>

          <Pressable style={styles.deleteAction} onPress={handleDelete}>
            <DeleteAction fill={"#FF325E"} />
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </BottomModal>
      </View>
    </Modal>
  );

  if (loading) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        numColumns={COLUMN_COUNT}
        renderItem={renderGridItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.gridContainer}
      />
      {renderFullScreenPosts()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  thumbnailContainer: {
    width: "99%",
    height: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  thumbnailVideo: {
    width: "100%",
    height: "100%",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  playIcon: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  gridContainer: {
    padding: 1,
  },
  blahText: {},
  actionsContainer: {
    marginTop: 45,
  },
  timestampContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timestamp: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "InterMedium",
  },
  gridItem: {
    width: ITEM_SIZE - 2,
    height: ITEM_SIZE - 2,
    margin: 1,
    borderRadius: 12,
    overflow: "hidden", // This ensures the image respects the border radius
  },
  gridImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  modalStyle: {
    borderWidth: 0,
  },
  actionButton: {
    borderRadius: 20,
    position: "absolute",
    right: 30,
    top: 70,
    zIndex: 11,
  },
  blahButton: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 150 : 140,
    right: 24,
    backgroundColor: "#FF325E",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 40,
    width: 82,
    height: 48,
    zIndex: 11,
  },
  deleteAction: {
    flexDirection: "row",
    marginLeft: 50,
    marginTop: 50,
  },
  deleteText: {
    fontFamily: "InterMedium",
    fontSize: 15,
    marginTop: -3,
    marginLeft: 18,
    color: "#FF325E",
  },

  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  leftSwipeZone: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_ZONE_WIDTH,
    zIndex: 10,
  },
});

export default GridPosts;
