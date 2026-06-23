import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Pressable,
  Dimensions,
  FlatList,
  ToastAndroid,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FeedItem } from '@/types';
import Post from '@/components/Post';
import Text from '@/components/CustomText';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import BottomModal from '@/components/BottomModal';
import {
  DeleteAction,
  NoComments,
  NoLikes,
  NoShares,
  RedBunny,
} from '@/assets/images';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SettingItem from '@/components/SettingItem';
import CustomButton from '@/components/CustomButton';
import { usePost } from '@/context/PostContext';
import { Image } from 'expo-image';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 500;
const NAVIGATION_ZONE_WIDTH = width * 0.15;

const PostView = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { deletePost } = usePost();
  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hideLikes, setHideLikes] = useState(false);
  const [hideComments, setHideComments] = useState(false);
  const [hideShares, setHideShares] = useState(false);
  const [lockPost, setLockPost] = useState(false);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const translateX = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);

  // Add this after parsing posts
  const posts: FeedItem[] = JSON.parse(params.posts as string);
  const initialIndex = parseInt(params.initialIndex as string) || 0;

  // Prefetch images for better performance
  useEffect(() => {
    const imagesToPrefetch = posts.flatMap((post) =>
      post.images ? post.images : post.uri ? [post.uri] : []
    );

    Image.prefetch(imagesToPrefetch);
  }, [posts]);

  // Log received posts data
  console.log('Received posts in PostView:', JSON.stringify(posts, null, 2));

  const closeScreen = () => {
    router.back();
  };

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      console.log(message);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Add your refresh logic here
      // For example, refetch posts or update current post
      showToast('Feed refreshed');
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Left zone gesture
  const leftZoneGesture = Gesture.Pan()
    .onStart((event) => {
      // Only activate if touch starts in the left zone
      if (event.x <= NAVIGATION_ZONE_WIDTH) {
        runOnJS(setActiveZone)('left');
      }
    })
    .onUpdate((event) => {
      // Only allow movement if touch started in the left zone
      if (event.x <= NAVIGATION_ZONE_WIDTH) {
        // Only allow right swipes in left zone
        if (event.translationX > 0) {
          translateX.value = event.translationX;
        }
      }
    })
    .onEnd((event) => {
      if (event.x <= NAVIGATION_ZONE_WIDTH) {
        if (
          event.velocityX > VELOCITY_THRESHOLD ||
          event.translationX > SWIPE_THRESHOLD
        ) {
          runOnJS(closeScreen)();
        }
      }
      translateX.value = withSpring(0);
      runOnJS(setActiveZone)(null);
    });

  // Right zone gesture
  const rightZoneGesture = Gesture.Pan()
    .onStart((event) => {
      // Only activate if touch starts in the right zone
      if (event.x >= width - NAVIGATION_ZONE_WIDTH) {
        runOnJS(setActiveZone)('right');
      }
    })
    .onUpdate((event) => {
      // Only allow movement if touch started in the right zone
      if (event.x >= width - NAVIGATION_ZONE_WIDTH) {
        // Only allow left swipes in right zone
        if (event.translationX < 0) {
          translateX.value = event.translationX;
        }
      }
    })
    .onEnd((event) => {
      if (event.x >= width - NAVIGATION_ZONE_WIDTH) {
        if (
          event.velocityX < -VELOCITY_THRESHOLD ||
          event.translationX < -SWIPE_THRESHOLD
        ) {
          runOnJS(closeScreen)();
        }
      }
      translateX.value = withSpring(0);
      runOnJS(setActiveZone)(null);
    });

  const handleDelete = async () => {
    setActionsModalVisible(false);

    Alert.alert(
      'Delete Post',
      'Are you sure?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const currentPost = posts[currentIndex];
              const result = await deletePost(currentPost.id);

              if (result.success) {
                showToast('Post deleted successfully');
                if (posts.length === 1) {
                  closeScreen();
                  return;
                }

                const newPosts = posts.filter(
                  (post) => post.id !== currentPost.id
                );
                router.setParams({
                  posts: JSON.stringify(newPosts),
                  initialIndex: Math.min(currentIndex, newPosts.length - 1),
                });
              } else {
                throw new Error(result.error);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

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
    [currentIndex]
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <Animated.View style={[styles.content, animatedStyle]}>
        {/* Left Navigation Zone */}
        <GestureDetector gesture={leftZoneGesture}>
          <View
            style={[
              styles.navigationZone,
              styles.leftZone,
              activeZone === 'left' && styles.activeZone,
            ]}
          />
        </GestureDetector>

        {/* Right Navigation Zone */}
        <GestureDetector gesture={rightZoneGesture}>
          <View
            style={[
              styles.navigationZone,
              styles.rightZone,
              activeZone === 'right' && styles.activeZone,
            ]}
          />
        </GestureDetector>

        <FlatList
          ref={flatListRef}
          data={posts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          pagingEnabled
          initialScrollIndex={initialIndex}
          getItemLayout={(data, index) => ({
            length: height,
            offset: height * index,
            index,
          })}
          viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
          windowSize={3}
          maxToRenderPerBatch={3}
          updateCellsBatchingPeriod={100}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#fff"
            />
          }
        />

        <Pressable
          style={styles.actionButton}
          onPress={() => setActionsModalVisible(true)}
        >
          <MaterialCommunityIcons
            name="dots-vertical"
            color={'#fff'}
            size={24}
          />
        </Pressable>
      </Animated.View>

      <BottomModal
        visible={actionsModalVisible}
        onClose={() => setActionsModalVisible(false)}
        height={height * 0.5}
        line={false}
        modalStyle={styles.modalContainer}
      >
        <View style={styles.actionsContainer}>
          <SettingItem
            value={hideLikes}
            title="Hide Likes"
            onValueChange={setHideLikes}
            icon={<NoLikes />}
          />
          <SettingItem
            value={hideShares}
            title="Hide Shares"
            onValueChange={setHideShares}
            icon={<NoShares />}
          />
          <SettingItem
            value={hideComments}
            title="Hide Comments"
            onValueChange={setHideComments}
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
          <DeleteAction fill={'#FF325E'} />
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </BottomModal>

      <CustomButton
        variant="primary"
        size="sm"
        style={styles.blahButton}
        onPress={() => router.push('/blahs')}
      >
        <Text variant="body" color="#fff">
          Blahs
        </Text>
      </CustomButton>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  navigationZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: NAVIGATION_ZONE_WIDTH,
    zIndex: 10,
  },
  leftZone: {
    left: 0,
  },
  rightZone: {
    right: 0,
  },
  activeZone: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteAction: {
    flexDirection: 'row',
    marginLeft: 50,
    marginTop: 50,
  },
  deleteText: {
    fontFamily: 'InterMedium',
    fontSize: 15,
    top: -3,
    paddingLeft: 18,
    color: '#FF325E',
  },
  content: {
    flex: 1,
  },
  postContainer: {
    width: width,
    height: height,
    backgroundColor: '#000',
  },
  modalContainer: {
    borderWidth: 0,
  },
  blahButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 150 : 140,
    right: 24,
    backgroundColor: '#FF325E',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 40,
    width: 82,
    height: 48,
    zIndex: 11,
  },
  actionButton: {
    borderRadius: 20,
    position: 'absolute',
    right: 30,
    top: 70,
  },
  actionsContainer: {
    marginTop: 45,
  },
});

export default PostView;
