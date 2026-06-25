import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image as ExpoImage } from 'expo-image';
import { User } from '@/types';
import SwipeableChatItem from './SwipeableChatItem';
import ChatListItem from './Chat/ChatListItem';

interface UserListProps {
  data: User[];
  onScroll?: (event: any) => void;
  onItemPress: (user: User) => void;
  contentInset?: number;
  isFriendRequest?: boolean;
  onAcceptAction?: (user: User) => void;
  onDeclineAction?: (user: User) => void;
  enableSwipe?: boolean;
  isSearchAction?: boolean;
  onAddAction?: (user: User) => void;
  onMessageAction?: (user: User) => void;
  onSentAction?: (user: User) => void;
  onPinAction?: (user: User) => void;
  onMuteAction?: (user: User) => void;
  onDeleteAction?: (user: User) => void;
  currentUserId?: string;
  isMessageAction?: boolean;
  isSentAction?: boolean;
  isAddAction?: boolean;
  isChatMessage?: boolean;
  isBio?: boolean;
}

const UserListComponent: React.FC<UserListProps> = ({
  data,
  onScroll,
  onItemPress,
  contentInset,
  isFriendRequest,
  onAcceptAction,
  onDeclineAction,
  isSearchAction,
  onAddAction,
  onMessageAction,
  enableSwipe,
  isChatMessage,
  currentUserId,
}) => {
  const renderActionButtons = (item: User) => {
    if (isFriendRequest) {
      return (
        <View style={styles.acceptButtons}>
          {onAcceptAction && (
            <Text style={styles.accept} onPress={() => onAcceptAction(item)}>
              Accept
            </Text>
          )}
          {onDeclineAction && (
            <Text style={styles.decline} onPress={() => onDeclineAction(item)}>
              Decline
            </Text>
          )}
        </View>
      );
    }

    if (isSearchAction) {
      return (
        <View style={styles.acceptButtons}>
          {item.requestStatus === 'none' && onAddAction && (
            <TouchableOpacity
              onPress={() => onAddAction(item)}
              style={styles.actionButton}
            >
              <Text style={styles.accept}>Add</Text>
            </TouchableOpacity>
          )}

          {item.requestStatus === 'pending' && (
            <Text style={styles.pending}>Sent</Text>
          )}

          {item.requestStatus === 'received' && (
            <View style={styles.acceptButtons}>
              <Text
                style={styles.accept}
                onPress={() => onAcceptAction?.(item)}
              >
                Accept
              </Text>
              <Text
                style={styles.decline}
                onPress={() => onDeclineAction?.(item)}
              >
                Decline
              </Text>
            </View>
          )}

          {item.requestStatus === 'friend' && onMessageAction && (
            <TouchableOpacity
              onPress={() => onMessageAction(item)}
              style={styles.actionButton}
            >
              <Text style={styles.accept}>Message</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return null;
  };

  const renderSubtitle = (item: User) => {
    // Close-By (T3.19 / Search 6.0): fizički u blizini (≤20–30m) → crvena „Close By".
    if (item.isCloseBy) {
      return <Text style={styles.closeBy}>Close By</Text>;
    }

    // Otherwise show bio if it exists
    if (item.bio) {
      return <Text style={styles.subtitle}>{item.bio}</Text>;
    }

    return null;
  };

  const renderItem = ({ item }: { item: User }) => {
    return (
      <SwipeableChatItem
        onPin={() => null}
        onMute={() => null}
        onDelete={() => null}
        isPinned={false}
        isMuted={false}
        enableSwipe={enableSwipe}
      >
        <View style={styles.userContainer}>
          {isSearchAction && (
            <View style={styles.leftSection}>
              <TouchableOpacity onPress={() => onItemPress(item)}>
                <ExpoImage
                  source={{ uri: item.image }}
                  style={styles.userImage}
                  contentFit="cover"
                  transition={200}
                />
              </TouchableOpacity>

              <View style={styles.userInfo}>
                <Text style={styles.username} onPress={() => onItemPress(item)}>
                  {item.username}
                </Text>
                {renderSubtitle(item)}
              </View>
            </View>
          )}
          {renderActionButtons(item)}

          {isChatMessage && (
            <ChatListItem
              item={item}
              currentUserId={currentUserId}
              onPress={onItemPress}
              enableSwipe={enableSwipe}
            />
          )}
        </View>
      </SwipeableChatItem>
    );
  };

  return (
    <FlashList
      showsVerticalScrollIndicator={false}
      data={data}
      onScroll={onScroll}
      scrollEventThrottle={16}
      renderItem={renderItem}
      estimatedItemSize={70}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        paddingTop: contentInset,
      }}
    />
  );
};

const styles = StyleSheet.create({
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 25,
    position: 'relative',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    top: -5,
  },
  username: {
    fontSize: 14,
    fontFamily: 'InterSemiBold',
    color: '#000000',
    paddingBottom: 5,
  },
  subtitle: {
    fontSize: 13,
    color: '#000',
    fontFamily: 'InterMedium',
  },
  closeBy: {
    fontSize: 13,
    color: '#FF325E',
    fontFamily: 'InterSemiBold',
    marginTop: 2,
  },
  acceptButtons: {
    flexDirection: 'row',
    marginRight: 5,
    alignItems: 'center',
  },
  accept: {
    fontFamily: 'InterBold',
    fontSize: 14,
    color: '#FF325E',
    paddingRight: 10,
  },
  decline: {
    fontFamily: 'InterBold',
    fontSize: 14,
    color: '#000',
  },
  pending: {
    fontFamily: 'InterBold',
    fontSize: 14,
    color: '#B3B3B3',
    paddingRight: 10,
  },
  actionButton: {
    marginLeft: 5,
  },
});

export default UserListComponent;
