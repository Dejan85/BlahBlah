import React from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import Text from "./CustomText";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");
const ITEMS_PER_ROW = 3;
const SPACING = 1;
const TALL_HEIGHT = 143;
const SHORT_HEIGHT = 123;
const BORDER_RADIUS = 12;
const TOTAL_SPACING = SPACING * (ITEMS_PER_ROW - 1);
const ITEM_WIDTH = (width - TOTAL_SPACING - SPACING * 2) / ITEMS_PER_ROW;

export interface GridPost {
  id: string;
  image: string | null;
  timestamp: number;
  type?: "image" | "video";
  uri?: string;
  user?: {
    id: string;
    username: string;
    profilePhoto: string;
  };
  images?: string[];
  music?: string;
  comments?: string[];
  hashtags?: string[];
}

interface ProfilePostsProps {
  posts: GridPost[];
}

export const ProfilePosts: React.FC<ProfilePostsProps> = ({ posts }) => {
  const router = useRouter();

  if (!posts || posts.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <Text style={styles.emptyText}>No posts yet</Text>
      </View>
    );
  }

  // Sort posts by timestamp (newest first)
  const sortedPosts = [...posts].sort((a, b) => b.timestamp - a.timestamp);

  // Group posts into rows of 3
  const rows = sortedPosts.reduce((acc, item, index) => {
    const rowIndex = Math.floor(index / ITEMS_PER_ROW);
    if (!acc[rowIndex]) {
      acc[rowIndex] = [];
    }
    acc[rowIndex].push(item);
    return acc;
  }, [] as GridPost[][]);

  const getPostHeight = (index: number) => {
    if (sortedPosts.length <= 3) return TALL_HEIGHT;
    if (index >= 3) return index % 2 === 0 ? TALL_HEIGHT : SHORT_HEIGHT;
    if (index === 1 && sortedPosts.length >= 5) return SHORT_HEIGHT;
    return TALL_HEIGHT;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const handlePostPress = (post: GridPost, index: number) => {
    // Transform all posts to FeedItem format for consistent viewing
    // Transform all posts to FeedItem format for consistent viewing
    const feedPosts = sortedPosts.map((post) => {
      // Ensure we have a valid main image URL
      const mainImageUrl = post.image || post.uri || "";
      // Create a proper images array
      const allImages = post.images || [];
      if (mainImageUrl && !allImages.includes(mainImageUrl)) {
        allImages.unshift(mainImageUrl);
      }

      return {
        id: post.id,
        type: post.type || "image",
        uri: mainImageUrl,
        user: post.user || {
          id: "default",
          username: "Anonymous",
          profilePhoto: "https://via.placeholder.com/150",
        },
        createdAt: new Date(post.timestamp).toISOString(),
        music: post.music || "Original Audio",
        comments: post.comments || [],
        hashtags: post.hashtags || [],
        images: allImages,
      };
    });

    // Navigate to the PostView with all posts data
    router.push({
      pathname: "/profile/profile-post",
      params: {
        posts: JSON.stringify(feedPosts),
        initialIndex: index,
      },
    });
  };

  // Rest of your component remains the same...
  const renderPost = (post: GridPost, index: number) => (
    <Pressable
      key={post.id}
      style={[styles.gridItem, { height: getPostHeight(index) }]}
      onPress={() => handlePostPress(post, index)}
    >
      {post.image ? (
        <Image
          source={{ uri: post.image }}
          style={styles.image}
          contentFit="cover"
        />
      ) : (
        <View style={styles.placeholderBackground} />
      )}
      <View style={styles.timestampContainer}>
        <Text style={styles.timestamp}>{formatTimestamp(post.timestamp)}</Text>
      </View>
    </Pressable>
  );

  console.log(JSON.stringify(posts));

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((post, colIndex) =>
              renderPost(post, rowIndex * ITEMS_PER_ROW + colIndex),
            )}
            {row.length < ITEMS_PER_ROW &&
              Array(ITEMS_PER_ROW - row.length)
                .fill(null)
                .map((_, index) => (
                  <View
                    key={`empty-${index}`}
                    style={[styles.gridItem, { height: TALL_HEIGHT }]}
                  />
                ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingHorizontal: SPACING,
  },
  row: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: SPACING,
  },
  gridItem: {
    width: ITEM_WIDTH,
    marginHorizontal: SPACING / 2,
    borderRadius: BORDER_RADIUS,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: BORDER_RADIUS,
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
  },
  emptyText: {
    fontFamily: "InterMedium",
    fontSize: 16,
    color: "#B3B3B3",
  },
  placeholderBackground: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F0F0F0",
    borderRadius: BORDER_RADIUS,
  },
  timestampContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  timestamp: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "InterMedium",
  },
});

export default ProfilePosts;
