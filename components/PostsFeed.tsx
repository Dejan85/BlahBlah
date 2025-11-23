import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { FeedItem } from "@/types";
import Post from "./Post";
import { usePost, Post as PostType } from "@/context/PostContext";
import { supabase } from "@/utils";
import { ImagePrefetchOptions } from "expo-image";
// Dummy data
import { Image } from "expo-image";

interface PostListProps {
  onRefresh?: () => Promise<void>;
}

const PostFeed: React.FC<PostListProps> = ({ onRefresh }) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const { getProfilePosts } = usePost();

  const listRef = useRef<FlatList<FeedItem> | null>(null);
  const fetchFollowingPosts = async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get IDs of users you're following using your follows table structure
      const { data: followingData, error: followingError } = await supabase
        .from("follows")
        .select("followed_id")
        .eq("follower_id", user.id)
        .eq("receive_blahs", true); // Only get follows where receive_blahs is true

      if (followingError) throw followingError;

      // Get the array of followed IDs
      const followedIds = followingData.map((f) => f.followed_id);

      // If not following anyone, return empty array
      if (followedIds.length === 0) {
        setPosts([]);
        return;
      }

      // Fetch posts from followed users
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(
          `
          *,
          profile:profiles (
            id,
            username,
            avatar_url,
            full_name
          )
        `,
        )
        .in("profile_id", followedIds)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      setPosts(postsData || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchFollowingPosts();
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    fetchFollowingPosts();
  }, []);

  const transformedPosts: FeedItem[] = posts.map((post) => ({
    id: post.id,
    type: post.media_type,
    uri: post.main_media_url,
    images:
      post.media_type === "image"
        ? [post.main_media_url, ...post.additional_media]
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
    comments: [], // You might want to fetch comments separately
    hashtags: post.hashtags,
  }));

  const preloadImages = async (posts: FeedItem[], currentIndex: number) => {
    const nextPosts = posts.slice(currentIndex, currentIndex + 3);
    const imagePromises = nextPosts.flatMap(
      (post) => post.images?.map((imageUrl) => Image.prefetch(imageUrl)) ?? [],
    );
    await Promise.all(imagePromises);
  };

  // Call it when currentIndex changes
  useEffect(() => {
    preloadImages(transformedPosts, currentIndex);
  }, [currentIndex, transformedPosts]);

  const handleViewableItemsChanged = ({
    viewableItems,
  }: {
    viewableItems: { index: number | null }[];
  }) => {
    const firstViewableItem = viewableItems.find((item) => item.index !== null);
    if (firstViewableItem && firstViewableItem.index !== null) {
      setCurrentIndex(firstViewableItem.index);
    }
  };
  const viewabilityConfigCallbackPairs = useRef([
    {
      viewabilityConfig: {
        viewAreaCoveragePercentThreshold: 50,
      },
      onViewableItemsChanged: handleViewableItemsChanged,
    },
  ]).current;

  const renderItem = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => (
      <Post item={item} index={index} isVisible={currentIndex === index} />
    ),
    [currentIndex],
  );

  return (
    <>
      <StatusBar
        translucent
        backgroundColor="#FF325E"
        barStyle="light-content"
      />
      <FlatList
        data={transformedPosts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        pagingEnabled
        style={styles.flatList}
        ref={listRef}
        snapToAlignment="start"
        decelerationRate="fast"
        initialScrollIndex={0}
        removeClippedSubviews
        horizontal={false}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={undefined}
        viewabilityConfig={undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#fff"
          />
        }
      />
    </>
  );
};

export default PostFeed;

const styles = StyleSheet.create({
  flatList: {
    flex: 1,
    height:
      Platform.OS === "android"
        ? Dimensions.get("window").height + (StatusBar.currentHeight || 0)
        : Dimensions.get("window").height,
  },
});
