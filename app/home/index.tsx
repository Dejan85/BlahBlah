import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  StatusBar,
  Platform,
} from 'react-native';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Notification } from '@/assets/images';
import CustomButton from '@/components/CustomButton';
import CustomText from '@/components/CustomText';
import PostFeed from '@/components/PostsFeed';
import { IconButton } from '@/components/IconButton';
import { useFriendRequests } from '@/context/FriendRequestContext';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 500;
const NAVIGATION_ZONE_WIDTH = width * 0.15; // 15% of screen width for navigation zones

const SHOW_SWIPE_ZONES = true;

const Home = () => {
  const router = useRouter();
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const translateX = useSharedValue(0);
  const { friendRequests } = useFriendRequests(); // <--- get requests
  const friendRequestCount = friendRequests.length; // <--- length

  const handleRefresh = async () => {
    console.log('Refreshing posts');
  };

  // Left zone gesture
  const leftZoneGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(setActiveZone)('left');
    })
    .onUpdate((event) => {
      // Only allow right swipes in left zone
      if (event.translationX > 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      'worklet';
      if (
        event.velocityX > VELOCITY_THRESHOLD ||
        event.translationX > SWIPE_THRESHOLD
      ) {
        runOnJS(router.push)({
          pathname: '/chats',
          params: { from: 'home' },
        });
      }
      translateX.value = withSpring(0);
      runOnJS(setActiveZone)(null);
    });

  // Right zone gesture
  const rightZoneGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(setActiveZone)('right');
    })
    .onUpdate((event) => {
      // Only allow left swipes in right zone
      if (event.translationX < 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      'worklet';
      if (
        event.velocityX < -VELOCITY_THRESHOLD ||
        event.translationX < -SWIPE_THRESHOLD
      ) {
        runOnJS(router.push)({
          pathname: '/camera', // Or the exact route name to your Camera
          params: {
            from: 'home',
            // ...any other data you might want, like conversationId, etc.
          },
        });
      }
      translateX.value = withSpring(0);
      runOnJS(setActiveZone)(null);
    });

  return (
    <>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" />

        {/* Main Content */}
        <View style={styles.content}>
          {/* Left Navigation Zone */}
          <GestureDetector gesture={leftZoneGesture}>
            <View
              style={[
                styles.navigationZone,
                styles.leftZone,
                SHOW_SWIPE_ZONES && styles.visibleZone,
                activeZone === 'left' && styles.activeZone,
              ]}
            ></View>
          </GestureDetector>

          {/* Right Navigation Zone */}
          <GestureDetector gesture={rightZoneGesture}>
            <View
              style={[
                styles.navigationZone,
                styles.rightZone,
                SHOW_SWIPE_ZONES && styles.visibleZone,
                activeZone === 'right' && styles.activeZone,
              ]}
            ></View>
          </GestureDetector>

          {/* Header */}

          <View style={styles.headerContainer}>
            <View style={styles.postIndicator}></View>
            <IconButton
              icon={<Notification />}
              onPress={() => router.push('/notifications')}
              size={22}
            />
            {friendRequestCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{friendRequestCount}</Text>
              </View>
            )}
          </View>

          {/* Posts Feed (center area) */}
          <View style={styles.feedContainer}>
            <PostFeed onRefresh={handleRefresh} />
          </View>

          <CustomButton
            variant="primary"
            size="sm"
            style={styles.blahButton}
            onPress={() => router.push('/blahs')}
          >
            <CustomText variant="body" weight="semibold" color="#fff">
              Blahs
            </CustomText>
          </CustomButton>
        </View>
      </GestureHandlerRootView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBarFill: {},
  content: {
    flex: 1,
  },
  feedContainer: {
    flex: 1,
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
  visibleZone: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeZone: {
    backgroundColor: 'transparent',
  },

  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    top: 70,
    left: 15,
    right: 20,
    zIndex: 11,
  },
  notificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameText: {
    fontFamily: 'InterBold',
    fontSize: 16,
    color: '#fff',
    paddingLeft: 5,
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
  postIndicator: {
    alignSelf: 'center',
  },
  postIndicatorText: {
    color: '#fff',
    fontFamily: 'InterBold',
    fontSize: 16,
  },
  badgeContainer: {
    position: 'absolute',
    top: -10,
    right: -12,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9.5,
    fontFamily: 'InterBold',
  },
});

export default Home;
