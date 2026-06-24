import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  Animated,
  Text,
  Alert,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { runOnJS } from 'react-native-reanimated';

import SearchComponent from '@/components/SearchComponent';
import UserListComponent from '@/components/UserListComponent';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';
import { IconButton } from '@/components/IconButton';
import { GroupChat, Logo, Profile } from '@/assets/images';
import { User } from '@/types';
import { useFriendRequests } from '@/context/FriendRequestContext';
import {
  EnhancedConversation,
  DBConversation,
  Conversation,
} from '@/types/conversations';

const SEARCH_HEIGHT = 60;
const SWIPE_THRESHOLD = 50;

const Chats: React.FC = () => {
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const searchOpacity = useRef(new Animated.Value(1)).current;

  const router = useRouter();
  const { friendRequests } = useFriendRequests(); // <--- get requests
  const friendRequestCount = friendRequests.length; // <--- length
  const lastScrollPosition = useRef(0);
  const scrollDirection = useRef('');
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<EnhancedConversation[]>(
    []
  );

  const fetchConversations = async () => {
    if (!currentUserId) return;

    const { data, error } = (await supabase
      .from('conversations')
      .select(
        `
        id,
        participant1_id,
        participant2_id,
        participant1:participant1_id (id, username, avatar_url, bio),
        participant2:participant2_id (id, username, avatar_url, bio),
        messages!messages_conversation_id_fkey (id, text, sender_id, created_at)
      `
      )
      .or(
        `participant1_id.eq.${currentUserId},participant2_id.eq.${currentUserId}`
      )) as {
      data: DBConversation[] | null;
      error: any;
    };

    if (error) {
      console.error('Error fetching conversations:', error);
      return;
    }

    if (!data) return;

    const transformed =
      data?.map((conv) => {
        const isP1 = conv.participant1_id === currentUserId;

        // Get messages not sent by the current user
        const receivedMessages = (conv.messages || []).filter(
          (msg) => msg.sender_id !== currentUserId
        );

        // Sort messages by creation time
        const sortedMessages = receivedMessages.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        const lastMsg = sortedMessages[0];

        return {
          id: conv.id,
          username: isP1
            ? (conv.participant2?.username ?? 'Unknown')
            : (conv.participant1?.username ?? 'Unknown'),
          image: isP1
            ? (conv.participant2?.avatar_url ?? '')
            : (conv.participant1?.avatar_url ?? ''),
          bio: isP1
            ? (conv.participant2?.bio ?? '')
            : (conv.participant1?.bio ?? ''),
          lastMessage: lastMsg?.text ?? '',
          lastMessageTime: lastMsg?.created_at ?? '',
          isPinned: conv.is_pinned ?? false, // Add this line
          isMuted: conv.is_muted ?? false, // Add this line
        };
      }) || [];
    const sortedConversations = transformed.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      const aTime = a.lastMessageTime
        ? new Date(a.lastMessageTime).getTime()
        : 0;
      const bTime = b.lastMessageTime
        ? new Date(b.lastMessageTime).getTime()
        : 0;
      return bTime - aTime;
    });

    setConversations(sortedConversations);
  };

  // Real-time subscription to messages
  const subscribeToMessages = () => {
    return supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new;
          const conversationId = newMessage.conversation_id;

          // Update conversations with the new message
          setConversations((prev) =>
            prev.map((conv) => {
              if (
                conv.id === conversationId &&
                newMessage.sender_id !== currentUserId
              ) {
                return {
                  ...conv,
                  lastMessage: newMessage.text,
                  lastMessageTime: newMessage.created_at,
                };
              }
              return conv;
            })
          );
        }
      )
      .subscribe();
  };

  useEffect(() => {
    fetchConversations();

    const subscription = subscribeToMessages();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUserId]);

  const handleBack = () => {
    router.back();
  };

  const handlePin = async (user: User) => {
    try {
      const conversation = conversations.find((conv) => conv.id === user.id);
      const newPinnedState = !conversation?.isPinned;

      // Update in Supabase
      await supabase
        .from('conversations')
        .update({ is_pinned: newPinnedState })
        .eq('id', user.id);

      // Update local state and sort
      setConversations((prev) => {
        const updatedConversations = prev.map((conv) =>
          conv.id === user.id ? { ...conv, isPinned: newPinnedState } : conv
        );

        // Sort conversations: pinned first, then by last message time
        return updatedConversations.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;

          // If both are pinned or both are unpinned, sort by last message time
          const aTime = a.lastMessageTime
            ? new Date(a.lastMessageTime).getTime()
            : 0;
          const bTime = b.lastMessageTime
            ? new Date(b.lastMessageTime).getTime()
            : 0;
          return bTime - aTime;
        });
      });
    } catch (error) {
      console.error('Error updating pin status:', error);
    }
  };

  const handleMute = async (user: User) => {
    const conversation = conversations.find((conv) => conv.id === user.id);
    const newMutedState = !conversation?.isMuted;

    await supabase
      .from('conversations')
      .update({ is_muted: newMutedState })
      .eq('id', user.id);

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === user.id ? { ...conv, isMuted: newMutedState } : conv
      )
    );
  };

  const handleDelete = async (item: User) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete your conversation with ${item.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('conversations')
                .delete()
                .eq('id', item.id);

              if (error) throw error;

              Alert.alert(
                'Deleted',
                `${item.username}'s conversation is deleted.`
              );
            } catch (err) {
              console.error('Error deleting conversation:', err);
              Alert.alert('Error', 'Failed to delete the conversation.');
            }
          },
        },
      ]
    );
  };

  const handleScroll = (event: any) => {
    const currentScrollPosition = event.nativeEvent.contentOffset.y;

    if (
      currentScrollPosition > lastScrollPosition.current &&
      currentScrollPosition > 0
    ) {
      if (scrollDirection.current !== 'down') {
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
      }
    } else {
      if (scrollDirection.current !== 'up') {
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
    }

    lastScrollPosition.current = currentScrollPosition;
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

  const navigateToProfile = () => {
    if (!currentUserId) {
      // Optionally handle the case where there's no current user.
      return;
    }
    // Header avatar = logged-in user → own profile screen (loads from auth).
    router.push('/profile');
  };

  const handleUserPress = (user: User) => {
    const conversation: Conversation = {
      id: user.id,
      username: user.username,
      bio: user.bio ?? '', // Provide default empty string for optional bio
      image: user.image,
    };

    router.push({
      pathname: '/chats/chat-room/[id]',
      params: {
        id: conversation.id,
        username: conversation.username,
        bio: conversation.bio,
        image: conversation.image,
      },
    });
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <GestureDetector gesture={gesture}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={'#fff'} />
        <View style={styles.header}>
          <IconButton
            icon={<Profile />}
            onPress={navigateToProfile}
            size={34}
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerText}>Ch</Text>
            <Logo style={styles.letterImage} />
            <Text style={styles.headerText}>ts</Text>
          </View>
          <View style={{ position: 'relative' }}>
            <IconButton
              icon={<GroupChat />}
              onPress={() => router.push('/friend-requests')}
              size={34}
            />
            {friendRequestCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{friendRequestCount}</Text>
              </View>
            )}
          </View>
        </View>

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
          data={filteredConversations.map((conv) => ({
            id: conv.id,
            username: conv.username,
            image: conv.image,
            bio: conv.bio,
            message: conv.lastMessage, // Only display the last message
            timeAgo: conv.lastMessageTime
              ? new Date(conv.lastMessageTime).getTime()
              : undefined,
            isMessageSeen: conv.isMessageSeen,
            unreadCount: conv.unreadCount,
            lastMessage: conv.lastMessage,
            isPinned: conv.isPinned,
            isMuted: conv.isMuted,
          }))}
          onItemPress={handleUserPress}
          onScroll={handleScroll}
          contentInset={SEARCH_HEIGHT}
          // Here we might have isChatMessage={true} if needed
          isChatMessage={true}
          currentUserId={currentUserId}
          onPinAction={handlePin}
          onMuteAction={handleMute}
          onDeleteAction={handleDelete}
          enableSwipe={true}
        />
      </SafeAreaView>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#fff',
  },
  searchWrapper: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 90 : 130,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -12,
    right: -15,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 18,
    minHeight: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontFamily: 'InterBold',
  },
  letterImage: {
    width: 42, // Match font size
    height: 42, // Match font size
    marginTop: 5, // Adjust to align with text
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  seenLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'InterRegular',
  },
  seenLabelActive: {
    color: '#40E0D0',
  },
  senderTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 10,
  },
  headerText: {
    fontSize: 38,
    fontFamily: 'InterBold',
    color: '#202020',
  },
});

export default Chats;
